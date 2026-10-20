import { Type, type Static } from "@sinclair/typebox";
import { ProductDefinitionSchema } from "../contracts.ts";
import type { Frozen } from "../json.ts";
import { CatalogHomeSchema, CatalogDetailSchema, CatalogImageSchema, LogicalIdSchema, closedObject, nonemptyText } from "./node-schema.ts";
import { RendererRequirementsSchema } from "./capabilities.ts";
import { PublicCatalogExercisesSchema } from "./exercises.ts";

export const CatalogAssetSchema = closedObject({ id: LogicalIdSchema, path: nonemptyText(), alt: nonemptyText() });
export const FeaturedMediaSchema = Type.Union([
  closedObject({ kind: Type.Literal('image'), asset: LogicalIdSchema, alt: nonemptyText() }),
  closedObject({ kind: Type.Literal('gallery'), images: Type.Array(CatalogImageSchema, { minItems: 1, maxItems: 10 }) }),
  closedObject({ kind: Type.Literal('video'), asset: LogicalIdSchema, alt: nonemptyText(), poster: Type.Optional(LogicalIdSchema) }),
]);
const record = closedObject({ id: LogicalIdSchema, image: LogicalIdSchema, thumbnail: Type.Optional(LogicalIdSchema),
  gallery: Type.Optional(Type.Array(LogicalIdSchema, { minItems: 1, maxItems: 10, uniqueItems: true })),
  facts: Type.Record(nonemptyText(), Type.Union([Type.String(), Type.Number()]), { additionalProperties: false }) });
export const PublicCatalogDefinitionSchema = closedObject({
  protocol: Type.Literal("desert.public-catalog/1"), id: LogicalIdSchema, title: nonemptyText(), description: nonemptyText(),
  featuredMedia: Type.Optional(FeaturedMediaSchema),
  object: ProductDefinitionSchema.properties.objects.items,
  exercises: Type.Optional(PublicCatalogExercisesSchema),
  source: closedObject({ id: LogicalIdSchema, revision: nonemptyText(),
    assets: Type.Array(CatalogAssetSchema, { minItems: 1 }), records: Type.Array(record, { minItems: 1 }) }),
  view: closedObject({ title: nonemptyText(), description: nonemptyText(),
    home: closedObject({ featured: closedObject({ record: LogicalIdSchema, eyebrow: nonemptyText(), actionLabel: nonemptyText() }),
      groups: closedObject({ field: nonemptyText(), entries: Type.Array(closedObject({
        value: nonemptyText(), title: nonemptyText(),
      }), { minItems: 1 }) }) }),
    search: closedObject({ fields: Type.Array(nonemptyText(), { minItems: 1, uniqueItems: true }) }),
  }),
});
export const PublicCatalogSurfaceSchema = closedObject({
  protocol: Type.Literal("desert.catalog-surface/1"), kind: Type.Literal("human"), mode: Type.Literal("public-catalog"),
  productId: LogicalIdSchema, title: nonemptyText(), description: nonemptyText(), digest: Type.String({ pattern: "^[a-f0-9]{64}$" }),
  featuredMedia: Type.Optional(FeaturedMediaSchema),
  source: closedObject({ id: LogicalIdSchema, revision: nonemptyText() }), requirements: RendererRequirementsSchema,
  exercises: Type.Optional(PublicCatalogExercisesSchema),
  home: CatalogHomeSchema, details: Type.Array(CatalogDetailSchema, { minItems: 1 }),
  search: closedObject({ mode: Type.Literal("all-terms"), documents: Type.Array(closedObject({
    record: LogicalIdSchema, text: Type.String(),
  }), { minItems: 1 }) }),
});
export const PublicCatalogStateSchema = closedObject({ query: Type.String(), selectedId: Type.Union([LogicalIdSchema, Type.Null()]) });
export type PublicCatalogDefinition = Frozen<Static<typeof PublicCatalogDefinitionSchema>>;
export type PublicCatalogSurface = Frozen<Static<typeof PublicCatalogSurfaceSchema>>;
export type PublicCatalogState = Frozen<Static<typeof PublicCatalogStateSchema>>;
export type CatalogAsset = Frozen<Static<typeof CatalogAssetSchema>>;
