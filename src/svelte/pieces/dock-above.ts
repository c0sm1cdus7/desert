export type DockAboveState = { start: number; end: number; state: 'expanded' | 'transition' | 'compact' };
/** Geometry-owned docking. Any source block can hand off to a fixed upper slot. */
export function observeDockAbove(viewport: HTMLElement, copy: HTMLElement, compact: HTMLElement,
  report: (state: DockAboveState) => void) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let startEdge = 0, end = 1, frame = 0, timer = 0, animation = 0, touching = false, userScroll = false;
  const clamp = (value: number) => Math.max(0, Math.min(1, value));
  function paint() {
    const progress = clamp((viewport.scrollTop - startEdge) / (end - startEdge));
    // The compact title is a continuation, never a second visible identity.
    // Its measured threshold is the reading block's bottom clearing the toolbar.
    const outgoing = progress < 1 ? 1 : 0;
    const incoming = progress === 1 ? 1 : 0;
    copy.style.opacity = String(outgoing);
    compact.style.opacity = String(incoming);
    compact.style.translate = reduced.matches ? 'none' : `0 ${(1 - incoming) * 6}px`;
    report({ start: startEdge, end, state: progress === 0 ? 'expanded' : progress === 1 ? 'compact' : 'transition' });
  }
  function measure() {
    // Dock above is owned by the identity block, not by its media canvas.
    const top = copy.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop;
    const railBottom = compact.parentElement!.getBoundingClientRect().bottom - viewport.getBoundingClientRect().top;
    startEdge = Math.max(0, Math.ceil(top - railBottom));
    end = startEdge + Math.max(1, copy.offsetHeight);
    paint();
  }
  function cancelAnimation() { cancelAnimationFrame(animation); animation = 0; }
  function settle() {
    clearTimeout(timer);
    // Explicit scrolling settles even while an editor retains focus. Focus-driven
    // scrolling alone never grants userScroll and cannot start a snap.
    if (!userScroll || touching || viewport.inert) return;
    const from = viewport.scrollTop;
    userScroll = false;
    if (from <= startEdge || from >= end || viewport.scrollHeight - viewport.clientHeight < end) return;
    const target = from < (startEdge + end) / 2 ? startEdge : end;
    if (reduced.matches) { viewport.scrollTop = target; paint(); return; }
    const duration = parseFloat(getComputedStyle(copy).getPropertyValue('--motion-overlay-exit')) || 180;
    const start = performance.now();
    function step(now: number) {
      const t = clamp((now - start) / duration);
      viewport.scrollTop = from + (target - from) * (1 - (1 - t) ** 3);
      paint();
      animation = t < 1 ? requestAnimationFrame(step) : 0;
    }
    animation = requestAnimationFrame(step);
  }
  function scrolled() {
    cancelAnimationFrame(frame); frame = requestAnimationFrame(paint);
    if (userScroll) { clearTimeout(timer); timer = window.setTimeout(settle, 140); }
  }
  function scheduleSettle() { clearTimeout(timer); timer = window.setTimeout(settle, 140); }
  function intent() { cancelAnimation(); userScroll = true; scheduleSettle(); }
  function wheel(event: WheelEvent) { if (event.deltaY !== 0) intent(); }
  function down(event: PointerEvent) {
    // Clicking an editor is not scroll intent. Touch and a scrollbar drag are.
    const bounds = viewport.getBoundingClientRect();
    if (event.pointerType === 'touch' || event.clientX >= bounds.left + viewport.clientWidth) {
      touching = true; intent();
    }
  }
  function up() { touching = false; if (userScroll) timer = window.setTimeout(settle, 140); }
  function key(event: KeyboardEvent) {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)
      && !(event.target instanceof Element && event.target.closest('input,textarea,select,button,[contenteditable="true"]'))) intent();
  }
  const resize = new ResizeObserver(measure);
  resize.observe(copy); if (copy.parentElement) resize.observe(copy.parentElement);
  resize.observe(viewport); resize.observe(compact);
  if (compact.parentElement) resize.observe(compact.parentElement);
  viewport.addEventListener('scroll', scrolled, { passive: true });
  viewport.addEventListener('scrollend', scheduleSettle);
  viewport.addEventListener('wheel', wheel, { passive: true });
  viewport.addEventListener('pointerdown', down, { passive: true });
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  viewport.addEventListener('keydown', key); reduced.addEventListener('change', paint);
  measure();
  return () => {
    resize.disconnect(); cancelAnimation(); cancelAnimationFrame(frame); clearTimeout(timer);
    viewport.removeEventListener('scroll', scrolled); viewport.removeEventListener('scrollend', scheduleSettle);
    viewport.removeEventListener('wheel', wheel); viewport.removeEventListener('pointerdown', down);
    window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
    viewport.removeEventListener('keydown', key); reduced.removeEventListener('change', paint);
  };
}
