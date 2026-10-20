import { createAttachmentKey } from "svelte/attachments";

// One attachment key survives prop composition, including a custom child Button.
export const pressFeedbackProps = { [createAttachmentKey()]: pressFeedback };

// Visual feedback only. Native click, keyboard activation and pointer capture remain untouched.
export function pressFeedback(element: HTMLElement) {
  let pointer: number | null = null;
  let inside = false;
  let keyboard = false;
  const enabled = () => !element.matches(":disabled,[aria-disabled=true]");
  const sync = () => {
    if (enabled() && (keyboard || (pointer !== null && inside))) element.dataset.pressed = keyboard ? "keyboard" : "pointer";
    else delete element.dataset.pressed;
  };
  const release = () => { pointer = null; inside = false; keyboard = false; sync(); };
  const blur = () => { keyboard = false; sync(); };
  const windowblur = (event: Event) => { if (event.target === window) release(); };
  const keydown = (event: KeyboardEvent) => {
    if ((event.key === " " || event.key === "Enter") && enabled()) { keyboard = true; sync(); }
  };
  const keyup = (event: KeyboardEvent) => { if (event.key === " " || event.key === "Enter") blur(); };
  const pointerdown = (event: PointerEvent) => {
    if (event.isPrimary && event.button === 0 && enabled()) { pointer = event.pointerId; inside = true; sync(); }
  };
  const pointerend = (event: PointerEvent) => {
    if (event.pointerId === pointer) { pointer = null; inside = false; sync(); }
  };
  const pointermove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!(event.buttons & 1)) { pointerend(event); return; }
    const box = element.getBoundingClientRect();
    inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    sync();
  };
  const pointerleave = (event: PointerEvent) => {
    if (event.target === element && event.pointerId === pointer) { inside = false; sync(); }
  };
  const listeners: [EventTarget, string, EventListener][] = [
    [element, "keydown", keydown as EventListener], [element, "blur", blur],
    [element, "pointerdown", pointerdown as EventListener], [element, "pointerleave", pointerleave as EventListener],
    [element, "pointerenter", pointermove as EventListener],
    [element, "lostpointercapture", pointerend as EventListener],
    [window, "keyup", keyup as EventListener], [window, "blur", windowblur],
    [window, "pointerup", pointerend as EventListener], [window, "pointercancel", pointerend as EventListener],
    [window, "pointermove", pointermove as EventListener],
  ];
  for (const [target, event, listener] of listeners) target.addEventListener(event, listener, true);
  return () => {
    for (const [target, event, listener] of listeners) target.removeEventListener(event, listener, true);
    release();
  };
}
