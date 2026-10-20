import assert from 'node:assert/strict';
import test from 'node:test';
import { basename } from 'node:path';
import type { Page } from 'playwright';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { evidence, selectionTrigger, settle } from './public-catalog-expectations.ts';

const roles = ['docked navigation', 'overlay navigation', 'right transient', 'bottom transient',
  'message', 'select popup', 'calendar popup', 'select sheet', 'calendar sheet'] as const;
type SurfaceRole = typeof roles[number];

async function openSurface(page: Page, origin: string, role: SurfaceRole) {
  const compact = /overlay|bottom|sheet/.test(role);
  await page.setViewportSize({ width: compact ? 320 : 1280, height: 900 });
  const place = /transient|message/.test(role) ? 'bank' : 'travel-kit';
  await page.goto(`${origin}/?place=${place}`); await settle(page);
  if (role === 'docked navigation') return page.locator('[data-slot="sidebar-inner"]');
  if (role === 'overlay navigation') {
    await page.getByRole('button', { name: 'Show navigation', exact: true }).click();
    return page.locator('[data-sidebar="sidebar"][data-presentation="overlay"]');
  }
  if (/transient|message/.test(role)) {
    const name = role === 'message' ? 'Open problem example' : 'Open transient example';
    await page.getByRole('button', { name, exact: true }).first().click();
    const panel = page.locator('[data-slot="dialog-content"]');
    await panel.waitFor();
    if (role !== 'message') assert.equal(await panel.getAttribute('data-edge'), compact ? 'bottom' : 'right');
    return panel;
  }
  if (role.startsWith('select')) await selectionTrigger(page, 'Destination').click();
  else await page.getByRole('button', { name: /^Arrival date · / }).click();
  return page.locator(compact ? '[data-picker-sheet]' : '.floating-pane');
}

// Independent perimeter contract: every actual floating/docked surface keeps a
// real 1px solid boundary. Shadows, focus rings and content stacks are not borders.
for (const role of roles) test(`${role}: continuous surface boundary survives material preferences`, async () => {
  const f = await publicCatalogFixture();
  try {
    const panel = await openSurface(f.page, f.origin, role);
    await panel.waitFor(); await settle(f.page);
    const session = await f.context.newCDPSession(f.page);
    const observations = [];
    for (const colorScheme of ['light', 'dark'] as const) for (const preference of ['normal', 'reduced', 'contrast']) {
      await f.page.emulateMedia({ colorScheme });
      await session.send('Emulation.setEmulatedMedia', { features: [
        { name: 'prefers-color-scheme', value: colorScheme },
        { name: 'prefers-reduced-transparency', value: preference === 'reduced' ? 'reduce' : 'no-preference' },
        { name: 'prefers-contrast', value: preference === 'contrast' ? 'more' : 'no-preference' },
      ] });
      await settle(f.page);
      const paint = await panel.evaluate(element => {
        const style = getComputedStyle(element);
        const probe = document.createElement('span'); probe.hidden = true; probe.style.color = 'var(--foreground)';
        element.append(probe); const foreground = getComputedStyle(probe).color; probe.remove();
        const edges = ['top', 'right', 'bottom', 'left'].map(edge => ({ edge,
          width: style.getPropertyValue(`border-${edge}-width`),
          style: style.getPropertyValue(`border-${edge}-style`),
          color: style.getPropertyValue(`border-${edge}-color`) }));
        return { edges, foreground };
      });
      observations.push({ colorScheme, preference, ...paint });
    }
    await evidence(f.page, `surface-boundary-${role.replaceAll(' ', '-')}-${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}`, observations);
    for (const observation of observations) {
      const description = `${role}, ${observation.colorScheme}, ${observation.preference}`;
      for (const edge of observation.edges) {
        assert.equal(edge.width, '1px', `${description}: ${edge.edge} is a real 1px boundary`);
        assert.equal(edge.style, 'solid', `${description}: ${edge.edge} stays continuous`);
        assert.doesNotMatch(edge.color, /transparent|rgba\([^)]*,\s*0\)|\/\s*0\)/, `${description}: visible stroke`);
        if (observation.preference === 'contrast') assert.equal(edge.color, observation.foreground,
          `${description}: increased contrast strengthens the perimeter to the resolved foreground`);
      }
      assert.equal(new Set(observation.edges.map(edge => edge.color)).size, 1, `${description}: one perimeter color`);
    }
  } finally { await f.close(); }
});

test('navigation border remains present during interrupted entrance and exit', async () => {
  const f = await publicCatalogFixture();
  try {
    await f.page.setViewportSize({ width: 390, height: 844 });
    await f.page.emulateMedia({ reducedMotion: 'no-preference' }); await settle(f.page);
    const frames = await f.page.getByRole('button', { name: 'Show navigation', exact: true }).evaluate(async trigger => {
      const frames: { state: string | null; widths: string[]; styles: string[] }[] = [];
      let done = false;
      function sample() {
        const panel = document.querySelector('[data-sidebar="sidebar"][data-presentation="overlay"]');
        if (panel) {
          const css = getComputedStyle(panel), sides = ['top', 'right', 'bottom', 'left'];
          frames.push({ state: panel.getAttribute('data-state'), widths: sides.map(side => css.getPropertyValue(`border-${side}-width`)),
            styles: sides.map(side => css.getPropertyValue(`border-${side}-style`)) });
        }
        if (!done) requestAnimationFrame(sample);
      }
      requestAnimationFrame(sample); (trigger as HTMLButtonElement).click();
      await new Promise(resolve => setTimeout(resolve, 100));
      const close = document.querySelector<HTMLButtonElement>('[data-presentation="overlay"] [data-slot="sidebar-trigger"]');
      if (!close) throw new Error('Navigation dismissal was not mounted');
      close.click(); await new Promise(resolve => setTimeout(resolve, 350)); done = true;
      return frames;
    });
    await evidence(f.page, `surface-boundary-interruption-${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}`, frames);
    assert.ok(frames.some(frame => frame.state === 'open') && frames.some(frame => frame.state === 'closed'), 'Both transition phases were sampled');
    for (const frame of frames) {
      assert.deepEqual(frame.widths, ['1px', '1px', '1px', '1px'], `${frame.state}: no border loss during motion`);
      assert.deepEqual(frame.styles, ['solid', 'solid', 'solid', 'solid']);
    }
  } finally { await f.close(); }
});
