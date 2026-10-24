// Mechanism `reveal`, owned by view-region: brings a region into view inside its own scroll viewport and, when asked,
// focuses its heading. It never scrolls the document. ViewRegion registers it in the region registry; the shell lists it.

/** Reveal only within this workspace; never scroll the document or remount a draft. */
export function revealSearchTarget(target: HTMLElement, viewport: HTMLElement | null, focus = true): void {
  if (focus) {
    const heading = target.querySelector<HTMLElement>("h2,h3") ?? target;
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
  if (!viewport) return;
  const padding = parseFloat(getComputedStyle(viewport).scrollPaddingTop) || 0;
  viewport.scrollTo({ top: viewport.scrollTop + target.getBoundingClientRect().top
    - viewport.getBoundingClientRect().top - padding - 16, behavior: "instant" });
}
