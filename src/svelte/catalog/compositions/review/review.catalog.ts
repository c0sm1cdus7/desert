// Review: the prepared facts of a change, with a recovery note after an uncertain result.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ReviewContract } from "./review.contract.ts";

export const Review = defineComposition({
  id: "review",
  purpose: { key: "review.purpose" },
  messages: ["review.purpose"],
  owner: { entry: "Review.svelte" },
  uses: ["column", "node-renderer", "text"], renders: ["review"], approval: "none", contract: ReviewContract,
} as const);
