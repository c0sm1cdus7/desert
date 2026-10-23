import type { HumanSurface, RecordView } from "../web/types.ts";
import { requireReadScope, type ModelScope } from "../web/client/model-scope.ts";
import { BankVersion, bankNode, type BankNodeFor } from "./bank-node.ts";

/** A collection receives only its declared exposure, never a whole controller or product artifact. */
export function presentCollection(surface: HumanSurface, records: readonly RecordView[], state: {
  disabled: boolean; loaded: boolean; selectedId: string | null; connection?: 'loading' | 'ready' | 'offline';
}, scope: ModelScope, presentation?: BankNodeFor<"collection">["presentation"], visible?: readonly string[],
  valueLabels?: BankNodeFor<"collection">["valueLabels"],attention?:BankNodeFor<'collection'>['attention']): BankNodeFor<"collection"> {
  const { read, primaryCreation } = requireReadScope(scope);
  const fields = visible ?? read.collection;
  if (fields.some(field => !read.collection.includes(field))) throw new Error("INVALID_COLLECTION_FIELD");
  const createLabel = primaryCreation ? surface.language.journeys[primaryCreation.id] : undefined;
  const node = bankNode({ version: BankVersion, kind: "collection", object: read.subject, fields,
    ...(presentation ? { presentation } : {}),
    ...(attention&&Object.keys(attention).length?{attention}:{}),
    ...(valueLabels && Object.keys(valueLabels).length ? { valueLabels: Object.fromEntries(Object.entries(valueLabels).filter(([field]) => fields.includes(field))) } : {}),
    labels: Object.fromEntries(fields.map(field => [`${read.subject}.${field}`, surface.language.fields[`${read.subject}.${field}`]])),
    ...(createLabel ? { createLabel } : {}),
    records: records.map(record => ({ id: record.id, version: record.version,
      facts: Object.fromEntries(fields.filter(field => Object.hasOwn(record.facts, field)).map(field => [field, record.facts[field]])) })), ...state });
  if (node.kind !== "collection") throw new Error("BANK_COLLECTION_REQUIRED");
  return node;
}
