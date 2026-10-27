// What an Action must never draw, read in the page from the boxes the browser laid out: a label that shows only part of
// itself (an ellipsis, or text clipped by the label or by its button), and a bottom pair (law 9c) whose two halves differ.
// An Action's label wraps to more lines and its button grows, as a platform button does at large text. The function runs
// inside the page (page.evaluate), so it is self-contained.

/** Every Action under `selector` (named by `label`) that shows its label but does not draw all of it, as
 * `<label>: «<name>» <how>`, and every bottom pair whose halves differ in width, height or top edge. An Action that
 * shows its icon (or its pending glyph) draws no label and is not read; neither is text the platform does not draw. */
export function clippedActions([selector, label]: readonly [string, string]): string[] {
  const found: string[] = [];
  const unseen = (element: Element | null) => {
    for (let node = element; node; node = node.parentElement) {
      const style = getComputedStyle(node), box = node.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") return true;
      if (style.overflow !== "visible" && (box.width <= 2 || box.height <= 2)) return true;
    }
    return false;
  };
  for (const scope of document.querySelectorAll(selector)) {
    const name = scope.getAttribute(label) ?? selector;
    for (const action of scope.querySelectorAll<HTMLElement>('[data-action][data-action-face="label"]')) {
      const caption = action.querySelector<HTMLElement>("[data-button-label]");
      if (!caption?.textContent?.trim() || unseen(caption)) continue;
      const what = `${name}: «${action.getAttribute("aria-label") ?? caption.textContent}»`;
      if (caption.scrollWidth > caption.clientWidth + 1 || caption.scrollHeight > caption.clientHeight + 1)
        found.push(`${what} ${getComputedStyle(caption).textOverflow === "ellipsis" ? "ends in an ellipsis" : "is clipped by its label"}`);
      const range = document.createRange();
      range.selectNodeContents(caption);
      const text = range.getBoundingClientRect(), box = action.getBoundingClientRect();
      if (text.left < box.left - 1 || text.right > box.right + 1 || text.top < box.top - 1 || text.bottom > box.bottom + 1)
        found.push(`${what} is clipped by its button (text ${Math.round(text.width)}×${Math.round(text.height)} in ${Math.round(box.width)}×${Math.round(box.height)})`);
    }
    for (const row of scope.querySelectorAll(':is([data-toolbar-purpose="commit"],[data-toolbar-purpose="steps"]) > [data-bar-row]')) {
      const halves = [...row.children].filter(child => child.matches("[data-action]")).map(child => child.getBoundingClientRect());
      if (halves.length !== 2 || unseen(row)) continue;
      const [left, right] = halves as [DOMRect, DOMRect];
      if (Math.abs(left.width - right.width) > .5 || Math.abs(left.height - right.height) > .5 || Math.abs(left.top - right.top) > .5)
        found.push(`${name}: the bottom pair's halves differ (${[left, right].map(box =>
          `${Math.round(box.width)}×${Math.round(box.height)} at ${Math.round(box.top)}`).join(" / ")})`);
    }
  }
  return found;
}
