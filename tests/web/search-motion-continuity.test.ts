import assert from "node:assert/strict";
import test from "node:test";
import { publicCatalogFixture } from "./public-catalog-fixture.ts";
import { settle } from "./public-catalog-expectations.ts";

for (const width of [390, 1280]) test(`search interruption retains layout and input identity at ${width}px`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page } = fixture;
    await page.locator('[data-photo-collection] img').first().evaluate(image => (image as HTMLImageElement).decode());
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width, height: 740 }); await settle(page);
    const result = await page.evaluate(async () => {
      const field = document.querySelector<HTMLElement>('[data-catalog-search]')!;
      const input = field.querySelector('input')!;
      const pill = field.querySelector<HTMLElement>('[data-slot="input-group"]')!;
      const toggle = document.querySelector<HTMLButtonElement>('[data-catalog-search-toggle]')!;
      const samples: { width: number; height: number; pillWidth: number; pillHeight: number; clip: string; transform: string }[] = [];
      async function sampleFor(duration: number) {
        const start = performance.now();
        do {
          await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
          const { width, height } = field.getBoundingClientRect();
          const rect = pill.getBoundingClientRect();
          samples.push({ width, height, pillWidth: rect.width, pillHeight: rect.height,
            clip: getComputedStyle(field).clipPath, transform: getComputedStyle(input).transform });
        } while (performance.now() - start < duration);
      }
      toggle.click(); await sampleFor(65);
      toggle.click(); await sampleFor(65);
      toggle.click(); await sampleFor(350);
      const sameInput = input === document.querySelector('[data-catalog-search] input');
      const focused = document.activeElement === input;
      input.value = 'mount'; input.dispatchEvent(new Event('input', { bubbles: true }));
      await sampleFor(20);
      toggle.click(); await sampleFor(220);
      // Wall time includes raster stalls, not just the animation's active time.
      // Check the actual duration and completion instead of assuming the next
      // compositor frame must have arrived within a fixed wall-clock delay.
      const closing = field.getAnimations({ subtree: true });
      const exitDurations = closing.map(animation => animation.effect?.getComputedTiming().duration);
      await Promise.all(closing.map(animation => animation.finished.catch(() => {})));
      await new Promise(requestAnimationFrame);
      const rail = document.querySelector('[data-catalog-toolbar]')!, material = document.querySelector('[data-catalog-search-material]')!;
      return { samples, sameInput, focused, exitDurations, value: input.value,
        foreground: Number(getComputedStyle(rail).zIndex) > Number(getComputedStyle(material).zIndex),
        hidden: getComputedStyle(field).visibility === 'hidden', inert: field.inert };
    });
    const first = result.samples[0]!;
    assert.ok(result.samples.every(sample => Math.abs(sample.width - first.width) < .25 && Math.abs(sample.height - first.height) < .25),
      "Opening, reversing and closing cannot reflow the field");
    assert.ok(result.samples.every(sample => sample.clip === 'none'), "The capsule must grow, never be revealed by a clipping mask");
    assert.ok(new Set(result.samples.map(sample => Math.round(sample.pillWidth))).size > 3, "The actual rounded capsule changes width");
    assert.ok(result.samples.every(sample => Math.abs(sample.pillHeight - first.pillHeight) < .25 && sample.transform === 'none'),
      "Growth keeps capsule height and unscaled glyphs stable");
    assert.ok(result.sameInput && result.focused, "Reversal retains the original focused input");
    assert.ok(result.exitDurations.every(duration => typeof duration === 'number' && duration <= 180), "Exit uses the shared 180ms motion token");
    assert.ok(result.hidden && result.inert, `Closed retained field cannot paint or receive input: ${JSON.stringify(result)}`);
    assert.equal(result.value, 'mount', "Outgoing text must not flash to a placeholder during closure");
    assert.ok(result.foreground, "Closing controls cannot fall underneath the fading material");
  } finally { await fixture.close(); }
});
