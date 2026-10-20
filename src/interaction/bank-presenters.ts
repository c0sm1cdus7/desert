import type { HumanSurface, RecordView } from "../web/types.ts";
import { readPresentation } from "../web/client/presentation.ts";
import { BankVersion, bankNode, type BankNodeFor } from "./bank-node.ts";

/** A collection receives only its declared exposure, never a whole controller or product artifact. */
export function presentCollection(surface: HumanSurface, records: readonly RecordView[], state: {
  disabled: boolean; loaded: boolean; selectedId: string | null;
}): BankNodeFor<"collection"> {
  const read = readPresentation(surface);
  const node = bankNode({ version: BankVersion, kind: "collection", object: read.subject, fields: read.collection,
    labels: Object.fromEntries(read.collection.map(field => [`${read.subject}.${field}`, surface.language.fields[`${read.subject}.${field}`]])),
    createLabel: surface.language.journeys[surface.navigation.primaryAction],
    records: records.map(record => ({ id: record.id, version: record.version,
      facts: Object.fromEntries(read.collection.filter(field => Object.hasOwn(record.facts, field)).map(field => [field, record.facts[field]])) })), ...state });
  if (node.kind !== "collection") throw new Error("BANK_COLLECTION_REQUIRED");
  return node;
}
