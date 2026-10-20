/** Reveal only within this workspace; never scroll the document or remount a draft. */
export function revealSearchTarget(target: HTMLElement, viewport: HTMLElement | null): void {
  const heading = target.querySelector<HTMLElement>("h2,h3") ?? target;
  heading.tabIndex = -1;
  heading.focus({ preventScroll: true });
  if (!viewport) return;
  const padding = parseFloat(getComputedStyle(viewport).scrollPaddingTop) || 0;
  viewport.scrollTo({ top: viewport.scrollTop + target.getBoundingClientRect().top
    - viewport.getBoundingClientRect().top - padding - 16, behavior: "instant" });
}
