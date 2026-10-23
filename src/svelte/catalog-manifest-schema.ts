import { Type, type Static } from "@sinclair/typebox";
import { ResolvedNodes } from "../interaction/catalog.ts";
import type { Frozen } from "../json.ts";

const closed = <T extends Parameters<typeof Type.Object>[0]>(properties: T) => Type.Object(properties, { additionalProperties: false });
const names = Type.Array(Type.String({ pattern: "^[A-Za-z][A-Za-z0-9]*$" }), { uniqueItems: true });
const admission = closed({ props: names, slots: names, instance: names });
const owner = closed({
  source: Type.String({ pattern: "^src/svelte/[A-Za-z0-9_./-]+\\.svelte$" }),
  closure: Type.Union((["closed", "private-composition", "finite-inputs", "dispatcher", "unsealed"] as const).map(value => Type.Literal(value))),
  bank: Type.Optional(Type.Array(Type.Union(ResolvedNodes.entries.map(entry => Type.Literal(entry.id))), { uniqueItems: true })),
  adapters: Type.Optional(Type.Record(Type.String({ pattern: "^[A-Z][A-Za-z0-9]*$" }), admission, { additionalProperties: false })),
});

/** Web implementation identity is distinct from the surface-neutral bank grammar.
 * Unsealed records identify remaining work; finite-inputs seals native inputs,
 * not its private slot/dependency graph. Registration is not qualification. */
export const WebCatalogManifestSchema = closed({
  version: Type.Literal("desert.web-catalog/1"),
  owners: Type.Record(Type.String({ pattern: "^[A-Z][A-Za-z0-9]*$" }), owner, { additionalProperties: false }),
});
export type WebCatalogDefinition = Frozen<Static<typeof WebCatalogManifestSchema>>;
