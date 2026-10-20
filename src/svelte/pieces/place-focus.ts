/** Browser focus scrolling knows the viewport, not the floating rails over it.
 * Reveal in response to focus or editing; ordinary scrolling stays user-owned. */
export function observePlaceFocus(viewport: HTMLElement, owner: HTMLElement): () => void {
  let frame = 0;
  const cancel = () => { cancelAnimationFrame(frame); frame = 0; };
  const reveal = (target: HTMLElement, remaining: number) => {
    frame = 0;
    if (document.activeElement !== target || !target.isConnected || !target.getClientRects().length) return;
    const bounds = viewport.getBoundingClientRect();
    let top = bounds.top, bottom = bounds.bottom;
    for (const bar of owner.querySelectorAll<HTMLElement>('[data-toolbar]')) {
      if (bar.closest('[data-scroll-owner]') !== owner || !bar.getClientRects().length) continue;
      const rect = bar.getBoundingClientRect();
      if (bar.dataset.toolbar === 'top') top = Math.max(top, rect.bottom);
      else bottom = Math.min(bottom, rect.top);
    }
    const protection = parseFloat(getComputedStyle(viewport).getPropertyValue('--reading-protection-end')) || 0;
    top = Math.max(top, bounds.top + protection);
    // Keep the focus ring clear. Prefer revealing the complete well, including
    // its label, unless it is larger than the available reading area.
    const clearance = 8;
    top += clearance; bottom -= clearance;
    if (bottom <= top) return;
    const well = target.closest<HTMLElement>('.field-well');
    const wellBounds = well?.getBoundingClientRect();
    const rect = wellBounds && wellBounds.height <= bottom - top ? wellBounds : target.getBoundingClientRect();
    const delta = rect.top < top ? rect.top - top
      : rect.bottom > bottom ? Math.min(rect.bottom - bottom, rect.top - top) : 0;
    const before = viewport.scrollTop;
    if (Math.abs(delta) > .5) viewport.scrollTop += delta;
    // Native caret revelation may settle on the following animation frame.
    // Recheck without creating a persistent scroll loop.
    if (remaining && Math.abs(viewport.scrollTop - before) > .5)
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => reveal(target, remaining - 1)); });
  };
  const onFocus = (event: Event) => {
    cancel();
    const target = event.target;
    if (!(target instanceof HTMLElement) || target === viewport || target.closest('[data-scroll-owner]') !== owner) return;
    frame = requestAnimationFrame(() => { frame = requestAnimationFrame(() => reveal(target, 4)); });
  };
  // Native autosize/caret scrolling can move a well after focus has settled.
  const onInput = (event: Event) => { if (event.target instanceof HTMLTextAreaElement) onFocus(event); };
  viewport.addEventListener('focusin', onFocus);
  viewport.addEventListener('input', onInput);
  viewport.addEventListener('wheel', cancel, { passive: true });
  viewport.addEventListener('touchmove', cancel, { passive: true });
  return () => {
    cancel(); viewport.removeEventListener('focusin', onFocus);
    viewport.removeEventListener('input', onInput);
    viewport.removeEventListener('wheel', cancel); viewport.removeEventListener('touchmove', cancel);
  };
}
