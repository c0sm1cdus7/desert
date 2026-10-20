import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
import { fingerprint, openBank, sizes, themes } from "./capture.ts";

const baseline = process.env.DESERT_PARITY_BASELINE ?? "http://127.0.0.1:4292/";
const candidate = process.env.DESERT_PARITY_CANDIDATE;
const output = process.env.DESERT_PARITY_OUTPUT;
if (!candidate || !output) throw new Error("DESERT_PARITY_CANDIDATE_AND_OUTPUT_REQUIRED");
const directory = resolve(output); await mkdir(directory, { recursive: false });
const profiles = {
  search: '[data-catalog-search],[data-catalog-search] [data-slot],[data-search-icon],[data-catalog-search-material]',
  sidebar: '[data-slot="sidebar-container"],[data-slot="sidebar-gap"],[data-sidebar="sidebar"],.scrim',
  transient: '.drawer,.scrim',
} as const;

async function install(page: Page, selector: string) {
  await page.evaluate(selector => {
    const entries: { element: Element; animation: Animation; property: string; key: string }[] = [];
    const listen = (event: TransitionEvent) => {
      if (!(event.target instanceof Element) || !event.target.matches(selector)) return;
      const element = event.target;
      const animation = element.getAnimations().find(animation =>
        animation instanceof CSSTransition && animation.transitionProperty === event.propertyName);
      if (!animation || entries.some(entry => entry.animation === animation)) return;
      const attributes = [...element.attributes].filter(attribute => attribute.name.startsWith('data-') &&
        !['data-state', 'data-starting-style', 'data-ending-style'].includes(attribute.name))
        .map(attribute => `${attribute.name}=${attribute.value}`).sort();
      const key = `${element.tagName}:${attributes.join('|')}:${event.propertyName}`;
      animation.pause(); entries.push({ element, animation, property: event.propertyName, key });
    };
    document.addEventListener('transitionrun', listen, true);
    Reflect.set(window, '__desertParityMotion', { entries, listen });
  }, selector);
}

async function read(page: Page) {
  return page.evaluate(async () => {
    // transitionrun includes delayed ink. Wait rendering frames, never sample by elapsed wall time.
    for (let frame = 0; frame < 6; frame++) await new Promise(requestAnimationFrame);
    const capture: { entries: { element: Element; animation: Animation; property: string; key: string }[];
      listen: (event: TransitionEvent) => void } = Reflect.get(window, '__desertParityMotion');
    document.removeEventListener('transitionrun', capture.listen, true);
    const records = capture.entries.map(entry => {
      const effect = entry.animation.effect;
      if (!(effect instanceof KeyframeEffect)) throw new Error('KEYFRAME_EFFECT_REQUIRED');
      const timing = effect.getTiming();
      return { key: entry.key, timing: { duration: timing.duration, delay: timing.delay, easing: timing.easing,
        fill: timing.fill, iterations: timing.iterations }, keyframes: effect.getKeyframes(),
        samples: [] as { progress: number; actualProgress: number | null; paint: string }[] };
    });
    for (const progress of [0, .25, .5, .75, 1]) {
      for (const entry of capture.entries) {
        const timing = entry.animation.effect!.getTiming();
        if (typeof timing.duration !== 'number') throw new Error('NON_FINITE_MOTION_DURATION');
        entry.animation.currentTime = timing.delay + timing.duration * progress;
      }
      await new Promise(requestAnimationFrame);
      capture.entries.forEach((entry, index) => records[index]!.samples.push({ progress,
        actualProgress: entry.animation.effect!.getComputedTiming().progress,
        paint: getComputedStyle(entry.element).getPropertyValue(entry.property) }));
    }
    return records.sort((a, b) => a.key.localeCompare(b.key));
  });
}

const browser = await chromium.launch({ headless: true });
const report: { case: string; equal?: boolean; baseline?: unknown; candidate?: unknown; error?: string }[] = [];
const builds = { baseline: await fingerprint(baseline), candidate: await fingerprint(candidate) };
try {
  for (const size of sizes) for (const theme of themes) for (const state of ['search', 'sidebar', 'transient'] as const) {
    const name = `${size.width}x${size.height}-${theme}-${state}`;
    try {
      const captures = [];
      for (const origin of [baseline, candidate]) {
        const fixture = await openBank(browser, origin, size, theme);
        try {
          const label = state === 'search' ? 'Search' : state === 'transient' ? 'Open transient example'
            : size.width === 390 ? 'Show navigation' : 'Hide navigation';
          const trigger = fixture.page.getByRole('button', { name: label, exact: true }).first();
          await trigger.scrollIntoViewIfNeeded();
          await install(fixture.page, profiles[state]);
          await trigger.click();
          const capture = await read(fixture.page);
          assert.ok(capture.length > 0, `${state}: no transition was observed`);
          assert.ok(capture.some(item => item.samples.some(sample => sample.actualProgress! > 0 && sample.actualProgress! < 1)),
            `${state}: no intermediate semantic progress`);
          captures.push(capture);
        } finally { await fixture.close(); }
      }
      const equal = JSON.stringify(captures[0]) === JSON.stringify(captures[1]);
      report.push({ case: name, equal, baseline: captures[0], candidate: captures[1] });
      console.log(`${name}: semantic motion parity=${equal}`);
    } catch (error) { report.push({ case: name, error: error instanceof Error ? error.message : String(error) }); }
    await writeFile(join(directory, 'report.json'), JSON.stringify({ version: 1, builds, browser: browser.version(),
      policy: 'Pause actual triggered CSS transitions; compare timing, keyframes and computed paint at progress 0/.25/.5/.75/1; no wall-clock snapshots.', report }, null, 2));
  }
  assert.equal(report.length, 12);
  assert.ok(report.every(item => item.equal === true && !item.error), 'SEMANTIC_MOTION_PARITY_FAILED');
} finally { await browser.close(); }
