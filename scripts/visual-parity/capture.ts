import type { Browser, Page } from "playwright";
import { createHash } from "node:crypto";
import { settle } from "../../tests/web/public-catalog-expectations.ts";

export const sizes = [{ width: 390, height: 844 }, { width: 1280, height: 900 }] as const;
export const themes = ["dark", "light"] as const;
export const states = ["initial", "scroll", "search", "sidebar", "transient"] as const;
export type State = typeof states[number];
export type Theme = typeof themes[number];
export type Size = typeof sizes[number];
export const hash = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const family = process.env.DESERT_PARITY_FAMILY ?? "public-catalog";
if (!["public-catalog", "void"].includes(family)) throw new Error("UNKNOWN_PARITY_FAMILY");

export async function fingerprint(origin: string) {
  const response = await fetch(origin);
  if (!response.ok) throw new Error(`BUILD_UNREACHABLE:${origin}:${response.status}`);
  const html = await response.text();
  const paths = [...html.matchAll(/href="([^"]+)" rel="(?:stylesheet|modulepreload)"/g)].map(match => match[1]!);
  const assets = await Promise.all(paths.map(async path => {
    const url = new URL(path, origin).href;
    const result = await fetch(url);
    if (!result.ok) throw new Error(`ASSET_UNREACHABLE:${url}`);
    const bytes = Buffer.from(await result.arrayBuffer());
    return { url, bytes: bytes.length, sha256: hash(bytes) };
  }));
  return { origin, htmlSha256: hash(html), assets };
}

export async function openBank(browser: Browser, origin: string, size: Size, theme: Theme) {
  const context = await browser.newContext({ viewport: size, deviceScaleFactor: 1, colorScheme: theme,
    reducedMotion: "no-preference", locale: "en-US", timezoneId: "America/Argentina/Buenos_Aires" });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors: string[] = [], writes: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => {
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) writes.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(new URL(family === "void" ? "/" : "?place=bank", origin).href);
  if (family === "void") {
    await page.getByRole("main", { name: "Home", exact: true }).waitFor();
    const show = page.getByRole("button", { name: "Show navigation", exact: true });
    if (await show.isVisible()) await show.click();
    await page.getByRole("button", { name: "Visual catalog", exact: true }).click();
  }
  // The baseline build marks the bank with its composition mark; this tree with the view region that replaced it.
  await page.locator(':is([data-public-catalog-bank], [data-view-item="public-catalog-bank"])').waitFor();
  await settle(page);
  return { page, errors, writes, close: () => context.close() };
}

export async function selectState(page: Page, state: State) {
  if (state === "scroll") {
    const viewport = page.locator('[data-catalog-scroll]');
    const box = (await viewport.boundingBox())!;
    await page.mouse.move(box.x + box.width - 30, box.y + Math.min(360, box.height / 2));
    await page.mouse.wheel(0, 620);
    await page.waitForFunction(() => (document.querySelector('[data-catalog-scroll]')?.scrollTop ?? 0) > 0);
    await page.waitForFunction(() => document.querySelector('[data-place-header]')?.getAttribute('data-handoff') !== 'transition');
  } else if (state === "search") {
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const input = page.getByRole("searchbox").filter({ visible: true });
    await input.fill("button");
  } else if (state === "sidebar") {
    const show = page.getByRole("button", { name: "Show navigation", exact: true });
    if (await show.isVisible()) await show.click();
    // Wide starts with the sidebar docked; compact starts with it transient.
    // Entry/exit trajectories are verified separately, not by clocked screenshots.
    await page.getByRole("button", { name: family === "void" ? "Visual catalog" : "Component bank", exact: true }).waitFor();
  } else if (state === "transient") {
    await page.getByRole("button", { name: "Open transient example", exact: true }).first().click();
    await page.getByRole("dialog", { name: "Diagnostic transient", exact: true }).waitFor();
  }
  await settle(page);
  await page.mouse.move(1, 1);
  await settle(page);
  await page.waitForFunction(() => !document.querySelector('[data-pressed]') && !document.getAnimations().some(animation => {
    const timing = animation.effect?.getComputedTiming();
    return typeof timing?.endTime === 'number' && Number.isFinite(timing.endTime) && animation.playState === 'running';
  }));
  // Let the compositor retire temporary transition layers, without clock sleeps.
  await page.evaluate(async () => { for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame); });
}

export async function metrics(page: Page) {
  return page.evaluate(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>(
      '[data-place],[data-toolbar],[data-catalog-scroll],[data-slot="sidebar-container"],.drawer')]
      .filter(element => element.checkVisibility()).map(element => {
        const style = getComputedStyle(element), rect = element.getBoundingClientRect();
        return { tag: element.tagName, role: element.getAttribute("role"), slot: element.dataset.slot,
          toolbar: element.dataset.toolbar, width: rect.width, height: rect.height, x: rect.x, y: rect.y,
          scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
          overflowY: style.overflowY, background: style.backgroundColor, border: style.border,
          radius: style.borderRadius, filter: style.backdropFilter, transition: style.transition };
      });
    return { rootProfile: document.documentElement.dataset.rendererProfile, bodyHeight: document.body.scrollHeight,
      wheelOwners: boxes, activeElement: document.activeElement?.getAttribute("aria-label"),
      handoff: document.querySelector('[data-place-header]')?.getAttribute('data-handoff') };
  });
}
