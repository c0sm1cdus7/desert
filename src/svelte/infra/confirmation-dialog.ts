// The dialog a confirmation frame asks with (DESIGN §3.2): its title and message over its secondary and primary choices.
// Dismissing the dialog (Escape, the scrim) chooses the secondary choice, and only while that choice is ready.
import type { SurfaceFrame } from "../../interaction/surface-frame.ts";
import type { SurfaceIntent } from "../../interaction/intent.ts";

export type ConfirmationFrame = Extract<SurfaceFrame, { kind: "confirmation" }>;

/** The dialog content of a confirmation frame: its title, its message as the subtitle, its face and its two choices. */
export function confirmationDialog(frame: ConfirmationFrame) {
  return { title: frame.top.title, subtitle: frame.content.text, face: frame.top.face,
    primary: frame.bottom.primary, secondary: frame.bottom.secondary };
}

/** What dismissing the confirmation chooses: its secondary choice's intent while it is ready, else nothing. */
export function confirmationDismissal(frame: ConfirmationFrame): SurfaceIntent | undefined {
  const secondary = frame.bottom.secondary;
  return secondary?.state === "ready" ? secondary.intent : undefined;
}
