import test from 'node:test';
import assert from 'node:assert/strict';
import { svelteBrowser } from '../fixtures/svelte-browser.ts';

const source = `<script>
 import { onMount } from 'svelte';
 import { observePlaceHeading } from './src/svelte/pieces/place-heading-motion.ts';
 import { observePlaceFocus } from './src/svelte/pieces/place-focus.ts';
 let viewport, heading, identity, owner;
 onMount(() => { const dock = observePlaceHeading(viewport, heading, identity);
 const focus = observePlaceFocus(viewport, owner); return () => { dock(); focus(); }; });
</script>
<div bind:this={owner} data-scroll-owner style="position:relative;--scroll-edge-feather:32px;width:390px">
 <div data-toolbar="top" style="position:absolute;top:0;height:56px;z-index:1;pointer-events:none">
  <div bind:this={identity} data-toolbar-identity>Compact title</div>
 </div>
 <div bind:this={viewport} data-viewport style="height:500px;overflow:auto">
  <div bind:this={heading} style="padding-top:100px"><div data-dock-above style="height:80px">Large title</div></div>
  <div style="height:220px"></div>
  <button onclick={(event) => event.currentTarget.dataset.activated='yes'} style="height:32px">Content action</button>
  <input aria-label="Editor" style="display:block;height:40px" />
  <div style="height:1200px"></div>
 </div>
</div>`;
const paint = async (page: Awaited<ReturnType<typeof svelteBrowser>>['page']) =>
  page.evaluate(async () => { for (let i = 0; i < 12; i++) await new Promise(requestAnimationFrame); });

test('accepted reading boundary uses nine soft stops, reverses and tracks toolbar geometry', async () => {
 const f = await svelteBrowser(source);
 try {
  const viewport = f.page.locator('[data-viewport]');
  await paint(f.page);
  assert.equal(await viewport.evaluate(el => getComputedStyle(el).maskImage), 'none');
  await viewport.evaluate(el => el.scrollTop = 400); await paint(f.page);
  const mask = await viewport.evaluate(el => (el as HTMLElement).style.maskImage);
  assert.match(mask, /linear-gradient/);
  // CSSOM serializes alpha through browser color precision (8-bit in Chromium).
  assert.match(mask, /0\.15[67]/); assert.match(mask, /0\.84[34]/);
  assert.equal(mask.match(/px/g)?.length, 9);
  assert.match(mask, /56px/); assert.match(mask, /88px/);
  assert.equal(await viewport.evaluate(el => getComputedStyle(el).clipPath), 'none');
  await viewport.evaluate(el => el.scrollTop = 104); await paint(f.page);
  assert.match(await viewport.evaluate(el => (el as HTMLElement).style.maskImage), /0\.5\) 56px/);
  await viewport.evaluate(el => el.scrollTop = 400); await paint(f.page);
  await f.page.locator('[data-toolbar]').evaluate(el => (el as HTMLElement).style.height = '72px');
  await paint(f.page);
  assert.match(await viewport.evaluate(el => (el as HTMLElement).style.maskImage), /104px/);
  await viewport.evaluate(el => el.scrollTop = 0); await paint(f.page);
  assert.equal(await viewport.evaluate(el => getComputedStyle(el).maskImage), 'none');
  assert.deepEqual(f.errors, []);
 } finally { await f.close(); }
});

test('keyboard focus clears the entire feather without chasing deliberate scroll', async () => {
 const f = await svelteBrowser(source);
 try {
  await f.page.locator('[data-viewport]').evaluate(el => el.scrollTop = 420); await paint(f.page);
  await f.page.getByRole('textbox').focus(); await paint(f.page);
  const offset = await f.page.getByRole('textbox').evaluate(el => el.getBoundingClientRect().top - el.closest('[data-scroll-owner]')!.getBoundingClientRect().top);
  assert.ok(offset >= 96, `focus must clear 56px rail + 32px feather + 8px ring: ${offset}`);
  await f.page.locator('[data-viewport]').evaluate(el => el.scrollTop = 500); await paint(f.page);
  assert.equal(await f.page.locator('[data-viewport]').evaluate(el => el.scrollTop), 500);
 } finally { await f.close(); }
});

test('fully masked content cannot activate by pointer; revealed content still works', async () => {
 const f = await svelteBrowser(source);
 try {
  await f.page.locator('[data-viewport]').evaluate(el => el.scrollTop = 390); await paint(f.page);
  const button = f.page.getByRole('button');
  const box = (await button.boundingBox())!;
  await f.page.mouse.click(box.x + 10, box.y + 10);
  assert.equal(await button.getAttribute('data-activated'), null);
  await f.page.locator('[data-viewport]').evaluate(el => el.scrollTop = 250); await paint(f.page);
  await button.click(); assert.equal(await button.getAttribute('data-activated'), 'yes');
 } finally { await f.close(); }
});
