// Pixel parity between a frozen "before" rendering and today's: both render the same cases (or cases whose probes name
// corresponding elements), and each probe's boxes and computed styles are compared. Used by the slice 3 foundation tests,
// whose new pieces must keep the pixels of the pieces they absorb.
import type { Page } from "playwright";
import { svelteBrowser } from "./svelte-browser.ts";

/** case name → probe name → selector inside `[data-case="<case>"]` (every match is measured, in document order). */
export type Probes = Readonly<Record<string, Readonly<Record<string, string>>>>;

export const parityStyles = ["color", "background-color", "background-image", "border-top-width", "border-top-color",
  "border-bottom-width", "border-left-width", "border-radius", "display", "flex-direction", "align-items", "justify-content",
  "gap", "font-size", "line-height", "font-weight", "letter-spacing", "text-align", "white-space", "overflow-wrap",
  "padding-top", "padding-right", "padding-bottom", "padding-left", "position", "overflow", "opacity", "object-fit",
  "visibility", "min-height", "max-width", "z-index", "box-shadow", "outline-style", "outline-offset", "cursor", "transform"];

/** Renders `source` with `overrides` (frozen files by absolute path) over `css`, at a fixed viewport, motion reduced. */
export async function renderCases(source: string, overrides: Readonly<Record<string, string>>, css: string,
  viewport: Readonly<{ width: number; height: number }> = { width: 1000, height: 1400 }) {
  const f = await svelteBrowser(source, overrides, undefined, { initialCss: css });
  await f.page.emulateMedia({ reducedMotion: "reduce" });
  await f.page.setViewportSize(viewport);
  await f.page.evaluate(async () => { await document.fonts.ready; });
  return f;
}

/** Waits until every running animation has finished and two frames have been drawn. */
export const settle = (page: Page) => page.evaluate(async () => {
  await Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => undefined)));
  await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
});

/** The styles that shape text, compared for a `text:` probe. */
export const textStyles = ["color", "font-size", "line-height", "font-weight", "letter-spacing", "text-align", "white-space", "overflow-wrap"];

/** Boxes (relative to the case) and the computed `styles` of every element each probe names. A selector written
 * `text:<selector>` measures the box of the element's text (its glyphs) and its text styles, not the element's box, for
 * a title whose element stretches in one layout and hugs its text in the other. */
export function measureProbes(page: Page, probes: Probes, styles: readonly string[] = parityStyles) {
  return page.evaluate(([probes, styles, textStyles]) => Object.fromEntries(Object.entries(probes).map(([name, selectors]) => {
    const host = document.querySelector(`[data-case="${name}"]`);
    if (!host) throw new Error(`PARITY: no case ${name}`);
    const origin = host.getBoundingClientRect();
    return [name, Object.fromEntries(Object.entries(selectors).map(([probe, written]) => {
      const text = written.startsWith("text:"), selector = text ? written.slice(5) : written;
      const found = [...host.querySelectorAll(selector)];
      if (!found.length) throw new Error(`PARITY: ${name}/${probe}: nothing matches ${selector}`);
      return [probe, found.map(element => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const box = text ? range.getBoundingClientRect() : element.getBoundingClientRect(), style = getComputedStyle(element);
        return { box: [box.x - origin.x, box.y - origin.y, box.width, box.height].map(value => Math.round(value * 100) / 100),
          style: Object.fromEntries((text ? textStyles : styles).map(key => [key, style.getPropertyValue(key)])) };
      })];
    }))];
  })), [probes, styles, textStyles] as const);
}

/** A frozen theme.css whose `@import`s of the named files are replaced by their frozen text (Tailwind reads the rest). */
export function inlineImports(theme: string, files: Readonly<Record<string, string>>): string {
  let text = theme;
  for (const [path, css] of Object.entries(files)) {
    const statement = `@import "./${path.replace(/^src\/svelte\//, "")}";`;
    if (!text.includes(statement)) throw new Error(`PARITY: the frozen theme does not import ${path}`);
    text = text.replace(statement, css);
  }
  return text;
}
