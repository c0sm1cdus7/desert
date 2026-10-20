import { Type, type Static, type TProperties } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";

export const closedObject = <P extends TProperties>(properties: P) => Type.Object(properties, { additionalProperties: false });
export const nonemptyText = () => Type.String({ minLength: 1 });
/** Logical identity is not a URL, filesystem path, or platform resource handle. */
export const LogicalIdSchema = Type.String({ pattern: "^[A-Za-z0-9][A-Za-z0-9._-]*$", minLength: 1 });
const node = <K extends string, P extends TProperties>(kind: K, properties: P) => closedObject({
  version: Type.Literal("desert.bank-node/1"), kind: Type.Literal(kind), ...properties,
});
export const CatalogImageSchema = closedObject({ asset: LogicalIdSchema, alt: nonemptyText() });
const card = { record: LogicalIdSchema, title: nonemptyText(), image: CatalogImageSchema };
export const CatalogItemSchema = node("catalog.card", { ...card, presentation: Type.Literal("item") });
export const CatalogFeaturedSchema = node("catalog.card", {
  ...card, presentation: Type.Literal("featured"), eyebrow: nonemptyText(), actionLabel: nonemptyText(),
});
export const CatalogCardSchema = Type.Union([CatalogFeaturedSchema, CatalogItemSchema]);
export const CatalogHomeSchema = node("catalog.home", {
  featured: CatalogFeaturedSchema,
  groups: Type.Array(closedObject({ id: nonemptyText(), title: nonemptyText(), items: Type.Array(CatalogItemSchema) }), { minItems: 1 }),
});
export const CatalogDetailSchema = node("catalog.detail", { ...card, description: Type.String(),
  gallery: Type.Optional(Type.Array(CatalogImageSchema, { minItems: 1, maxItems: 10 })) });
export type CatalogItemNode = Frozen<Static<typeof CatalogItemSchema>>;
export type CatalogFeaturedNode = Frozen<Static<typeof CatalogFeaturedSchema>>;
export type CatalogCardNode = Frozen<Static<typeof CatalogCardSchema>>;
export type CatalogHomeNode = Frozen<Static<typeof CatalogHomeSchema>>;
export type CatalogDetailNode = Frozen<Static<typeof CatalogDetailSchema>>;

/** Home sections form a single ordered catalog partition, never duplicate navigation targets. */
export function checkCatalogHome(node: CatalogHomeNode): void {
  const records = node.groups.flatMap(group => group.items.map(item => item.record));
  if (new Set(node.groups.map(group => group.id)).size !== node.groups.length ||
      new Set(records).size !== records.length || !records.includes(node.featured.record)) {
    throw new Error("INVALID_CATALOG_HOME_REFERENCES");
  }
}
