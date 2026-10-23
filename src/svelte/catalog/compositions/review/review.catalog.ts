// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReviewContract } from "./review.contract.ts";

export const Review = defineComposition({
  id: "review",
  purpose: "Inspect the prepared result before accepting a change or recovering an uncertain result.",
  owner: { entry: "Review.svelte" },
  uses: ["node-renderer"], approval: "none", contract: ReviewContract,
} as const);
