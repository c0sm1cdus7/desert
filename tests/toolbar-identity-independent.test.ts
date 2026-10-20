import test from "node:test";
import assert from "node:assert/strict";
import { svelteBrowser } from "./fixtures/svelte-browser.ts";
import { rendererCss } from "./fixtures/renderer-css.ts";
import { identityEvidence, identityGeometry, assertIdentityGeometry, assertVisibleChrome, assertTextReachable } from "./fixtures/toolbar-identity-expectations.ts";

const longTitle = "Independent warning about a connection that stopped responding while your current writing remains safely available";
const source = `<script lang="ts">
  import SurfaceFrame from "@desert/svelte/SurfaceFrame.svelte";
  import Problem from "@desert/svelte/pieces/Problem.svelte";
  import { surfaceFrame, SurfaceFrameVersion } from "@desert/interaction/surface-frame.ts";
  import { transientFrame } from "@desert/interaction/transient-frame.ts";
  import { toolbarAction } from "@desert/interaction/toolbar.ts";
  let title = $state("Independent title"), open = $state(false), locked = $state(false), calls = $state(0);
  let face = $state(true), observed = $state(""), pending = $state(false);
  const top = () => ({title, ...(face ? {face:{kind:"status" as const,severity:"warning" as const}} : {}),
    leading:toolbarAction({kind:"close"},"Close","close"),
    trailing:[{...toolbarAction({kind:"journey",journey:"inspect"},"Inspect source","open"),state:pending?"pending":"ready"}]});
  let normal = $derived(surfaceFrame({version:SurfaceFrameVersion,kind:"specimen",top:top(),
    content:{kind:"message",text:"Independent content."},bottom:{}}));
  let transient = $derived(transientFrame(normal, false));
</script>
<label>Title<input aria-label="Title" bind:value={title} /></label>
<button onclick={() => {open = true; locked = false;}}>Open warning</button>
<button onclick={() => {open = true; locked = true;}}>Open locked warning</button>
<button onclick={() => face = !face}>Toggle face</button>
<button onclick={() => pending = !pending}>Toggle pending</button>
<output data-calls>{calls}</output><output data-observed>{observed}</output>
<div data-fixture-normal style="width:360px;display:flex;flex-direction:column;min-width:0">
  <SurfaceFrame frame={normal} invoke={intent => observed = JSON.stringify(intent)} />
</div>
<div data-fixture-transient style="width:360px;display:flex;flex-direction:column;min-width:0">
  <SurfaceFrame frame={transient} invoke={intent => observed = JSON.stringify(intent)} />
</div>
<Problem {open} {title} {locked} severity="warning"
  description={"Current writing remains available. ".repeat(30)} close={() => { calls++; open = false; }} />`;

async function fixture() {
  const f = await svelteBrowser(source);
  await f.page.addStyleTag({ content: await rendererCss() });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  assert.deepEqual(f.errors, [], "the independent fixture must mount before its expectations run");
  return f;
}

