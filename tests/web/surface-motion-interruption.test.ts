import assert from 'node:assert/strict';
import test from 'node:test';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';

for (const kind of ['problem', 'transient']) test(`${kind} dismissal continues from an interrupted entrance`, async () => {
  const fixture = await publicCatalogFixture();
  try {
    const { page, origin } = fixture;
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(`${origin}/?place=bank`);
    await settle(page);
    const frames = await page.getByRole('button', { name: `Open ${kind} example`, exact: true }).first().evaluate(async trigger => {
      const frames: { state: string | null; x: number; y: number; opacity: number }[] = [];
      let done = false;
      function sample() {
        const node = document.querySelector('[data-slot="dialog-content"]');
        if (node) {
          const { x, y } = node.getBoundingClientRect();
          frames.push({ state: node.getAttribute('data-state'), x, y, opacity: Number(getComputedStyle(node).opacity) });
        }
        if (!done) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample); (trigger as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 65));
      const node = document.querySelector('[data-slot="dialog-content"]')!;
      const close = [...node.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Close'
        || button.getAttribute('aria-label') === 'Close');
      if (!close) throw new Error('Missing dismissal action');
      close.click();
      await new Promise(resolve => setTimeout(resolve, 300)); done = true;
      return frames;
    });
    const lastOpen = frames.filter(frame => frame.state === 'open').at(-1)!;
    const closing = frames.filter(frame => frame.state === 'closed');
    assert.ok(lastOpen && closing.length > 1, 'Both sides of the interrupted transition are observed');
    assert.ok(closing[0]!.opacity <= lastOpen.opacity + .08, 'Dismissal must not flash to full opacity');
    const axis = kind === 'problem' ? 'y' : 'x';
    assert.ok(closing[0]![axis] >= lastOpen[axis] - 1, 'Dismissal must not jump toward the settled position');
    assert.equal(await page.locator('[data-slot="dialog-content"], [data-slot="dialog-overlay"]').count(), 0,
      'Presence releases content and scrim after the interrupted exit');
  } finally { await fixture.close(); }
});
