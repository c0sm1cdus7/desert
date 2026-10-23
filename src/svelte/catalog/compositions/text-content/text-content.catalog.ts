// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { TextContentContract } from "./text-content.contract.ts";

export const TextContent = defineComposition({
  id: "text-content",
  purpose: "Declared as found at the start of the migration: TextContent.svelte.",
  owner: { entry: "TextContent.svelte" },
  uses: ["information"], approval: "none", contract: TextContentContract,
} as const);
