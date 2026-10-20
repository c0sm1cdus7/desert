import type { ObjectDefinition } from "../contracts.ts";
import type { FactsOf, FieldKey } from "../authoring-types.ts";
import type { PublicCatalogDefinition } from "./schema.ts";

type KeysOfKind<O extends ObjectDefinition, Kind extends string> = {
  [K in FieldKey<O>]: O["facts"][K]["kind"] extends Kind ? K : never;
}[FieldKey<O>];
type View = PublicCatalogDefinition["view"];
export type AuthoredPublicCatalog<O extends ObjectDefinition> = Omit<PublicCatalogDefinition, "object" | "source" | "view"> & {
  object: O;
  source: Omit<PublicCatalogDefinition["source"], "records"> & {
    records: (Omit<PublicCatalogDefinition["source"]["records"][number], "facts"> & { facts: FactsOf<O> })[];
  };
  view: Omit<View, "title" | "description" | "home" | "search"> & {
    title: KeysOfKind<O, "text">; description: KeysOfKind<O, "text">;
    home: Omit<View["home"], "groups"> & { groups: Omit<View["home"]["groups"], "field"> & { field: KeysOfKind<O, "enum"> } };
    search: { fields: KeysOfKind<O, "text" | "enum">[] };
  };
};

/** Literal-preserving authoring; compilation still validates untrusted input and references. */
export function publicCatalog<const O extends ObjectDefinition>(definition: AuthoredPublicCatalog<O>): AuthoredPublicCatalog<O> {
  return definition;
}
