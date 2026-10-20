import type { RecordView } from "../web/types.ts";
import { presentFact, presentTitle } from "../interaction/fact-presentation.ts";

const compare = (left: string | number, right: string | number) => left < right ? -1 : left > right ? 1 : 0;

/** A local view of the exposed collection fields; never a new read or record projection. */
export function retrieveCollection(records: readonly RecordView[], fields: readonly string[], query: string): readonly RecordView[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const firstField = fields[0]!;
  const matches = records.filter(record => {
    const displayed = fields.map((field, index) => index === 0
      ? presentTitle(record.facts[field]) : presentFact(record.facts[field])).join(" ").toLowerCase();
    return terms.every(term => displayed.includes(term));
  });
  return matches.sort((left, right) => {
    const a = left.facts[firstField], b = right.facts[firstField];
    // Numeric values keep numeric order; text follows a stable case-insensitive
    // lexical order. Existing visible fallbacks cover empty or unknown titles.
    const byFirstField = typeof a === "number" && typeof b === "number" ? compare(a, b)
      : compare(presentTitle(a).toLowerCase(), presentTitle(b).toLowerCase());
    // Identity only breaks equal displayed values. It never enters search or copy.
    return byFirstField || compare(left.id, right.id);
  });
}
