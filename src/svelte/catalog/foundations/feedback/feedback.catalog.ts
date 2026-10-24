// Feedback: one short status sentence announced to assistive technology, in the support type role.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FeedbackContract } from "./feedback.contract.ts";

export const Feedback = defineFoundation({
  id: "feedback",
  purpose: "A short status sentence, announced politely, that tells the person what just happened.",
  owner: { entry: "Feedback.svelte" },
  shape: "none", states: ["default"],
  approval: "required", contract: FeedbackContract,
} as const);
