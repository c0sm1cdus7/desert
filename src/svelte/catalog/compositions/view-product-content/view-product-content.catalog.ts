// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewProductContentContract } from "./view-product-content.contract.ts";

export const ViewProductContent = defineComposition({
  id: "view-product-content",
  purpose: "Declared as found at the start of the migration: ViewProductContent.svelte.",
  owner: { entry: "ViewProductContent.svelte", parts: ["activity-host.ts"] },
  uses: ["view-workspace"], approval: "none", contract: ViewProductContentContract,
} as const);
