import { mkdir, writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import type { Page } from 'playwright';

export const lifecycleDirectory = `artifacts/skeptics-v105/interaction/${basename(process.env.DESERT_CATALOG_BUILD ?? 'default')}${process.env.DESERT_LIFECYCLE_BROWSER === 'webkit' ? '-webkit' : ''}`;
export async function lifecycleEvidence(page: Page, name: string, extra: unknown = {}) {
  await mkdir(lifecycleDirectory, { recursive: true });
  const state = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    const viewport = document.querySelector('[data-catalog-scroll]');
    return { url: location.href, documentHasFocus: document.hasFocus(), active: { tag: active?.tagName, text: active?.textContent?.slice(0, 100),
      label: active?.getAttribute('aria-label'), id: active?.id, visible: active?.checkVisibility(),
      activeDescendant: active?.getAttribute('aria-activedescendant'),
      option: (active?.matches('[role="option"]') ? active : document.getElementById(active?.getAttribute('aria-activedescendant') ?? ''))?.textContent?.trim(),
      inert: !!active?.closest('[inert],[hidden]') },
      scroll: viewport?.scrollTop, searching: document.querySelector('[data-catalog-workspace]')?.getAttribute('data-search-active'),
      sheets: document.querySelectorAll('[data-picker-sheet]').length,
      calendars: document.querySelectorAll('[data-date-calendar]').length,
      calendarMonths: [...document.querySelectorAll('[data-date-calendar] .toolbar-title')].map(element => element.textContent),
      listboxes: document.querySelectorAll('[role="listbox"]').length };
  });
  await writeFile(`${lifecycleDirectory}/${name}.json`, JSON.stringify({ state, extra }, null, 2));
  // Installed WebKit2359's screenshot instrumentation injects an inline style
  // rejected by the real CSP (see csp-probe.json). Preserve strict diagnostics:
  // collect geometry/state only in this engine instead of weakening the policy.
  if (process.env.DESERT_LIFECYCLE_BROWSER !== 'webkit') {
    await page.screenshot({ path: `${lifecycleDirectory}/${name}.png` });
  }
  return state;
}
