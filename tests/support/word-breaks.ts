// What a narrow page at large text must never draw, read in the page from the glyphs the browser laid out: a word broken
// across two lines without its hyphen, and a page or a scroller that scrolls sideways. The functions run inside the page
// (page.evaluate), so each is self-contained.
import type { Page } from "playwright";

/** The text size of a phone set to its largest text, and the width of the narrowest phone the platform lays out. */
export const largeText = "200%", narrowWidth = 320;

/** Sets the root text size (every type role is in rem) and waits for fonts, motion and two frames. */
export async function sizeText(page: Page, size: string) {
  await page.evaluate(async value => {
    document.documentElement.style.setProperty("font-size", value);
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getComputedTiming().iterations !== Infinity)
      .map(animation => animation.finished.catch(() => undefined)));
    for (let frame = 0; frame < 4; frame++) await new Promise(requestAnimationFrame);
  }, size);
}

/** Every word under `selector` whose line ends between two of its letters without drawing a hyphen there, as
 * `<label>: «before / after»`; `label` names each match by an attribute it carries. Text the platform does not draw for
 * the eye (hidden, or clipped to a pixel as a screen-reader-only label is) is not read. */
export function brokenWords([selector, label]: readonly [string, string]): string[] {
  const found: string[] = [], letter = /\p{L}/u;
  const unseen = (element: Element | null) => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return true;
      if (style.overflow !== "visible" && (box.width <= 2 || box.height <= 2)) return true;
    }
    return false;
  };
  for (const scope of document.querySelectorAll(selector)) {
    const name = scope.getAttribute(label) ?? selector, walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      if (!/\p{L}\p{L}/u.test(node.data) || unseen(node.parentElement)) continue;
      const range = document.createRange(), tops: number[] = [];
      for (let at = 0; at < node.length; at++) {
        range.setStart(node, at); range.setEnd(node, at + 1);
        tops.push(Math.round([...range.getClientRects()].at(-1)?.top ?? Number.NaN));
      }
      range.selectNodeContents(node);
      const boxes = [...range.getClientRects()], em = parseFloat(getComputedStyle(node.parentElement!).fontSize);
      for (let at = 1; at < node.length; at++) {
        const before = tops[at - 1]!, after = tops[at]!;
        if (!Number.isFinite(before) || !Number.isFinite(after) || before === after) continue;
        if (!letter.test(node.data[at - 1]!) || !letter.test(node.data[at]!)) continue;
        range.setStart(node, at - 1); range.setEnd(node, at);
        // A hyphenated line draws its hyphen as a box of its own, right after the line's last letter and narrower than a letter.
        const last = [...range.getClientRects()][0]!;
        if (boxes.some(box => Math.abs(box.top - last.top) < 2 && box.left >= last.left + 1 && box.width > 0 && box.width < em * .6)) continue;
        let start = at - 1, end = at;
        while (start > 0 && letter.test(node.data[start - 1]!)) start--;
        while (end < node.length && letter.test(node.data[end]!)) end++;
        found.push(`${name}: «${node.data.slice(start, at)} / ${node.data.slice(at, end)}»`);
      }
    }
  }
  return found;
}

/** The page, every element under `selector` (named by `label`) whose content is wider than it, and every scroller that
 * scrolls sideways, as `<label>: <what>`. */
export function sidewaysScroll([selector, label]: readonly [string, string]): string[] {
  const found: string[] = [], root = document.documentElement;
  if (root.scrollWidth > root.clientWidth + 1) found.push(`page: ${root.scrollWidth}px wide in ${root.clientWidth}px`);
  const describe = (element: Element) => [element.tagName.toLowerCase(), ...["data-slot", "data-piece", "data-row", "data-view-item"]
    .flatMap(name => element.hasAttribute(name) ? [`[${name}=${element.getAttribute(name)}]`] : [])].join("");
  for (const scope of document.querySelectorAll(selector)) {
    const name = scope.getAttribute(label) ?? selector;
    if (scope.scrollWidth > scope.clientWidth + 1) found.push(`${name}: ${scope.scrollWidth}px wide in ${scope.clientWidth}px`);
    for (const element of scope.querySelectorAll("*")) {
      // A rail scrolls sideways on purpose: a labelled region (Inline's scroll overflow) the person pans through.
      if (element.matches('[role="region"][aria-label]')) continue;
      const style = getComputedStyle(element);
      if (/(auto|scroll)/.test(style.overflowX) && element.scrollWidth > element.clientWidth + 1)
        found.push(`${name}: ${describe(element)} scrolls sideways (${element.scrollWidth}px in ${element.clientWidth}px)`);
    }
  }
  return found;
}
