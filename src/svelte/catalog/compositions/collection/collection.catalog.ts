// Collection: the records of a resolved collection node as grouped rows, or its media grid or collection grid.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { CollectionContract } from "./collection.contract.ts";

export const Collection = defineComposition({
  id: "collection",
  purpose: "Browse objects with shared row geometry, or present media in a gallery.",
  owner: { entry: "Collection.svelte" },
  uses: ["attention-indicator", "collection-state", "grouped-panel", "icon", "media-collection-grid", "media-grid"], approval: "none", contract: CollectionContract,
} as const);
