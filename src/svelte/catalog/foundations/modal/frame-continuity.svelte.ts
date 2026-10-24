// The DOM half of frame continuity (design §1.6): when the frame a modal shows is replaced, focus and the reading
// position stay with the modal without reopening it, and Back or Close returns focus to the command that left the frame.
// The nonvisual half, a main-view action entering a retained panel once, is infra/frame-activation.ts: this part only
// observes its activations (where focus was, and whether it moved away before the frame changed).
import { tick } from "svelte";
import { useFrameActivation } from "../../../infra/frame-activation.ts";
import { surfaceContainsFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";

/** The frame the modal shows and, while it shows an object's reading, that reading's identity (string tokens). */
export type FrameIdentity = Readonly<{ frame: string; reading?: string | undefined }>;
/** What the caller is about to do: leave the frame back or closed ("close"), or anything else ("other"). */
export type FrameInvocation = "close" | "other";

const contentSlot = '[data-surface-slot="content"]';

/** Remembers each activation's origin until it ends; an interaction elsewhere before the frame changes cancels it. */
function activationOrigins() {
  const origins = new Map<string, Element>();
  const activations = useFrameActivation();
  $effect(() => activations?.observe(start => {
    const origin = document.activeElement;
    if (!origin) { start.cancel(); return; }
    const cancel = (event: Event) => { if (event.type === "pointerdown" || event.target !== origin) start.cancel(); };
    origins.set(start.id, origin);
    document.addEventListener("focusin", cancel, true); document.addEventListener("pointerdown", cancel, true);
    return () => {
      document.removeEventListener("focusin", cancel, true); document.removeEventListener("pointerdown", cancel, true);
      origins.delete(start.id);
    };
  }));
  return { take: (previous: string | undefined, next: string | undefined) => {
    const claim = activations?.take(previous, next);
    return claim && { ...claim, origin: origins.get(claim.id) };
  } };
}

/** A replaced frame keeps its focus ownership and its reading position without reopening its surface. */
export function frameContinuity(boundary: () => HTMLElement | null, identity: () => FrameIdentity | undefined) {
  const activations = activationOrigins();
  let previous: string | undefined, previousSurface: HTMLElement | null = null, previousReading: string | undefined;
  let liveReading: { identity: string; viewport: HTMLElement; top: number } | undefined;
  let suspended: { identity: string; top: number } | undefined;
  let revision = 0, heldFocus = false, pressed: string | undefined, returning: string | undefined;
  /** Commands that left a frame, newest last; Back or Close returns to the newest one. */
  const origins: (string | undefined)[] = [];
  const rememberReading = () => { if (liveReading?.viewport.isConnected) liveReading.top = liveReading.viewport.scrollTop; };
  $effect(() => {
    const surface = boundary();
    if (!surface) return;
    const owner = surface.ownerDocument;
    const focus = (event: FocusEvent) => { heldFocus = event.target instanceof Element && surfaceContainsFocus(surface, event.target); };
    const pointer = (event: PointerEvent) => {
      rememberReading();
      if (!(event.target instanceof Element) || !surfaceContainsFocus(surface, event.target)) heldFocus = false;
    };
    // The command a person activates (pointer or keyboard both click) is the one Back returns to.
    const click = (event: MouseEvent) => {
      const command = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-toolbar-command]") : null;
      pressed = command && surface.contains(command) ? command.dataset.toolbarCommand : undefined;
    };
    const scroll = (event: Event) => { if (event.target === liveReading?.viewport) rememberReading(); };
    owner.addEventListener("focusin", focus); owner.addEventListener("pointerdown", pointer); owner.addEventListener("click", click, true);
    owner.addEventListener("keydown", rememberReading, true); owner.addEventListener("scroll", scroll, true);
    return () => {
      owner.removeEventListener("focusin", focus); owner.removeEventListener("pointerdown", pointer); owner.removeEventListener("click", click, true);
      owner.removeEventListener("keydown", rememberReading, true); owner.removeEventListener("scroll", scroll, true);
      heldFocus = false; liveReading = undefined;
    };
  });
  $effect.pre(() => {
    const current = identity(), next = current?.frame, reading = current?.reading, surface = boundary();
    if (next === previous && reading === previousReading && surface === previousSurface) return;
    const changed = next !== previous, hadFrame = previous !== undefined, issued = ++revision;
    const activation = activations.take(previous, next);
    // A new surface element is a new opening: the commands of an earlier one are not returned to.
    if (surface !== previousSurface) origins.length = 0;
    previous = next; previousSurface = surface;
    const active = document.activeElement;
    rememberReading();
    if (previousReading && previousReading !== reading) {
      suspended = { identity: previousReading, top: liveReading?.identity === previousReading ? liveReading.top : 0 };
    }
    if (reading && suspended?.identity !== reading) suspended = undefined;
    const restore = reading && suspended?.identity === reading ? suspended.top : undefined;
    previousReading = reading;
    // Parent effects can replace the keyed DOM before this effect runs. The live frame's event-owned lease survives
    // removal, but not outside focus.
    const ownsFocus = Boolean(surface && (surfaceContainsFocus(surface, active)
      || active === document.body && heldFocus || activation?.current() && activation.origin === active));
    const command = returning;
    returning = undefined;
    void tick().then(() => {
      if (issued !== revision || identity()?.frame !== next || surface !== boundary() || !surface?.isConnected
        || surface.getAttribute("data-state") !== "open") return;
      if (restore !== undefined) {
        surface.querySelector<HTMLElement>(contentSlot)?.scrollTo({ top: restore, behavior: "instant" });
        suspended = undefined;
      }
      const viewport = surface.querySelector<HTMLElement>(contentSlot);
      liveReading = reading && viewport ? { identity: reading, viewport, top: viewport.scrollTop } : undefined;
      if (!hadFrame || !changed || !ownsFocus || activation && !activation.current()) return;
      const focused = document.activeElement;
      if (focused !== active && focused !== document.body) return;
      focusTarget(surface, command)?.focus({ preventScroll: true });
    }).finally(() => activation?.finish());
  });
  return {
    note(invocation: FrameInvocation) {
      const command = pressed;
      pressed = undefined;
      if (invocation === "other") { origins.push(command); return; }
      returning = origins.pop();
      const surface = boundary(), active = document.activeElement;
      // A scrim is the surface's dismissal target, not a new focus owner.
      if (surface && (active === document.body || surfaceContainsFocus(surface, active))) heldFocus = true;
    },
  };
}

/** The command Back returns to when the new frame still offers it, else the frame itself. */
function focusTarget(surface: HTMLElement, command: string | undefined): HTMLElement | null {
  const frame = surface.querySelector<HTMLElement>("[data-surface-frame]");
  const wrapper = command === undefined ? undefined : [...surface.querySelectorAll<HTMLElement>("[data-toolbar-command]")]
    .find(element => element.dataset.toolbarCommand === command);
  const action = wrapper?.querySelector<HTMLButtonElement>("button:not(:disabled)");
  return action && !action.closest('[hidden],[inert],[aria-hidden="true"]') ? action : frame;
}
