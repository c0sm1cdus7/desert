import { resolvedNode } from "../interaction/resolved-node.ts";
import { PlaceContentSchema, placeContent, stackNodes, type PlaceContent } from "../interaction/place.ts";

export const PublicCatalogExercisesSchema = PlaceContentSchema;
export type PublicCatalogExercises = PlaceContent;

/** Local drafts are explicitly not controller commands, approvals, or durable accepted results. */
export function checkPublicCatalogExercises(exercises: PublicCatalogExercises, assets?: ReadonlySet<string>, records?: ReadonlySet<string>): void {
  placeContent(exercises);
  for (const stack of exercises.stacks) {
    for (const value of stackNodes(stack.items)) {
      const node = resolvedNode(value);
      if (node.kind === "catalog.card") {
        if (assets && node.image && !assets.has(node.image.asset)) throw new Error("INVALID_CATALOG_EXERCISE_ASSET_REFERENCE");
        if (records && !records.has(node.record)) throw new Error("INVALID_CATALOG_EXERCISE_RECORD_REFERENCE");
      } else if ("control" in node) {
        if (node.control.kind === "image" || node.control.kind === "avatar") {
          if (typeof node.control.source === "string") throw new Error("INVALID_CATALOG_EXERCISE_HOST_MEDIA");
          if (node.control.source !== null && !("asset" in node.control.source)) throw new Error("CATALOG_PRIVATE_MEDIA_FORBIDDEN");
          if (node.control.source !== null && assets && !assets.has(node.control.source.asset)) {
            throw new Error("INVALID_CATALOG_EXERCISE_ASSET_REFERENCE");
          }
        }
      } else if (!["input.text", "input.multiline", "fact"].includes(node.kind)) throw new Error("INVALID_CATALOG_EXERCISE_LOCAL_ONLY");
    }
  }
}
