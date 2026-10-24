// PhotoCollection: one photo at a time with paging dots, swipe and arrow keys, opening the full-screen viewer on press.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PhotoCollectionContract } from "./photo-collection.contract.ts";

export const PhotoCollection = defineComposition({
  id: "photo-collection",
  purpose: "Page through a set of photos in place and open them in the full-screen viewer.",
  owner: { entry: "PhotoCollection.svelte" },
  uses: ["image", "viewer"], approval: "none", contract: PhotoCollectionContract,
} as const);
