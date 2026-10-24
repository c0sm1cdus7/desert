// Review: the prepared facts of a change, with a recovery note after an uncertain result.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReviewContract } from "./review.contract.ts";

export const Review = defineComposition({
  id: "review",
  purpose: "Inspect the prepared result before accepting a change or recovering an uncertain result.",
  owner: { entry: "Review.svelte" },
  uses: ["node-renderer"], renders: ["review"], approval: "none", contract: ReviewContract,
} as const);
