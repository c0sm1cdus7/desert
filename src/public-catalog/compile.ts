import { createHash } from "node:crypto";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { validatePublicCatalogDefinition } from "./validate-definition.ts";
import { publicCatalogRequirements } from "./capabilities.ts";
import { publicCatalogSurface } from "./surface.ts";
import type { CatalogAsset, PublicCatalogSurface } from "./schema.ts";
import type { CatalogItemNode, CatalogFeaturedNode } from "./node-schema.ts";
import { stackNodes } from "../interaction/place.ts";

export type CompiledPublicCatalog = Frozen<{
  id: string; digest: string; surface: PublicCatalogSurface; assets: readonly CatalogAsset[];
}>;

/** Experimental read-only source compiler, deliberately separate from controller-backed journeys. */
export function compilePublicCatalog(input: unknown): CompiledPublicCatalog {
  const definition = validatePublicCatalogDefinition(input);
  const { id, title, source, view } = definition;
  // Host file locations are build bindings, not portable product meaning.
  const portable = { ...definition, source: { ...source, assets: source.assets.map(({ id, alt }) => ({ id, alt })) } };
  const digest = createHash("sha256").update(JSON.stringify(jsonSnapshot(portable))).digest("hex");
  const assets = new Map(source.assets.map(asset => [asset.id, asset]));
  const image = (asset: string) => ({ asset, alt: assets.get(asset)!.alt });
  const details = source.records.map(record => ({ version: "desert.bank-node/1" as const, kind: "catalog.detail" as const,
    record: record.id, title: String(record.facts[view.title]), description: String(record.facts[view.description]), image: image(record.image),
    ...(record.gallery ? { gallery: record.gallery.map(image) } : {}) }));
  const cards = new Map(source.records.map(record => [record.id, {
    version: "desert.bank-node/1", kind: "catalog.card", record: record.id, title: String(record.facts[view.title]),
    image: image(record.thumbnail ?? record.image), presentation: "item",
  } satisfies CatalogItemNode]));
  const featuredRecord = source.records.find(record => record.id === view.home.featured.record)!;
  const featured: CatalogFeaturedNode = { version: "desert.bank-node/1", kind: "catalog.card", record: featuredRecord.id,
    title: String(featuredRecord.facts[view.title]), image: image(featuredRecord.image), presentation: "featured",
    eyebrow: view.home.featured.eyebrow, actionLabel: view.home.featured.actionLabel };
  const surface = publicCatalogSurface({ protocol: "desert.catalog-surface/1", kind: "human", mode: "public-catalog",
    productId: id, title, description: definition.description, digest, source: { id: source.id, revision: source.revision },
    ...(definition.featuredMedia ? { featuredMedia: definition.featuredMedia } : {}),
    requirements: publicCatalogRequirements(definition.exercises?.stacks.flatMap(stack => stackNodes(stack.items)),
      definition.featuredMedia?.kind === 'gallery' || source.records.some(record => Boolean(record.gallery))),
    ...(definition.exercises ? { exercises: definition.exercises } : {}),
    home: { version: "desert.bank-node/1", kind: "catalog.home", featured,
      groups: view.home.groups.entries.map(group => ({ id: group.value, title: group.title,
        items: source.records.filter(record => record.facts[view.home.groups.field] === group.value).map(record => cards.get(record.id)!),
      })) }, details, search: { mode: "all-terms", documents: source.records.map(record => ({ record: record.id,
      text: view.search.fields.map(field => String(record.facts[field])).join("\n"),
    })) },
  });
  return freezeDeep({ id, digest, surface, assets: source.assets });
}
