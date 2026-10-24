// What a person sees of a rendered composition, independent of the elements that draw it: every line of text (its box
// and the styles that shape it), every pane (its box and material), every hairline (its edge and length) and every mark
// (a glyph, an attention dot, a skeleton line, a meter segment: its box and ink), relative to the case it is in. Text
// kept for assistive technology only (`.sr-only`) is read without a box or styles: nobody sees it. Two renderings that
// read the same give equal readings, whatever their DOM.
import type { Page } from "playwright";

/** A box is [x, y, width, height] relative to the case. */
export type Box = readonly [number, number, number, number];
export type TextReading = Readonly<{ text: string; box: Box | "sr-only"; style: readonly string[] }>;
export type Reading = Readonly<{ size: readonly number[]; texts: readonly TextReading[]; panes: readonly Readonly<{ box: Box; material: readonly string[] }>[];
  hairlines: readonly (readonly (string | number)[])[]; marks: readonly Readonly<{ box: Box; ink: readonly string[] }>[] }>;

/** What a reading lists as marks, in both the frozen and today's anatomy. */
const markSelector = "svg, [data-attention-indicator], [data-slot=skeleton], [data-meter] [aria-hidden=true] > span, .widget-chart > span";

/** The reading of every `[data-case]` named in `cases`. */
export function readCases(page: Page, cases: readonly string[]): Promise<Record<string, Reading>> {
  return page.evaluate(([names, marked]): Record<string, Reading> => {
    const round = (value: number) => Math.round(value * 100) / 100;
    const read = (host: Element) => {
      const origin = host.getBoundingClientRect();
      const box = (rect: DOMRect): Box => [round(rect.x - origin.x), round(rect.y - origin.y), round(rect.width), round(rect.height)];
      const texts: TextReading[] = [];
      const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const content = node.textContent?.trim() ?? "", parent = node.parentElement;
        if (!content || !parent) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        const style = getComputedStyle(parent);
        if (parent.closest(".sr-only")) { texts.push({ text: content, box: "sr-only", style: [] }); continue; }
        texts.push({ text: content, box: box(range.getBoundingClientRect()),
          style: [style.fontSize, style.lineHeight, style.fontWeight, style.color, style.textAlign, style.whiteSpace] });
      }
      const elements = [...host.querySelectorAll("*")];
      const panes = elements.filter(element => element.matches(".material-pane, [data-grouped-panel]")).map(element => {
        const style = getComputedStyle(element);
        return { box: box(element.getBoundingClientRect()), material: [style.backgroundColor, style.borderTopLeftRadius, style.boxShadow] };
      });
      const hairlines = elements.flatMap(element => {
        const style = getComputedStyle(element), [x, y, width, height] = box(element.getBoundingClientRect());
        return [...Number.parseFloat(style.borderTopWidth) > 0 ? [["top", x, y, width, style.borderTopColor]] : [],
          ...Number.parseFloat(style.borderBottomWidth) > 0 ? [["bottom", x, round(y + height), width, style.borderBottomColor]] : []];
      });
      const marks = elements.filter(element => element.matches(marked)).map(element => {
        const style = getComputedStyle(element);
        return { box: box(element.getBoundingClientRect()), ink: [style.backgroundColor, style.color] };
      });
      return { size: box(origin).slice(2), texts, panes, hairlines, marks };
    };
    return Object.fromEntries(names.map(name => {
      const host = document.querySelector(`[data-case="${name}"]`);
      if (!host) throw new Error(`READING: no case ${name}`);
      return [name, read(host)];
    }));
  }, [cases, markSelector] as const);
}
