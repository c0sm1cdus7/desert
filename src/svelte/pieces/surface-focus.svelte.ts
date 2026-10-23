import { onDestroy, tick } from 'svelte';
import { IsUsingKeyboard } from 'bits-ui';

const boundaryNavigation = new WeakMap<HTMLElement, (event: KeyboardEvent) => void>();
const entered = new WeakSet<HTMLElement>();
const opened = new WeakSet<HTMLElement>();
const generations = new WeakMap<HTMLElement, number>();
const openers = new WeakMap<HTMLElement, Element | null>();
const parents = new WeakMap<HTMLElement, HTMLElement | null>();
const closeReturns = new WeakMap<HTMLElement, Set<() => void>>();

function containingScope(target: Element | null): HTMLElement | null {
  for (let node = target; node; node = node.parentElement) {
    if (node instanceof HTMLElement && opened.has(node) && node.isConnected
      && node.getAttribute('data-state') !== 'closed') return node;
  }
  return null;
}

export function surfaceContainsFocus(surface: HTMLElement, target: Element | null): boolean {
  if (surface.contains(target)) return true;
  // A portaled descendant is still inside the opener's semantic focus scope.
  // A sibling opened from elsewhere has no such ancestry.
  for (let scope = containingScope(target); scope; scope = parents.get(scope) ?? null) {
    if (scope === surface) return true;
    if (!opened.has(scope) || !scope.isConnected || scope.getAttribute('data-state') === 'closed') return false;
  }
  return false;
}

/** One owner moves focus when a surface opens. Pointer opening must not select
 * an arbitrary action or summon a soft keyboard; keyboard opening enters the
 * semantic selection. Never scroll the page behind a transient surface. */
export function surfaceFocus(element: () => HTMLElement | null, outside?: (event: FocusEvent) => void) {
  const keyboard = new IsUsingKeyboard();
  let latest: HTMLElement | null = null;
  let pendingOpener: Element | null | undefined;
  let cycle = 0;
  let opening = 0;
  let stopOutside: (() => void) | undefined;
  function observeOutside() {
    if (!outside || stopOutside) return;
    const owner = (element() ?? latest)?.ownerDocument ?? document;
    const handle = (event: FocusEvent) => {
      const surface = element() ?? latest, requestedCycle = cycle;
      if (event.defaultPrevented || !surface || !(event.target instanceof Element)
        || surfaceContainsFocus(surface, event.target)) return;
      void tick().then(() => {
        // Focus may have moved again, or a modal scope may have contained it.
        // Deliver only the still-current native destination, never a stale exit.
        if (!stopOutside || cycle !== requestedCycle || event.defaultPrevented
          || surface !== (element() ?? latest) || !surface.isConnected
          || surface.getAttribute('data-state') === 'closed'
          || owner.activeElement !== event.target || surfaceContainsFocus(surface, owner.activeElement)) return;
        outside(event);
      });
    };
    owner.addEventListener('focusin', handle);
    stopOutside = () => { owner.removeEventListener('focusin', handle); stopOutside = undefined; };
  }
  onDestroy(() => { stopOutside?.(); cycle += 1; });
  const focus = (event: Event) => {
    event.preventDefault();
    const enterSelection = keyboard.current;
    const requested = element(), origin = document.activeElement;
    const requestedCycle = cycle;
    const generation = requested ? generations.get(requested) ?? 0 : undefined;
    void tick().then(() => {
      const surface = element();
      if (requestedCycle !== cycle) return;
      if (!surface?.isConnected || surface.getAttribute('data-state') === 'closed') return;
      if (requested && (surface !== requested || (generations.get(surface) ?? 0) !== generation)) return;
      if (entered.has(surface)) return;
      entered.add(surface); latest = surface;
      if (pendingOpener !== undefined && !openers.has(surface)) {
        parents.set(surface, containingScope(pendingOpener));
        openers.set(surface, pendingOpener); opened.add(surface);
      }
      if (document.activeElement !== origin && document.activeElement !== document.body) return;
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
  return Object.assign(focus, {
    open(event: Event, custom?: (event: Event) => void) {
      const surface = element();
      if (surface && opened.has(surface)) { event.preventDefault(); return; }
      opening += 1;
      if (pendingOpener === undefined) pendingOpener = document.activeElement;
      if (surface) {
        parents.set(surface, containingScope(pendingOpener));
        opened.add(surface); openers.set(surface, pendingOpener); latest = surface;
      }
      // Bits defers its dismissible focus listener. Arm our single semantic
      // exit owner before autofocus, so opening cannot lose an outside transfer.
      observeOutside();
      (custom ?? focus)(event);
    },
    close(event: Event, custom?: (event: Event) => void) {
      const surface = element() ?? latest;
      // Bits can re-mount its focus scope when the same open node loses its
      // starting-style attribute. That is not a user close/reopen cycle.
      if (surface?.isConnected && surface.getAttribute('data-state') === 'open') {
        event.preventDefault(); return;
      }
      const opener = surface && openers.has(surface) ? openers.get(surface) : pendingOpener;
      const active = document.activeElement;
      const ownsFocus = active === document.body || !!surface && surfaceContainsFocus(surface, active);
      const focusedScope = containingScope(active);
      const returns = surface ? closeReturns.get(surface) : undefined;
      stopOutside?.();
      if (surface) {
        entered.delete(surface); opened.delete(surface);
        openers.delete(surface); parents.delete(surface);
        closeReturns.delete(surface);
        generations.set(surface, (generations.get(surface) ?? 0) + 1);
      }
      latest = null;
      pendingOpener = undefined; cycle += 1;
      custom?.(event);
      // Scope re-registration replaces Bits' pre-focus memory. The surface
      // keeps the real opener, without taking focus back from an outside target.
      if (!event.defaultPrevented) {
        event.preventDefault();
        const closingOpening = opening;
        const restore = () => {
          const current = document.activeElement;
          if (opening !== closingOpening || !ownsFocus || (current !== document.body && current !== active
            && !surface?.contains(current) && !focusedScope?.contains(current))) return;
          if (opener instanceof HTMLElement && opener.isConnected
            && !opener.closest('[inert],[hidden]') && !opener.matches(':disabled')) opener.focus({ preventScroll: true });
        };
        if (ownsFocus && focusedScope && focusedScope !== surface) {
          // A descendant modal can still trap focus while its parent is closing.
          // Its real scope teardown completes the ancestor's return; no timer
          // or competing focus attempt is needed while the child remains open.
          const pending = closeReturns.get(focusedScope) ?? new Set<() => void>();
          pending.add(restore); closeReturns.set(focusedScope, pending);
        } else restore();
      }
      // A child's custom return remains authoritative. Ancestors only restore
      // if it did not move focus to an unrelated destination.
      returns?.forEach(restore => restore());
    },
  });
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
