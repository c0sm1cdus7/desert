import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { chromium, type Page } from "playwright";
import { settle } from "../../tests/web/public-catalog-expectations.ts";
import { fingerprint, sizes } from "./capture.ts";

const origin = process.env.DESERT_VOID_DIAGNOSTIC_ORIGIN ?? "http://127.0.0.1:4399/";
const output = process.env.DESERT_PARITY_OUTPUT;
if (!output) throw new Error("DESERT_PARITY_OUTPUT_REQUIRED");
const directory = resolve(output);
await mkdir(directory, { recursive: false });
const build = await fingerprint(origin);
const browser = await chromium.launch({ headless: true });
const evidence: unknown[] = [], failures: string[] = [];

async function sampleEntry(page: Page) {
  return page.evaluate(async () => {
    const frames: unknown[] = [];
    for (let index = 0; index < 40; index++) {
      await new Promise(requestAnimationFrame);
      const element = document.querySelector<HTMLElement>('.drawer');
      if (!element) { frames.push({ index, present: false }); continue; }
      const style = getComputedStyle(element);
      frames.push({ index, present: true, opacity: Number(style.opacity), translate: style.translate,
        starting: element.hasAttribute('data-starting-style'), state: element.dataset.state,
        presentation: element.dataset.presentation, transition: style.transition,
        animations: element.getAnimations().map(animation => {
          const timing = animation.effect?.getComputedTiming();
          return { state: animation.playState, progress: timing?.progress, duration: timing?.duration,
            easing: timing?.easing, currentTime: animation.currentTime };
        }) });
    }
    return frames;
  });
}

try {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, colorScheme: "dark", reducedMotion: "no-preference" });
    const page = await context.newPage(); page.setDefaultTimeout(8000);
    try {
      await page.addInitScript(() => {
        const calls: unknown[] = [];
        Reflect.set(window, '__desertScrollCalls', calls);
        const native = Element.prototype.scrollTo;
        Reflect.set(Element.prototype, 'scrollTo', function (this: Element, ...args: unknown[]) {
          calls.push({ args, class: this.className, stack: new Error().stack });
          return Reflect.apply(native, this, args);
        });
      });
      await page.goto(origin); await page.getByRole('button', { name: 'Create note', exact: true }).waitFor(); await settle(page);
      if (!await page.getByRole('button', { name: 'Visual catalog', exact: true }).isVisible()) {
        await page.getByRole('button', { name: /^(Toggle|Show) navigation$/ }).click();
      }
      await page.getByRole('button', { name: 'Visual catalog', exact: true }).click(); await settle(page);
      await page.locator('[data-slot="sidebar"][data-presentation="overlay"]').waitFor({ state: 'hidden' });
      const viewport = page.locator('.view-workspace-main [data-place] > .place-viewport,[data-catalog-content] > .place-viewport');
      const before = await viewport.evaluate(element => {
        const chain = []; let node: Element | null = element;
        while (node) { const style = getComputedStyle(node); const rect = node.getBoundingClientRect();
          chain.push({ tag: node.tagName, class: node.className, y: rect.y, height: rect.height,
            clientHeight: node.clientHeight, scrollHeight: node.scrollHeight, overflowY: style.overflowY,
            heightRule: style.height, minHeight: style.minHeight, containerType: style.containerType }); node = node.parentElement; }
        return { scrollTop: element.scrollTop, chain, html: document.documentElement.getAttribute('style'),
          body: document.body.getAttribute('style'), modals: [...document.querySelectorAll('[aria-modal="true"],.scrim')]
            .map(node => ({ visible: node.checkVisibility(), role: node.getAttribute('role'), class: node.className })) };
      });
      await page.evaluate(() => { Reflect.get(window, '__desertScrollCalls').length = 0; });
      await page.mouse.move(size.width - 50, 400); await page.mouse.wheel(0, 620);
      await page.evaluate(async () => { for (let i = 0; i < 20; i++) await new Promise(requestAnimationFrame); });
      const after = await viewport.evaluate(element => ({ scrollTop: element.scrollTop, windowY: scrollY,
        programmaticResets: Reflect.get(window, '__desertScrollCalls') }));
      await page.screenshot({ path: join(directory, `${size.width}-catalog-wheel.png`), caret: "hide" });
      if (after.scrollTop <= before.scrollTop) failures.push(`${size.width}: real wheel did not advance the catalog viewport`);
      console.log(`${size.width} wheel: ${before.scrollTop} -> ${after.scrollTop}; client=${before.chain[0]!.clientHeight}; scroll=${before.chain[0]!.scrollHeight}`);
      evidence.push({ size, phase: 'wheel', before, after });

      await page.goto(origin); await page.getByRole('button', { name: 'Create note', exact: true }).waitFor(); await settle(page);
      if (await page.getByRole('button', { name: 'Create note', exact: true }).isDisabled()) {
        evidence.push({ size, phase: 'first-entry', executed: false, reason: 'Fresh browser has no admitted local identity; do not bypass disabled action.' });
        continue;
      }
      const sampling = sampleEntry(page);
      await page.getByRole('button', { name: 'Create note', exact: true }).click();
      const frames = await sampling;
      const moving = frames.some(frame => typeof frame === 'object' && frame !== null && 'opacity' in frame &&
        typeof frame.opacity === 'number' && frame.opacity > 0 && frame.opacity < 1);
      await page.screenshot({ path: join(directory, `${size.width}-create-first-open.png`), caret: "hide" });
      if (!moving) failures.push(`${size.width}: first create panel has no sampled entry opacity progression`);
      console.log(`${size.width} first entry: opacity progression=${moving}`);
      evidence.push({ size, phase: 'first-entry', frames, moving });
    } catch (error) { failures.push(`${size.width}: ${error instanceof Error ? error.message : String(error)}`); }
    finally { await context.close(); }
  }
  await writeFile(join(directory, "report.json"), JSON.stringify({ version: 1, build, browser: browser.version(),
    scope: "Read-only navigation and opening an unsubmitted draft; no acceptance or product writes", evidence, failures }, null, 2));
  assert.deepEqual(failures, [], "VOID_SCROLL_OR_ENTRY_REGRESSION");
} finally { await browser.close(); }
