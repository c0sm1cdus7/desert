// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewContentContract } from "./view-content.contract.ts";

export const ViewContent = defineComposition({
  id: "view-content",
  purpose: "Declared as found at the start of the migration: ViewContent.svelte.",
  owner: { entry: "ViewContent.svelte" },
  uses: ["content-flow"], approval: "none", contract: ViewContentContract,
} as const);
