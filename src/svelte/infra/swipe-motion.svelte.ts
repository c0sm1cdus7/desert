import { Spring, prefersReducedMotion } from "svelte/motion";
import { hapticFeedback } from "./haptic-feedback.ts";

type Edge = "left" | "right" | "bottom";
type Options = { edge: () => Edge; enabled: () => boolean; commit: () => void; threshold?: () => number };

/** Direct manipulation until release; a cancelled gesture never invokes an action. */
export function swipeMotion({ edge, enabled, commit, threshold = () => 100 }: Options) {
  const offset = new Spring(0, { stiffness: .2, damping: .9, precision: .1 });
  let pointer = $state<number | null>(null);
  let element: HTMLElement | null = null;
  let start = 0, crossStart = 0, origin = 0, direction: Edge = "bottom";
  let moved = false, distance = 0;
  let dragging = $state(false);
  const axis = (event: PointerEvent) => direction === "bottom" ? event.clientY : event.clientX;
  const cross = (event: PointerEvent) => direction === "bottom" ? event.clientX : event.clientY;
  const sign = () => direction === "left" ? -1 : 1;
  function release() {
    const id = pointer; pointer = null; dragging = false;
    if (id !== null && element?.hasPointerCapture(id)) element.releasePointerCapture(id);
  }
  function cancel() { release(); void offset.set(0, { instant: prefersReducedMotion.current }); }
  return {
    get offset() { return offset.current; },
    get tracking() { return pointer !== null; },
    get dragging() { return dragging; },
    get progress() { return Math.min(1, offset.current / threshold()); },
    get transform() { return edge() === "bottom" ? `translateY(${offset.current}px)` : `translateX(${offset.current * (edge() === "left" ? -1 : 1)}px)`; },
    down(event: PointerEvent) {
      if (!enabled() || event.button !== 0 || pointer !== null) return;
      direction = edge(); pointer = event.pointerId; element = event.currentTarget as HTMLElement;
      start = axis(event); crossStart = cross(event); origin = offset.current; distance = origin; moved = false;
      element.setPointerCapture(pointer);
    },
    move(event: PointerEvent) {
      if (pointer !== event.pointerId) return;
      if (!enabled() || edge() !== direction) { cancel(); return; }
      const along = (axis(event) - start) * sign(), across = Math.abs(cross(event) - crossStart);
      if (!dragging && across > 6 && across > Math.abs(along)) { moved = true; cancel(); return; }
      if (!dragging && Math.abs(along) <= 6) return;
      if (!dragging) hapticFeedback("drag-start");
      dragging = true; moved = true; distance = Math.max(0, origin + along);
      if (event.cancelable) event.preventDefault();
      void offset.set(distance, { instant: true });
    },
    up(event: PointerEvent) {
      if (pointer !== event.pointerId) return;
      const accepted = dragging && enabled() && distance >= threshold();
      release();
      if (accepted) { hapticFeedback("drag-release"); commit(); }
      else void offset.set(0, { instant: prefersReducedMotion.current });
    },
    click() { if (!moved && enabled()) commit(); moved = false; },
    cancel,
    lost(event: PointerEvent) { if (pointer === event.pointerId) cancel(); },
    reset() { release(); moved = false; void offset.set(0, { instant: true }); },
  };
}
