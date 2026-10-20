import type { Page } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';

export const compactEvidenceDirectory = `artifacts/skeptics-v106/interaction/${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}`;
export async function compactToolbarEvidence(page: Page, name: string) {
  const state = await page.locator('[data-catalog-content] > [data-place-header]').evaluate(header => {
    const rect = (element: Element) => {
      const r = element.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    };
    // Read painted text, not hidden accessible labels or the old button-face
    // implementation. Clipped summary text must not count as a visible row.
    const paintedText = (element: Element) => {
      const fragments: { text: string; left: number; right: number; top: number; bottom: number }[] = [];
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const parent = node.parentElement!;
        if (!parent.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
        const range = document.createRange(); range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          let left = r.left, top = r.top, right = r.right, bottom = r.bottom;
          for (let ancestor: Element | null = parent; ancestor; ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor), box = ancestor.getBoundingClientRect();
            if (style.overflowX === 'hidden' || style.overflowX === 'clip') {
              left = Math.max(left, box.left); right = Math.min(right, box.right);
            }
            if (style.overflowY === 'hidden' || style.overflowY === 'clip') {
              top = Math.max(top, box.top); bottom = Math.min(bottom, box.bottom);
            }
            const inset = /^inset\(([^)]+)\)$/.exec(style.clipPath);
            if (inset) {
              const values = inset[1]!.split(/\s+/).slice(0, 4).map(parseFloat);
              const [a = 0, b = a, c = a, d = b] = values;
              left = Math.max(left, box.left + d); top = Math.max(top, box.top + a);
              right = Math.min(right, box.right - b); bottom = Math.min(bottom, box.bottom - c);
            }
            if (style.opacity === '0') { bottom = top; break; }
          }
          if (right - left > 2 && bottom - top > 2) fragments.push({ text: node.textContent.trim(), left, right, top, bottom });
        }
      }
      return fragments;
    };
    const title = [...header.querySelectorAll('[data-toolbar-compact-title],[data-place-title]')]
      .find(element => paintedText(element).length > 0) ?? header.querySelector('[data-place-title]')!;
    const buttons = [...header.querySelectorAll('button')].filter(button => button.checkVisibility({ opacityProperty: true, visibilityProperty: true }));
    return { header: rect(header), condensed: header.getAttribute('data-header-condensed'),
      title: { ...rect(title), text: title.textContent, lineHeight: parseFloat(getComputedStyle(title).lineHeight), fragments: paintedText(title) },
      summary: [...header.querySelectorAll('[data-toolbar-summary]')].flatMap(paintedText),
      searchboxes: [...header.querySelectorAll('input[type="search"],[role="searchbox"]')].filter(element => element.checkVisibility({ opacityProperty: true, visibilityProperty: true })).length,
      buttons: buttons.map(button => ({ ...rect(button), name: button.getAttribute('aria-label') ?? button.textContent?.trim(),
        glyphs: button.querySelectorAll('svg').length, radius: getComputedStyle(button).borderTopLeftRadius,
        text: paintedText(button) })),
      background: getComputedStyle(header, '::before').backgroundImage,
      overflow: document.documentElement.scrollWidth - innerWidth };
  });
  await mkdir(compactEvidenceDirectory, { recursive: true });
  await writeFile(`${compactEvidenceDirectory}/${name}.json`, JSON.stringify(state, null, 2));
  await page.screenshot({ path: `${compactEvidenceDirectory}/${name}.png` });
  return state;
}
