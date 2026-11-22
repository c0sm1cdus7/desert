// Says in words the limits of a schema node that the provider's grammar cannot hold, for its description.
import type { Language } from "../../fields/languages.ts";
import { visibleText } from "../../fields/visible-text.ts";
import { schemaLimit } from "../../texts/model.texts.ts";
type Schema = Record<string, unknown>;
type Part =
  | "length"
  | "lengthMin"
  | "lengthMax"
  | "visible"
  | "pattern"
  | "format"
  | "range"
  | "rangeMin"
  | "rangeMax"
  | "above"
  | "below"
  | "multiple"
  | "items"
  | "itemsMin"
  | "itemsMax"
  | "unique";
const shown = (value: unknown) => (typeof value === "number" || typeof value === "string" ? String(value) : "");
/** One sentence per pair of bounds: both, the lower one or the upper one. */
function bounds(node: Schema, [low, high]: readonly [string, string], parts: readonly [Part, Part, Part]) {
  const [a, b] = [shown(node[low]), shown(node[high])];
  if (a && b) return [{ part: parts[0], a, b }];
  if (a) return [{ part: parts[1], a, b }];
  return b ? [{ part: parts[2], a, b }] : [];
}
/** A pattern is said by what it means when it is the house's visible text, and as itself otherwise. */
function patterned(node: Schema) {
  const pattern = shown(node.pattern);
  if (!pattern) return [];
  return [
    pattern.includes(visibleText)
      ? { part: "visible" as const, a: "", b: "" }
      : { part: "pattern" as const, a: pattern, b: "" },
  ];
}
export function limitWords(node: Schema, language: Language): string {
  const lines = [
    ...bounds(node, ["minLength", "maxLength"], ["length", "lengthMin", "lengthMax"]),
    ...patterned(node),
    ...(shown(node.format) ? [{ part: "format" as const, a: shown(node.format), b: "" }] : []),
    ...bounds(node, ["minimum", "maximum"], ["range", "rangeMin", "rangeMax"]),
    ...(shown(node.exclusiveMinimum) ? [{ part: "above" as const, a: shown(node.exclusiveMinimum), b: "" }] : []),
    ...(shown(node.exclusiveMaximum) ? [{ part: "below" as const, a: "", b: shown(node.exclusiveMaximum) }] : []),
    ...(shown(node.multipleOf) ? [{ part: "multiple" as const, a: shown(node.multipleOf), b: "" }] : []),
    ...bounds(node, ["minItems", "maxItems"], ["items", "itemsMin", "itemsMax"]),
    ...(node.uniqueItems === true ? [{ part: "unique" as const, a: "", b: "" }] : []),
  ];
  return lines.map(line => schemaLimit.text(language, line)).join(" ");
}
