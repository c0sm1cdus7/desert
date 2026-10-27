import type { NodeEvent } from "../../src/interaction/node-events.ts";
import type { viewProgramModel } from "../../src/web/client/view-program.ts";
import { bindViewEvents } from "../../src/web/client/view-events.ts";

/** Captures the event dispatcher belonging to the currently rendered instance. */
export function captureViewEvents(model: ReturnType<typeof viewProgramModel>): (event: NodeEvent) => void {
  const snapshot = model.snapshot();
  return bindViewEvents(snapshot.panel?.owner ?? snapshot.resolved.owner, model.event);
}
