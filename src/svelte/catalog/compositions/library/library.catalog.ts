// Library: a media library's cards and albums; opening an item shows it in the viewer and returns focus when it closes.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LibraryContract } from "./library.contract.ts";

export const Library = defineComposition({
  id: "library",
  purpose: { key: "library.purpose" },
  messages: ["library.purpose", "library.media"],
  owner: { entry: "Library.svelte" },
  uses: ["catalog-home", "media-viewer"], approval: "none", contract: LibraryContract,
} as const);
