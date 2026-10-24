// Library: a media library's cards and albums; opening an item shows it in the viewer and returns focus when it closes.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LibraryContract } from "./library.contract.ts";

export const Library = defineComposition({
  id: "library",
  purpose: "Browse a media library by album and open its items in the viewer, returning focus to the opener.",
  owner: { entry: "Library.svelte" },
  uses: ["catalog-home", "viewer"], approval: "none", contract: LibraryContract,
} as const);
