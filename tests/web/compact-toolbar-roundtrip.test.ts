import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { publicCatalogFixture } from './public-catalog-fixture.ts';
import { settle } from './public-catalog-expectations.ts';
import { compactEvidenceDirectory } from './compact-toolbar-expectations.ts';

for (const scale of [1, 2]) test(`compact CTA recovers its natural label after capacity changes at text${scale}`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.evaluate(value => document.documentElement.style.setProperty('--text-scale', String(value)), scale);
    await settle(page);
    const action = page.locator('[data-place-header]').getByRole('button', { name: 'Learn More', exact: true });
    const original = await action.elementHandle();
    const measure = () => action.evaluate(element => {
      const r = element.getBoundingClientRect(), label = element.querySelector('[data-button-label]')!;
      const range = document.createRange(); range.selectNodeContents(label);
      const text = range.getBoundingClientRect(), style = getComputedStyle(element);
      return { width: r.width, height: r.height, left: r.left, right: r.right,
        label: { left: text.left, right: text.right, width: text.width, opacity: getComputedStyle(label).opacity },
        padding: parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) };
    });
    const initial = await measure(); const states = [];
    for (const width of [1280, 600, 390]) {
      await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 1400); await settle(page);
      await page.setViewportSize({ width, height: 900 }); await settle(page);
      const compact = await measure();
      assert.ok(Math.abs(compact.width - compact.height) <= 1);
      assert.ok(compact.left >= 0 && compact.right <= width);
      await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 0); await settle(page);
      const expanded = await measure(); states.push({ width, compact, expanded });
      assert.ok(await action.evaluate((element, first) => element === first, original), 'Resizing must not replace the action or its interaction owner');
      assert.equal(expanded.label.opacity, '1');
      assert.ok(expanded.width >= expanded.label.width + expanded.padding - 1, 'Expanded label regains its natural width and padding');
      assert.ok(expanded.label.left >= expanded.left - 1 && expanded.label.right <= expanded.right + 1, 'Expanded text is not clipped');
      assert.ok(expanded.width > expanded.height + 8, 'Expanded action is a label button, not a stale compact circle');
      if (width === 390) assert.ok(Math.abs(expanded.width - initial.width) <= 1, 'Round trip restores the original natural width');
    }
    await mkdir(compactEvidenceDirectory, { recursive: true });
    await writeFile(`${compactEvidenceDirectory}/cta-roundtrip-text${scale}.json`, JSON.stringify({ initial, states }, null, 2));
    await page.screenshot({ path: `${compactEvidenceDirectory}/cta-roundtrip-text${scale}.png` });
    await action.click(); await settle(page);
    assert.ok(new URL(page.url()).searchParams.has('record'));
  } finally { await f.close(); }
});

for (const colorScheme of ['light', 'dark'] as const) test(`shared scroll-edge paint is mirrored and layers below controls in ${colorScheme}`, async () => {
  const f = await publicCatalogFixture(); const { page } = f;
  try {
    await page.setViewportSize({ width: 390, height: 900 }); await page.emulateMedia({ colorScheme }); await settle(page);
    await page.locator('[data-catalog-scroll]').evaluate(element => element.scrollTop = 48); await settle(page);
    const state = await page.locator('[data-catalog-content]').evaluate(owner => {
      const top = owner.querySelector('[data-scroll-edge="top"]')!, bottom = owner.querySelector('[data-scroll-edge="bottom"]')!;
      const read = (element: Element) => {
        const style = getComputedStyle(element), paint = getComputedStyle(element, '::after');
        const core = parseFloat(style.getPropertyValue('--edge-core'));
        return { gradient: paint.backgroundImage, opacity: paint.opacity, filter: paint.filter,
          backdrop: paint.backdropFilter, ownFilter: style.filter, ownBackdrop: style.backdropFilter,
          feather: element.getBoundingClientRect().height - core, core, pointer: style.pointerEvents };
      };
      const contexts = (element: Element) => {
        const chain = [];
        for (let item: Element | null = element; item && item !== owner; item = item.parentElement) {
          const style = getComputedStyle(item);
          if ((style.position !== 'static' && style.zIndex !== 'auto') || style.transform !== 'none'
            || style.isolation === 'isolate' || Number(style.opacity) < 1 || style.filter !== 'none' || style.backdropFilter !== 'none')
            chain.unshift({ element: item.getAttribute('data-scroll-edge') ?? item.className, z: style.zIndex === 'auto' ? 0 : Number(style.zIndex) });
        }
        return chain;
      };
      const header = owner.querySelector('[data-place-header]')!;
      return { top: read(top), bottom: read(bottom),
        headerBackground: getComputedStyle(header).backgroundColor,
        headerPseudo: getComputedStyle(header, '::before').backgroundImage,
        media: contexts(header.querySelector('[data-place-media]')!),
        fade: contexts(top), controls: contexts(header.querySelector('[data-toolbar-navigation]')!),
        title: contexts(header.querySelector('[data-toolbar-identity]')!) };
    });
    await mkdir(compactEvidenceDirectory, { recursive: true });
    await writeFile(`${compactEvidenceDirectory}/edge-layer-${colorScheme}.json`, JSON.stringify(state, null, 2));
    await page.screenshot({ path: `${compactEvidenceDirectory}/edge-layer-${colorScheme}.png` });
    const normalize = (value: string) => value.replace(/to (?:top|bottom),\s*/, '').replace(/\s-?[\d.]+px(?=,)/g, ' CORE');
    assert.equal(normalize(state.top.gradient), normalize(state.bottom.gradient), 'Both directions share colors and gradient stops');
    assert.match(state.bottom.gradient, /to top/);
    assert.ok(!/to top/.test(state.top.gradient));
    assert.ok(Math.abs(state.top.feather - state.bottom.feather) <= 1 && state.top.feather > 0, 'Both edges have the same progressive feather');
    for (const edge of [state.top, state.bottom]) {
      assert.equal(edge.opacity, '1'); assert.equal(edge.pointer, 'none');
      for (const filter of [edge.filter, edge.backdrop, edge.ownFilter, edge.ownBackdrop]) assert.equal(filter, 'none');
    }
    assert.equal(state.headerPseudo, 'none', 'No second opaque toolbar slab');
    assert.equal(state.headerBackground, 'rgba(0, 0, 0, 0)');
    assert.ok(state.media[0]!.z < state.fade[0]!.z, `Hero must paint below the shared fade: ${JSON.stringify(state)}`);
    assert.ok(state.fade[0]!.z < state.controls[0]!.z && state.fade[0]!.z < state.title[0]!.z,
      'Controls and identity must paint above their shared fade, not be filtered by it');
  } finally { await f.close(); }
});
