import type { NodeEvent } from "../../interaction/node-events.ts";
import type { activityModel } from "./activity-model.ts";

export function activityEvent(model: ReturnType<typeof activityModel>, event: NodeEvent, ready: boolean) {
  const state = model.snapshot();
  if (!state.experience) return false;
  if (event.kind === "input.change") model.edit(event.name, event.value);
  else if (event.kind === "problem.close") model.dismissError();
  else if (event.kind === "transient.close") model.close();
  else if (event.kind === "transient.closed") return true;
  else if (event.kind === "surface.invoke") {
    const intent = event.intent;
    if (intent.kind === "close") model.close();
    else if (ready && !state.busy) {
      if (intent.kind === "back") void model.back();
      else if (intent.kind === "accept" && !state.uncertain) void model.accept();
      else if (intent.kind === "recover" && state.uncertain) void model.recover();
      else if (intent.kind === "journey" && intent.journey === state.experience.id && !state.prepared) void model.next();
      else throw new Error("INVALID_VIEW_EVENT");
    }
  } else throw new Error("INVALID_VIEW_EVENT");
  return true;
}
