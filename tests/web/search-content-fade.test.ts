import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

for (const width of [390, 1280]) test(`search content has a perceptible shared fade at ${width}`, async () => {
 const f = await publicCatalogFixture();
 try {
  await f.page.setViewportSize({ width, height: 740 });
  await f.page.emulateMedia({ reducedMotion: 'no-preference' }); await settle(f.page);
  const result = await f.page.evaluate(async () => {
   const field = document.querySelector<HTMLElement>('[data-catalog-search]')!;
   const input = field.querySelector('input')!;
   const icon = field.querySelector<HTMLElement>('[data-slot="input-group-addon"]')!;
   document.querySelector<HTMLButtonElement>('[data-catalog-search-toggle]')!.click();
   await new Promise(requestAnimationFrame);
   const animations = field.getAnimations({ subtree: true });
   animations.forEach(animation => animation.pause());
   const samples = [];
   for (const time of [0, 140, 180, 220, 300]) {
    animations.forEach(animation => animation.currentTime = time);
    await new Promise(requestAnimationFrame);
    samples.push({ time, input: Number(getComputedStyle(input).opacity), icon: Number(getComputedStyle(icon).opacity) });
   }
   animations.forEach(animation => animation.finish());
   return { samples, focused: document.activeElement === input };
  });
  assert.equal(result.samples[0]!.input, 0);
  const middle = result.samples.find(sample => sample.time === 180)!;
  assert.ok(middle.input > .1 && middle.input < .9, `placeholder must be visibly fading before the shell settles: ${JSON.stringify(result)}`);
  assert.ok(result.samples[3]!.input < .99, 'content must not jump straight to opaque');
  assert.equal(result.samples.at(-1)!.input, 1);
  for (const sample of result.samples) assert.equal(sample.input, sample.icon, 'lupa and placeholder enter together');
  assert.ok(result.focused, 'focus must not wait for the fade');
  await f.page.keyboard.press('Escape'); await settle(f.page);
  await f.page.emulateMedia({ reducedMotion: 'reduce' });
  await f.page.getByRole('button', { name: 'Search', exact: true }).click();
  await settle(f.page);
  assert.equal(await f.page.locator('[data-catalog-search] input').evaluate(el => getComputedStyle(el).opacity), '1');
  assert.equal(await f.page.locator('[data-catalog-search] input').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
 } finally { await f.close(); }
});
