import { tick } from 'svelte';
import { IsUsingKeyboard } from 'bits-ui';

const boundaryNavigation = new WeakMap<HTMLElement, (event: KeyboardEvent) => void>();

/** One owner moves focus when a surface opens. Pointer opening must not select
 * an arbitrary action or summon a soft keyboard; keyboard opening enters the
 * semantic selection. Never scroll the page behind a transient surface. */
export function surfaceFocus(element: () => HTMLElement | null) {
  const keyboard = new IsUsingKeyboard();
  return (event: Event) => {
    event.preventDefault();
    const enterSelection = keyboard.current;
    void tick().then(() => {
      const surface = element();
      if (!surface?.isConnected || surface.getAttribute('data-state') === 'closed') return;
      const candidate = (selector: string) => [...surface.querySelectorAll<HTMLElement>(selector)]
        .find(element => element.checkVisibility({ checkVisibilityCSS: true })
          && !element.closest('[inert],[aria-hidden="true"],[hidden]')
          && !element.matches(':disabled,[aria-disabled="true"],input[type="hidden"]'));
      const selected = candidate('[data-calendar-day][tabindex="0"], [role="option"][aria-selected="true"]');
      const first = candidate('[role="option"]') ?? candidate('input,textarea')
        ?? candidate('button:not([data-drawer-grip])');
      const target = enterSelection ? selected ?? first ?? surface : surface;
      target.focus({ preventScroll: true });
      if (document.activeElement !== target) surface.focus({ preventScroll: true });
      revealSurfaceFocus(target, surface);
      // Pointer opening parks focus on the boundary. If the next interaction is
      // keyboard navigation, enter its composite widget and let that widget
      // own arrows/Home/End/typeahead; the boundary never commits a value.
      const previous = boundaryNavigation.get(surface);
      if (previous) surface.removeEventListener('keydown', previous);
      const navigate = (event: KeyboardEvent) => {
        if (event.target !== surface || event.ctrlKey || event.altKey || event.metaKey) return;
        if (!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key)
          && !(event.key.length === 1 && event.key !== ' ')) return;
        const composite = selected ?? surface.querySelector<HTMLElement>('[role="option"]:not([aria-disabled="true"])');
        if (!composite) return;
        event.preventDefault();
        composite.focus({ preventScroll: true });
        composite.dispatchEvent(new KeyboardEvent('keydown', { key: event.key, bubbles: true, cancelable: true }));
        revealSurfaceFocus(document.activeElement as HTMLElement, surface);
      };
      boundaryNavigation.set(surface, navigate);
      surface.addEventListener('keydown', navigate);
    });
  };
}

export function revealSurfaceFocus(target: HTMLElement, boundary: HTMLElement): void {
  for (let parent = target.parentElement; parent && boundary.contains(parent); parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const pane = parent.getBoundingClientRect(), item = target.getBoundingClientRect();
    const delta = (start: number, end: number, low: number, high: number) =>
      start < low + 4 ? start - low - 4 : end > high - 4 ? end - high + 4 : 0;
    if (/(auto|scroll)/.test(style.overflowY)) parent.scrollTop += delta(item.top, item.bottom, pane.top, pane.bottom);
    if (/(auto|scroll)/.test(style.overflowX)) parent.scrollLeft += delta(item.left, item.right, pane.left, pane.right);
    if (parent === boundary) break;
  }
}
