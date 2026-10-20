import type { HumanSurface } from "../web/types.ts";
import type { FactsContent } from "./surface-frame.ts";

type FactValue = string | number | null | undefined;
const blank = (value: FactValue) => typeof value === "string" && value.trim().length === 0;
/** Bridge absent fact keys and information's null sentinel only at presentation. */
export const factState = (value: FactValue) => value == null ? "unknown" : blank(value) ? "empty" : "known";
/** Presentation fallbacks never normalize, validate or rewrite the stored value. */
export const presentFact = (value: FactValue) => {
  const state = factState(value);
  return state === "unknown" ? "Unknown" : state === "empty" ? "Empty" : String(value);
};
export const presentTitle = (value: string | number | undefined) => value === undefined ? "Unknown" : blank(value) ? "Untitled" : String(value);

/** The field's declared multiline need owns both editing and reading, without name heuristics. */
export function presentFacts(surface: HumanSurface, object: string, fields: readonly string[],
  facts: Readonly<Record<string, string | number>>): FactsContent {
  return { kind: "facts", object, fields, labels: surface.language.fields,
    facts: Object.fromEntries(fields.filter(field => Object.hasOwn(facts, field)).map(field => [field, facts[field]!])),
    multiline: fields.filter(field => surface.inputs?.[`${object}.${field}`] === "input.multiline"),
  };
}
