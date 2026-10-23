import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { digest, fileInventory } from "../files.ts";
import { freezeDeep } from "../../json.ts";
import { publicCatalogSurface } from "../../public-catalog/surface.ts";
import { LogicalIdSchema } from "../../public-catalog/node-schema.ts";
import { catalogMediaTypes } from "./assets.ts";
import { stackNodes } from "../../interaction/place.ts";

export const catalogBuildFile = "PUBLIC-CATALOG-BUILD.json";
const sha = Type.String({ pattern: "^[a-f0-9]{64}$" });
const closed = { additionalProperties: false };
const schema = Type.Object({
  format: Type.Literal("desert.public-catalog-build/1"), productId: LogicalIdSchema, contractDigest: sha,
  rendererRevision: sha, mode: Type.Literal("public-read-only"), mediaPolicy: Type.Literal("external-local-bindings"),
  assets: Type.Array(Type.Object({ id: LogicalIdSchema, digest: sha, size: Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER }),
    mediaType: Type.Union([...new Set(Object.values(catalogMediaTypes))].map(type => Type.Literal(type))) }, closed), { minItems: 1 }),
  files: Type.Record(Type.String(), sha),
}, closed);
export type PublicCatalogBuild = Static<typeof schema>;
export function loadPublicCatalogBuild(directory: string) {
  const files = fileInventory(directory, [catalogBuildFile]);
  const value: unknown = JSON.parse(readFileSync(join(directory, catalogBuildFile), "utf8"));
  if (!Check(schema, value)) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  if (digest(value.files) !== digest(files)) throw new Error("BUILD_FILES_MISMATCH");
  if (!Object.hasOwn(files, "surface.json") || !Object.hasOwn(files, "web/handler.js")) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const surface = publicCatalogSurface(JSON.parse(readFileSync(join(directory, "surface.json"), "utf8")));
  if (value.productId !== surface.productId || value.contractDigest !== surface.digest) throw new Error("BUILD_SURFACE_MISMATCH");
  const identities = new Set(value.assets.map(asset => asset.id));
  if (identities.size !== value.assets.length) throw new Error("INVALID_PUBLIC_CATALOG_BUILD");
  const references = [...(surface.home.featured.image ? [surface.home.featured.image.asset] : []),
    ...surface.details.map(detail => detail.image.asset),
    ...surface.home.groups.flatMap(group => group.items.flatMap(item => item.image ? [item.image.asset] : []))];
  for (const detail of surface.details) references.push(...(detail.gallery ?? []).map(image => image.asset));
  if (surface.featuredMedia?.kind === 'gallery') {
    references.push(...surface.featuredMedia.images.map(image => image.asset));
  } else if (surface.featuredMedia) {
    references.push(surface.featuredMedia.asset);
    if (surface.featuredMedia.kind === 'video' && surface.featuredMedia.poster) references.push(surface.featuredMedia.poster);
    const featured = surface.featuredMedia;
    const media = value.assets.find(asset => asset.id === featured.asset);
    if (media && !media.mediaType.startsWith(`${surface.featuredMedia.kind}/`)) throw new Error('CATALOG_FEATURED_MEDIA_TYPE_MISMATCH');
  }
  for (const stack of surface.exercises?.stacks ?? []) for (const node of stackNodes(stack.items)) {
    if (node.kind === "catalog.card" && node.image) references.push(node.image.asset);
    if ("control" in node && (node.control.kind === "image" || node.control.kind === "avatar") &&
        node.control.source !== null && typeof node.control.source !== "string") {
      if (!("asset" in node.control.source)) throw new Error("CATALOG_PRIVATE_MEDIA_FORBIDDEN");
      references.push(node.control.source.asset);
    }
  }
  if (references.some(id => !identities.has(id))) throw new Error("CATALOG_MEDIA_REFERENCE_MISSING");
  const galleryImages = [...surface.details.flatMap(detail=>(detail.gallery ?? []).map(image=>image.asset)),
    ...(surface.featuredMedia?.kind === 'gallery' ? surface.featuredMedia.images.map(image=>image.asset) : [])];
  if (galleryImages.some(id=>!value.assets.find(asset=>asset.id===id)?.mediaType.startsWith('image/'))) {
    throw new Error('CATALOG_FEATURED_MEDIA_TYPE_MISMATCH');
  }
  return freezeDeep(value);
}
