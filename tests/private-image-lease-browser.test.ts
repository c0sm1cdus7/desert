import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";

test("the actual image owner clears revoked pixels and retains only same-lease rendition pixels", async () => {
  const png = await sharp({ create: { width: 8, height: 8, channels: 3, background: "#ab2200" } }).png().toBuffer();
  const source = `<script>
    import Image from './src/svelte/catalog/foundations/image/Image.svelte';
    import { providePrivateImages } from './src/svelte/infra/private-image-context.ts';
    import { privateImageAccess } from './src/web/client/private-images.ts';
    let allowed=true, epoch=0, delayed=false, zoom=$state(1);
    const pending=[], revoked=[], signals=[];
    const revoke=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=url=>{revoked.push(url);revoke(url);};
    const asset={kind:'asset',reference:'e7000000-0000-4000-8000-000000000001'};
    const blob=new Blob([Uint8Array.from(atob('${png.toString("base64")}'),char=>char.charCodeAt(0))],{type:'image/png'});
    const images=privateImageAccess(()=>{
      if(!allowed)return;
      const current=epoch;
      return {valid:()=>allowed&&epoch===current,read:async(_variant,signal)=>{
        signals.push(signal);
        if(delayed)await new Promise(resolve=>pending.push(resolve));
        return blob;
      }};
    });
    providePrivateImages(images);
    window.imageFixture={revoked,signals,pending};
    function release(){delayed=false;for(const resolve of pending.splice(0))resolve();}
  </script>
  <button onclick={()=>{allowed=false;images.refresh();}}>Unavailable</button>
  <button onclick={()=>{allowed=true;epoch++;images.refresh();}}>Ready</button>
  <button onclick={()=>{delayed=true;zoom=4;}}>Larger rendition</button>
  <button onclick={()=>{epoch++;images.refresh();}}>Change scope</button>
  <button onclick={release}>Release</button>
  <button onclick={()=>images.close()}>Lock</button>
  <div style="width:240px;height:160px"><Image source={asset} alt="Private photo" {zoom}/></div>`;
  const f = await svelteBrowser(source);
  try {
    const { page } = f, image = page.locator("[data-media-image]");
    await page.locator('[data-image-state="ready"] img').waitFor();
    const initial = await image.locator("img").getAttribute("src");
    await page.getByRole("button", { name: "Unavailable", exact: true }).click();
    await image.locator("img").waitFor({ state: "detached" });
    assert.ok((await page.evaluate(() => (window as any).imageFixture.revoked)).includes(initial));
    assert.equal(await page.getByText("Loading image", { exact: true }).count(), 0);
    await page.getByRole("button", { name: "Ready", exact: true }).click();
    await page.locator('[data-image-state="ready"] img').waitFor();
    const restored = await image.locator("img").getAttribute("src");
    assert.notEqual(restored, initial);
    await page.getByRole("button", { name: "Larger rendition", exact: true }).click();
    await page.waitForFunction(() => (window as any).imageFixture.pending.length > 0);
    assert.equal(await image.locator("img").getAttribute("src"), restored);
    assert.equal(await image.locator("img").evaluate(element => getComputedStyle(element).visibility), "visible");
    await page.getByRole("button", { name: "Change scope", exact: true }).click();
    await image.locator("img").waitFor({ state: "detached" });
    assert.ok((await page.evaluate(() => (window as any).imageFixture.revoked)).includes(restored));
    assert.equal(await page.evaluate(() => (window as any).imageFixture.signals.at(-2).aborted), true);
    await page.getByRole("button", { name: "Release", exact: true }).click();
    await page.locator('[data-image-state="ready"] img').waitFor();
    const current = await image.locator("img").getAttribute("src");
    await page.getByRole("button", { name: "Lock", exact: true }).click();
    await image.locator("img").waitFor({ state: "detached" });
    assert.ok((await page.evaluate(() => (window as any).imageFixture.revoked)).includes(current));
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
