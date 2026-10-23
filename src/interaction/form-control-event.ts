import type { FileInputEvent } from "./image-input.ts";
import type { LabelsInputEvent, ReferenceEvent } from "./labels-control.ts";
import type { RelatedSelectionEvent } from "./related-selection.ts";

export type FormControlEvent = FileInputEvent | LabelsInputEvent | ReferenceEvent | RelatedSelectionEvent;
export function isFormControlEvent(event: { kind: string }): event is FormControlEvent {
  return event.kind === "files.choose" || event.kind === "files.remove" || event.kind === "labels.change" || event.kind.startsWith('reference.') ||
    event.kind === "related.change" || event.kind === "related.recover";
}
