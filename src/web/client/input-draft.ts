import type { HumanSurface, Mutation } from "../types.ts";
import type { Draft } from "../../interaction/draft.ts";

export function emptyInputDraft(surface: HumanSurface, mutation: Mutation, previous: Readonly<Draft> = {}): Draft {
  return Object.fromEntries(mutation.inputFields.map(name => {
    const options = mutation.inputSchema.properties[name]?.enum;
    const fallback = surface.fieldKinds?.[`${mutation.object}.${name}`] === "labels" ? []
      : Array.isArray(options) && typeof options[0] === "string" ? options[0] : "";
    return [name, previous[name] ?? fallback];
  }));
}
