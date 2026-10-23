import type { HumanSurface } from "../web/types.ts";
import type { FactsContent } from "./surface-frame.ts";
import { requireFieldRepresentation } from "../field-representation.ts";
import type { FactValue, Facts } from "../fact-values.ts";
import type { ReferenceState } from './labels-control.ts';

type PresentedValue = FactValue | null | undefined;
const blank = (value: PresentedValue) => typeof value === "string" && value.trim().length === 0 || Array.isArray(value) && value.length === 0;
/** Bridge absent fact keys and information's null sentinel only at presentation. */
export const factState = (value: PresentedValue) => value == null ? "unknown" : blank(value) ? "empty" : "known";
/** Hide only confirmed empty fields in object reading. Reviews still expose deletions. */
export const readingFields = (fields: readonly string[], facts: Readonly<Facts>) =>
  fields.filter(field => !Object.hasOwn(facts, field) || factState(facts[field]) !== "empty");
/** Presentation fallbacks never normalize, validate or rewrite the stored value. */
export const presentFact = (value: PresentedValue) => {
  const state = factState(value);
  return state === "unknown" ? "Unknown" : state === "empty" ? "Empty" : Array.isArray(value) ? "Labels" : typeof value === "object" ? "Image" : String(value);
};
export const presentTitle = (value: FactValue | undefined) => {
  if (typeof value === "object") throw new Error("ASSET_CANNOT_BE_TITLE");
  return value === undefined ? "Unknown" : blank(value) ? "Untitled" : String(value);
};

/** Reading follows the published fact representation, independently of editing authority. */
export function presentFacts(surface: HumanSurface, object: string, fields: readonly string[],
  facts: Readonly<Facts>, references:Readonly<Record<string,ReferenceState>>={}): FactsContent {
  const images = fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "image");
  const tags = fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "tags");
  return { kind: "facts", object, fields, labels: surface.language.fields,
    facts: Object.fromEntries(fields.filter(field => Object.hasOwn(facts, field)).map(field => [field, facts[field]!])),
    multiline: fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "paragraphs"),
    ...(images.length ? { images } : {}),
    ...(tags.length ? { tags } : {}),
    ...(tags.some(field => surface.fieldReferences?.[`${object}.${field}`]) ? {references:Object.fromEntries(tags
      .filter(field => surface.fieldReferences?.[`${object}.${field}`]).map(field => [field,references[`${object}.${field}`]?.options ?? []]))} : {}),
  };
}
