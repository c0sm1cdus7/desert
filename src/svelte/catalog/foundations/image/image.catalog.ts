// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ImageContract } from "./image.contract.ts";

export const Image = defineFoundation({
  id: "image",
  purpose: "Declared as found at the start of the migration: Image.svelte.",
  owner: { entry: "Image.svelte" },
  shape: "none", states: ["default"], approval: "required", contract: ImageContract,
} as const);
