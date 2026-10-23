import { toolbarBounds } from './toolbar-bounds.ts';

/** Accepted R2: protect compact identity without a hard paint boundary or a
 * second material. Called by docking updates, never by a persistent frame loop. */
export function toolbarReadingBoundary(viewport: HTMLElement, compact: HTMLElement) {
  let progress = 0, core = 0;
  const previousMask = viewport.style.maskImage;
  const guard = (event: MouseEvent) => {
    // A CSS mask changes paint, not hit testing. Suppress only pointer activation
    // in the fully invisible core; keyboard activation and scrolling stay native.
    if (progress !== 1 || event.detail === 0 && event.type !== 'contextmenu') return;
    if (event.clientY >= viewport.getBoundingClientRect().top + core) return;
    event.preventDefault(); event.stopImmediatePropagation();
  };
  const events = ['mousedown', 'click', 'dblclick', 'contextmenu'] as const;
  for (const event of events) viewport.addEventListener(event, guard, true);
  function paint(value: number) {
    progress = value;
    const toolbar = compact.closest<HTMLElement>('[data-toolbar]') ?? compact.parentElement!;
    core = Math.max(0, toolbarBounds(toolbar).bottom - viewport.getBoundingClientRect().top);
    const owner = viewport.closest<HTMLElement>('[data-scroll-owner]') ?? viewport;
    const feather = parseFloat(getComputedStyle(owner).getPropertyValue('--scroll-edge-feather')) || 32;
    const stops = Array.from({ length: 9 }, (_, index) => {
      const t = index / 8, alpha = 1 - progress + progress * t * t * (3 - 2 * t);
      return `rgb(0 0 0 / ${alpha}) ${core + feather * t}px`;
    });
    viewport.style.maskImage = progress ? `linear-gradient(to bottom,${stops.join(',')})` : previousMask;
    // Focus must clear the complete transition, not merely the toolbar box.
    if (progress) viewport.style.setProperty('--reading-protection-end', `${core + feather}px`);
    else viewport.style.removeProperty('--reading-protection-end');
  }
  return { paint, dispose() {
    viewport.style.maskImage = previousMask;
    viewport.style.removeProperty('--reading-protection-end');
    for (const event of events) viewport.removeEventListener(event, guard, true);
  } };
}
