import { mkdir, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Page } from 'playwright';

export const fixedToolbarEvidence = `artifacts/skeptics-v107/interaction/${basename(process.env.DESERT_CATALOG_BUILD ?? 'unknown-build')}`;
export async function saveFixedEvidence(page: Page, name: string, state: unknown) {
  await mkdir(fixedToolbarEvidence, { recursive: true });
  await writeFile(`${fixedToolbarEvidence}/${name}.json`, JSON.stringify(state, null, 2));
  await page.screenshot({ path: `${fixedToolbarEvidence}/${name}.png` });
}

export async function fixedChromeState(page: Page) {
  return page.locator('[data-catalog-content]').evaluate(owner => {
    const viewport = owner.querySelector('[data-catalog-scroll]')!;
    const bounds = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
    };
    const title = owner.querySelector('h1');
    const header = title?.closest('header');
    const cta = [...owner.querySelectorAll('button')].find(button => button.textContent?.includes('Learn More') || button.getAttribute('aria-label') === 'Learn More');
    const bars = [...owner.querySelectorAll('[data-toolbar]')].filter(bar => bar.closest('[data-scroll-owner]') === owner);
    return {
      scrollTop: viewport.scrollTop, viewport: bounds(viewport),
      title: title && { ...bounds(title), text: title.textContent, inViewport: viewport.contains(title), inToolbar: !!title.closest('[data-toolbar]') },
      header: header && { ...bounds(header), inViewport: viewport.contains(header), toolbar: header.hasAttribute('data-toolbar') },
      cta: cta && { ...bounds(cta), inViewport: viewport.contains(cta), inToolbar: !!cta.closest('[data-toolbar]'),
        hit: (() => { const r = cta.getBoundingClientRect(); const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!hit && (cta === hit || cta.contains(hit)); })() },
      bars: bars.map(bar => ({ edge: bar.getAttribute('data-toolbar'), ...bounds(bar),
        buttons: [...bar.querySelectorAll('button')].map(button => ({ name: button.getAttribute('aria-label') ?? button.textContent?.trim(), ...bounds(button) })),
        searchFields: [...bar.querySelectorAll('input[type="search"]')].filter(input => input.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !input.closest('[inert]')).length })),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    };
  });
}
