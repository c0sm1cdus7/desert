import type { ViewProgram } from "../views/program-schema.ts";
import { inspectionMedia } from "../svelte/catalog/inspection-media.ts";
import { viewHeaderImages } from "../views/header-media.ts";
import { mediaArtwork } from "../views/media-library.ts";

/** Closed asset projection from validated Views; the inspection sample is SDK-owned. */
export function requireViewMediaBindings(program: ViewProgram | undefined, assets: readonly { id: string; mediaType: string }[]) {
  const references = new Set<string>();
  const formats = new Map<string, Set<string>>();
  function require(id: string, format: string) {
    references.add(id);
    const allowed = formats.get(id) ?? new Set<string>();
    allowed.add(format); formats.set(id, allowed);
  }
  for (const view of program?.views ?? []) for (const item of view.content) {
    if (item.kind === "header" && item.media) {
      for (const image of viewHeaderImages(item.media)) require(image.asset, "image/");
    } else if (item.kind === "media-library") {
      for (const media of item.library.items) {
        const artwork = mediaArtwork(media);
        if (artwork) require(artwork.asset, "image/");
        if (media.kind !== "image") {
          require(media.source.asset, `${media.kind}/`);
          for (const caption of media.captions ?? []) require(caption.asset, "text/vtt");
        }
      }
    } else {
      const items = item.kind === "stack" ? item.items : [item];
      for (const leaf of items) {
        if ((leaf.kind === "image" || leaf.kind === "avatar") && leaf.source && typeof leaf.source === "object") {
          if (!("asset" in leaf.source)) throw new Error("VIEW_RUNTIME_ASSET_REFERENCE_REQUIRED");
          require(leaf.source.asset, "image/");
        }
      }
    }
  }
  references.delete(inspectionMedia.asset);
  const bound = new Set(assets.map(asset => asset.id));
  if ([...references].some(id => !bound.has(id))) throw new Error("VIEW_MEDIA_BINDING_REQUIRED");
  if ([...bound].some(id => !references.has(id))) throw new Error("UNREFERENCED_LOCAL_MEDIA_BINDING");
  for (const asset of assets) {
    if ([...formats.get(asset.id) ?? []].some(format => !asset.mediaType.startsWith(format))) {
      throw new Error("VIEW_MEDIA_KIND_MISMATCH");
    }
  }
}
