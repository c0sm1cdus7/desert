// Popover part: Tab leaves an anchored surface at its trigger's place in the document, then the surface closes.
import { tabbable } from 'tabbable';

/** Bits Popover loops Tab even with trapFocus=false. A nonmodal utility instead
 * rejoins the document at its trigger; interior Tab order stays native. */
export function anchoredTabExit(event: KeyboardEvent, panel: HTMLElement, dismiss: () => void) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
  const inside = tabbable(panel);
  const active = panel.ownerDocument.activeElement;
  const boundary = active === panel;
  const exits = inside.length === 0 || (event.shiftKey
    ? boundary || active === inside[0]
    : active === inside.at(-1));
  if (!exits) return;
  const document = panel.ownerDocument;
  const trigger = document.querySelector<HTMLElement>(`[aria-controls="${CSS.escape(panel.id)}"]`);
  if (!trigger) return;
  const outside = tabbable(document.body).filter(element => !panel.contains(element));
  const index = outside.indexOf(trigger);
  const target = event.shiftKey ? trigger : outside[index + 1] ?? trigger;
  event.preventDefault();
  // Capture precedes the installed focus scope's bubbling loop handler.
  event.stopPropagation();
  target.focus();
  dismiss();
}
