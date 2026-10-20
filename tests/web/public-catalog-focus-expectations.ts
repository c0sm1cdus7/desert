import type { Locator, Page } from 'playwright';

export async function focusState(locator: Locator) {
  return locator.evaluate(element => {
    const face = element.closest('[data-search-field]') ?? element;
    const style = getComputedStyle(face), bounds = element.getBoundingClientRect();
    const points = [[bounds.left + 8, bounds.top + 8], [bounds.right - 8, bounds.top + 8],
      [bounds.left + 8, bounds.bottom - 8], [bounds.right - 8, bounds.bottom - 8]];
    return { focused: element === document.activeElement, visibleFocus: element.matches(':focus-visible'),
      outlineWidth: style.outlineStyle === 'none' ? 0 : parseFloat(style.outlineWidth),
      top: bounds.top, bottom: bounds.bottom, viewportHeight: innerHeight,
      hitTests: points.map(([x, y]) => {
        const hit = document.elementFromPoint(x!, y!);
        return { x, y, exposed: hit === element || !!hit && element.contains(hit), hit: hit?.outerHTML.slice(0, 180) };
      }) };
  });
}

export async function shellState(page: Page) {
  return page.evaluate(() => ({ rootScroll: scrollY,
    workspaceScroll: document.querySelector('[data-catalog-workspace]')!.scrollTop }));
}
