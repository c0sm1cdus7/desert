import type { HumanSurface, Mutation } from "../web/types.ts";
import { presentFact } from "./fact-presentation.ts";
import { sameFact, type Facts as FactValues } from "../fact-values.ts";

type Facts = Readonly<FactValues>;
/** Compare only exposed facts with an exact-version baseline supplied by the presenter. */
export function reviewChanges(surface: HumanSurface, mutation: Mutation, facts: Facts, previous?: Facts) {
  if (!mutation.reviewFields) throw new Error("UNSUPPORTED_REVIEW_PROJECTION");
  const changed = mutation.reviewFields.filter(field => previous && Object.hasOwn(previous, field) &&
    Object.hasOwn(facts, field) && !sameFact(previous[field], facts[field]));
  let summary = "Review the resulting record before confirming.";
  if (changed.length) {
    const field = changed[0]!;
    const concise = `${surface.language.fields[`${mutation.object}.${field}`]}: ${presentFact(previous![field])} → ${presentFact(facts[field])}`;
    const structured = typeof previous![field] === "object" || typeof facts[field] === "object";
    summary = !structured && changed.length === 1 && concise.length <= 64 && !concise.includes("\n") ? concise :
      `${changed.length} ${changed.length === 1 ? "field will change. Review the updated value" : "fields will change. Review the updated values"} first.`;
  }
  return { summary, fields: [...changed, ...mutation.reviewFields.filter(field => !changed.includes(field))] };
}
