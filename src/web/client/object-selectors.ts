import type { ViewProgram } from "../../views/program-schema.ts";
import type { HumanSurface } from "../types.ts";
import { subjectActionAvailable, type HumanState } from "./state.ts";
import type { ModelScope } from "./model-scope.ts";
import type { FrameContent } from "../../interaction/surface-frame.ts";

/** Presentation is derived from published canonical transitions; it grants no authority. */
export function objectSelectors(program: ViewProgram, view: string, surface: HumanSurface, state: HumanState,
  scope: ModelScope): NonNullable<Extract<FrameContent, { kind: "context" }>["selectors"]> {
  const actions = program.objects?.find(object => object.view === view)?.actions ?? [];
  const fields = [...new Set(actions.flatMap(action => action.selection ? [action.selection.fact.field] : []))];
  return fields.map(field => {
    const selected = actions.filter(action => action.selection?.fact.field === field);
    const object = selected[0]!.selection!.fact.object;
    const value = state.detail?.facts[field];
    return { field, label: surface.language.fields[`${object}.${field}`]!, value: typeof value === "string" ? value : null,
      disabled: state.busy || state.uncertain || !state.detail,
      options: selected.map(action => ({ value: action.selection!.value, label: action.selection!.label, journey: action.journey,
        available: subjectActionAvailable(surface, state, action.journey, undefined, undefined, scope) })) };
  });
}