test("normal and transient frames share centered face geometry independently of their action slots", { timeout: 30000 }, async t => {
  const f = await fixture();
  try {
    for (const width of [960, 360, 240]) for (const scale of [1, 2]) {
      await f.page.locator('[data-fixture-normal], [data-fixture-transient]').evaluateAll((nodes, width) => {
        for (const node of nodes) (node as HTMLElement).style.width = `${width}px`;
      }, width);
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      await f.page.getByRole("textbox", { name: "Title", exact: true }).fill(longTitle);
      const measurements = [];
      for (const selector of ["[data-fixture-normal]", "[data-fixture-transient]"]) {
        const header = f.page.locator(`${selector} [data-surface-slot="top"]`);
        await header.getByRole("heading", { name: longTitle, exact: true }).waitFor();
        const geometry = await identityGeometry(header);
        assertIdentityGeometry(geometry); measurements.push(geometry);
      }
      t.diagnostic(JSON.stringify({ width, scale, centers: measurements.map(value => value.face.x + value.face.width / 2) }));
      assert.equal(measurements[0]!.face.x, measurements[1]!.face.x, "transience does not shift the shared identity axis");
    }
    const header = f.page.locator('[data-fixture-normal] [data-surface-slot="top"]');
    const withFace = await identityGeometry(header);
    await f.page.getByRole("button", { name: "Toggle pending", exact: true }).click();
    const duringPending = await identityGeometry(header);
    assertIdentityGeometry(duringPending);
    const before = withFace.buttons.find(button => button.label === "Inspect source")!;
    const during = duringPending.buttons.find(button => button.label === "Inspect source")!;
    assert.equal(during.disabled, true);
    assert.equal(during.width, before.width); assert.equal(during.height, before.height);
    await f.page.getByRole("button", { name: "Toggle face", exact: true }).click();
    assert.equal(await f.page.locator('[data-fixture-normal] [data-piece="face"]').count(), 0,
      "omitting a face renders no decorative identity");
    assert.ok((await header.boundingBox())!.height <= withFace.header.height - withFace.face.height,
      "omitting a face reserves no empty face row");
    await f.page.locator('[data-fixture-normal]').getByRole("button", { name: "Close", exact: true }).click();
    assert.deepEqual(JSON.parse(await f.page.locator('[data-observed]').innerText()), { kind: "close" },
      "chrome composition preserves the closed navigation intent");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});

test("long dialog title at narrow width and 200% text preserves body space and single dismissal", { timeout: 30000 }, async t => {
  const f = await fixture();
  const evidence = await identityEvidence("source-long-title");
  t.diagnostic(`Evidence: ${evidence.directory}`);
  try {
    await f.page.getByRole("textbox", { name: "Title", exact: true }).fill(longTitle);
    for (const theme of ["light", "dark"] as const) for (const scale of [1, 2]) {
      await f.page.emulateMedia({ colorScheme: theme });
      await f.page.setViewportSize({ width: 320, height: 568 });
      await f.page.evaluate(scale => document.documentElement.style.setProperty("--text-scale", String(scale)), scale);
      const opener = f.page.getByRole("button", { name: "Open warning", exact: true });
      await opener.click();
      assert.deepEqual(f.errors, [], "opening the message must not throw while composing its native dialog slots");
      const dialog = f.page.getByRole("dialog", { name: longTitle, exact: true });
      await dialog.waitFor();
      const header = dialog.locator('[data-surface-slot="top"]');
      const geometry = await identityGeometry(header);
      await evidence.save(`${theme}-scale-${scale}`, geometry, dialog);
      t.diagnostic(JSON.stringify({ theme, scale, titleSize: geometry.titleSize, headerHeight: geometry.header.height }));
      assert.ok(geometry.titleSize >= 17 * scale, "the 200% case really enlarges title text, not only its spacing");
      const close = dialog.locator('[data-surface-slot="bottom"]').getByRole("button", { name: "Close", exact: true });
      assert.equal(await dialog.getByRole("button", { name: "Close", exact: true }).count(), 1,
        "compact messages have one explicit dismissal, not duplicated navigation chrome");
      assert.equal(await header.getByRole("button").count(), 0);
      assert.equal(await close.evaluate(node => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return hit === node || node.contains(hit);
      }), true, "the single Close is initially reachable, without scrolling away from the new message");
      assertIdentityGeometry(geometry);
      await assertVisibleChrome(dialog);
      assert.ok(geometry.titleText.bottom <= geometry.title.bottom + 1, "message cause is not truncated");
      const heading = header.getByRole("heading", { name: longTitle, exact: true });
      await assertTextReachable(heading, false); await assertTextReachable(heading, true);
      const content = dialog.locator('[data-surface-slot="content"] [data-slot="dialog-description"]');
      await assertTextReachable(content, false); await assertTextReachable(content, true);
      await close.click();
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await opener.evaluate(node => node === document.activeElement), true, "Close restores its real opener");
      await opener.click(); await dialog.waitFor(); await f.page.keyboard.press("Escape");
      await dialog.waitFor({ state: "hidden" });
      assert.equal(await opener.evaluate(node => node === document.activeElement), true, "Escape restores the same opener");
    }
    assert.equal(await f.page.locator('[data-calls]').innerText(), "8", "each dismissal invokes once");
  } finally { await f.close(); }
});

test("locked dialog retains one named disabled Close control and focus containment", { timeout: 30000 }, async () => {
  const f = await fixture();
  try {
    await f.page.getByRole("button", { name: "Open locked warning", exact: true }).click();
    assert.deepEqual(f.errors, [], "opening a locked message must not throw");
    const dialog = f.page.getByRole("dialog"); await dialog.waitFor();
    const buttons = dialog.getByRole("button", { name: "Close", exact: true });
    assert.equal(await buttons.count(), 1);
    assert.equal(await buttons.isDisabled(), true);
    assert.equal(await dialog.locator('[data-surface-slot="top"]').getByRole("button").count(), 0);
    await f.page.keyboard.press("Escape");
    assert.equal(await dialog.isVisible(), true);
    await f.page.keyboard.press("Tab");
    assert.equal(await dialog.evaluate(node => node.contains(document.activeElement)), true);
    assert.equal(await f.page.locator('[data-calls]').innerText(), "0");
    assert.deepEqual(f.errors, []);
  } finally { await f.close(); }
});
