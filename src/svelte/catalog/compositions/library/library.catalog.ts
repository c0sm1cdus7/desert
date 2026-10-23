// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { LibraryContract } from "./library.contract.ts";

export const Library = defineComposition({
  id: "library",
  purpose: "Declared as found at the start of the migration: Library.svelte.",
  owner: { entry: "Library.svelte" },
  uses: ["catalog-home", "viewer"], approval: "none", contract: LibraryContract,
} as const);
