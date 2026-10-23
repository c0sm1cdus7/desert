import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ControlSpecimens } from "./control-specimens.ts";
import { CatalogGroups, CatalogFoundations, catalogInspection, type DiscoveryGroup, type FoundationId } from "./catalog-ownership.ts";

function entry<const Id extends string, const Family extends string, const States extends readonly string[]>(
  id: Id, family: Family, states: States, group: DiscoveryGroup, owners: readonly FoundationId[]) {
  return { id, family, states, inspection: catalogInspection(id, states, group, owners,
    ['tests/bank-node.test.ts', 'tests/public-catalog-bank.test.ts']) };
}

export const ResolvedNodes = freezeDeep({
  id: "desert.human-interaction", version: "0.5.0",
  groups: CatalogGroups, foundations: CatalogFoundations,
  entries: [
    entry("input.text", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("input.multiline", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("fact", "primitive", ["known", "empty", "unknown"], "foundations", ["stack", "status"]),
    entry("action", "primitive", ["ready", "unavailable", "pending", "loading", "offline"], "foundations", ["pane", "action"]),
    entry("availability", "primitive", ["unknown", "ready", "unavailable"], "foundations", ["status"]),
    entry("collection", "composition", ["empty", "records", "state-summary", "media-grid", "media-list", "collection-grid", "loading", "offline"], "compositions", ["stack", "pane", "action"]),
    entry("form", "composition", ["incomplete", "ready", "disconnected"], "compositions", ["stack", "well", "action"]),
    entry("context", "composition", ["available", "unavailable", "media-object"], "compositions", ["stack", "action"]),
    entry("review", "composition", ["prepared", "uncertain"], "compositions", ["stack", "status", "action"]),
    entry("transient", "composition", ["open", "locked"], "compositions", ["pane", "stack", "action"]),
    entry("problem", "composition", ["error", "warning"], "compositions", ["pane", "status", "action"]),
    entry("catalog.card", "composition", ["featured", "item"], "compositions", ["stack", "action"]),
    entry("catalog.home", "composition", ["populated"], "compositions", ["stack"]),
    entry("catalog.detail", "composition", ["reading"], "compositions", ["stack"]),
    ...ControlSpecimens.map(({ id, family, specimens, inspection }) => ({ id, family, states: specimens.map(specimen => specimen.state), inspection })),
  ] as const,
});

export type ResolvedNodeId = typeof ResolvedNodes.entries[number]["id"];
export type ResolvedInputId = Extract<ResolvedNodeId, `input.${string}`>;
export type RendererTable<T> = { readonly [K in ResolvedNodeId]: T };

export function requireCatalog(candidate: unknown) {
  if (JSON.stringify(jsonSnapshot(candidate)) !== JSON.stringify(jsonSnapshot(ResolvedNodes))) {
    throw new Error("INTERACTION_CATALOG_MISMATCH");
  }
}
