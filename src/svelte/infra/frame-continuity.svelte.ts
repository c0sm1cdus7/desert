import { getContext, onDestroy, setContext, tick } from "svelte";
import { intentKey, type SurfaceIntent } from "../../interaction/intent.ts";
import type { SurfaceFrame } from "../../interaction/surface-frame.ts";
import { surfaceContainsFocus } from "./surface-focus.svelte.ts";

type Activation = { origin: Element; current: () => boolean; finish: () => void };
const activationKey = Symbol("retained-frame-activation");
type FrameActivation = { take: (previous: object | undefined, next: object | undefined) => Activation | undefined };

/** A main-view action can enter a retained panel once; later observations cannot. */
export function provideFrameActivation() {
  let pending: { previous: object; origin: Element; claimed: boolean; clear: () => void } | undefined;
  onDestroy(() => pending?.clear());
  setContext<FrameActivation>(activationKey, { take(previous, next) {
    const entry = pending;
    if (!entry || entry.previous !== previous || next === previous) return;
    entry.claimed = true;
    return { origin: entry.origin, current: () => pending === entry, finish: entry.clear };
  } });
  return (previous: object, invoke: () => void) => {
    pending?.clear();
    const origin = document.activeElement;
    if (!origin) { invoke(); return; }
    const clear = () => {
      document.removeEventListener("focusin", cancel, true); document.removeEventListener("pointerdown", cancel, true);
      if (pending === entry) pending = undefined;
    };
    const cancel = (event: Event) => { if (event.type === "pointerdown" || event.target !== origin) clear(); };
    const entry = { previous, origin, claimed: false, clear };
    pending = entry;
    document.addEventListener("focusin", cancel, true); document.addEventListener("pointerdown", cancel, true);
    try { invoke(); } catch (error) { clear(); throw error; }
    void tick().then(() => { if (!entry.claimed) clear(); });
  };
}

/** A replaced frame keeps its focus ownership without reopening its surface. */
export function frameContinuity(boundary: () => HTMLElement | null,
  identity: () => object | undefined, frame: () => SurfaceFrame, readingIdentity: () => string | undefined) {
  const activations = getContext<FrameActivation | undefined>(activationKey);
  let previous: object | undefined;
  let previousSurface: HTMLElement | null = null;
  let previousReading: string | undefined;
  let liveReading: { identity: string; viewport: HTMLElement; top: number } | undefined;
  let suspended: { identity: string; top: number } | undefined;
  let revision = 0;
  let origin: string | undefined;
  let returning: string | undefined;
  let heldFocus = false;
  const rememberReading = () => {
    if (liveReading?.viewport.isConnected) liveReading.top = liveReading.viewport.scrollTop;
  };
  $effect(() => {
    const surface = boundary();
    if (!surface) return;
    const owner = surface.ownerDocument;
    const focus = (event: FocusEvent) => {
      heldFocus = event.target instanceof Element && surfaceContainsFocus(surface, event.target);
    };
    const pointer = (event: PointerEvent) => {
      rememberReading();
      if (!(event.target instanceof Element) || !surfaceContainsFocus(surface, event.target)) heldFocus = false;
    };
    const scroll = (event: Event) => { if (event.target === liveReading?.viewport) rememberReading(); };
    owner.addEventListener("focusin", focus); owner.addEventListener("pointerdown", pointer);
    owner.addEventListener("keydown", rememberReading, true); owner.addEventListener("scroll", scroll, true);
    return () => {
      owner.removeEventListener("focusin", focus); owner.removeEventListener("pointerdown", pointer);
      owner.removeEventListener("keydown", rememberReading, true); owner.removeEventListener("scroll", scroll, true);
      heldFocus = false; liveReading = undefined;
    };
  });
  $effect.pre(() => {
    const next = identity(), reading = readingIdentity(), surface = boundary();
    if (next === previous && reading === previousReading && surface === previousSurface) return;
    const changed = next !== previous;
    const hadFrame = previous !== undefined, current = ++revision;
    const activation = activations?.take(previous, next);
    previous = next; previousSurface = surface;
    const active = document.activeElement;
    rememberReading();
    if (previousReading && previousReading !== reading) {
      suspended = { identity: previousReading, top: liveReading?.identity === previousReading ? liveReading.top : 0 };
    }
    if (reading && suspended?.identity !== reading) suspended = undefined;
    const restore = reading && suspended?.identity === reading ? suspended.top : undefined;
    previousReading = reading;
    // Parent effects can replace the keyed DOM before this effect runs. The
    // live frame's event-owned lease survives removal, but not outside focus.
    const ownsFocus = Boolean(surface && (surfaceContainsFocus(surface, active)
      || active === document.body && heldFocus || activation?.current() && activation.origin === active));
    const command = returning;
    returning = undefined;
    if (command && frame().kind === "context") origin = undefined;
    void tick().then(() => {
      if (current !== revision || identity() !== next || surface !== boundary() || !surface?.isConnected
        || surface.getAttribute("data-state") !== "open") return;
      if (restore !== undefined) {
        surface.querySelector<HTMLElement>('[data-surface-slot="content"]')?.scrollTo({ top: restore, behavior: "instant" });
        suspended = undefined;
      }
      const viewport = surface.querySelector<HTMLElement>('[data-surface-slot="content"]');
      liveReading = reading && viewport ? { identity: reading, viewport, top: viewport.scrollTop } : undefined;
      if (!hadFrame || !changed || !ownsFocus || activation && !activation.current()) return;
      const focused = document.activeElement;
      if (focused !== active && focused !== document.body) return;
      const nextFrame = surface.querySelector<HTMLElement>("[data-surface-frame]");
      const wrapper = command && [...surface.querySelectorAll<HTMLElement>("[data-toolbar-command]")]
        .find(element => element.dataset.toolbarCommand === command);
      const action = wrapper && wrapper.querySelector<HTMLButtonElement>("button:not(:disabled)");
      const target = action && !action.closest('[hidden],[inert],[aria-hidden="true"]') ? action : nextFrame;
      target?.focus({ preventScroll: true });
    }).finally(() => activation?.finish());
  });
  return {
    invoking(intent: SurfaceIntent) {
      if (frame().kind === "context" && intent.kind === "journey") origin = intentKey(intent);
      else if (intent.kind === "back" || intent.kind === "close") {
        returning = origin;
        const surface = boundary(), active = document.activeElement;
        // A scrim is the surface's dismissal target, not a new focus owner.
        if (surface && (active === document.body || surfaceContainsFocus(surface, active))) heldFocus = true;
      }
      else if (intent.kind === "accept") { origin = undefined; returning = undefined; }
    },
  };
}
