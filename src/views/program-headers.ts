import type { ViewProgram } from "./program-schema.ts";

/** Bindings are opted into by the View and admitted only in the matching journey role. */
export function validateProgramHeaders(program: ViewProgram): void {
  for (const journey of program.journeys) {
    if (journey.kind === "action") continue;
    const ids = journey.kind === "activity" ? [...journey.activity.steps.map(step => step.view), journey.activity.review]
      : journey.kind === "read" ? [journey.view, journey.detailView] : [journey.view];
    for (const id of ids) {
      const title = program.views.find(view => view.id === id)?.content.find(item => item.kind === "header")?.title;
      if (!title || typeof title === "string") continue;
      if (title.kind === "greeting") {
        if (journey.kind !== "presentation") throw new Error("INVALID_VIEW_HEADER_BINDING");
      } else if (title.kind === "operation-label") {
        if (journey.kind !== "create" && journey.kind !== "update" && journey.kind !== "activity") throw new Error("INVALID_VIEW_HEADER_BINDING");
      } else if (journey.kind !== "read" || id !== journey.detailView ||
        !program.objects?.some(object => object.view === id)) {
        throw new Error("INVALID_VIEW_HEADER_BINDING");
      }
    }
  }
}
