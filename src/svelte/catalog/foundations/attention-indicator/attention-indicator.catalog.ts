// AttentionIndicator: the amber dot that marks an object needing attention, inline in a row or over the corner of a
// well; it renders nothing when no attention is required.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AttentionIndicatorContract } from "./attention-indicator.contract.ts";

export const AttentionIndicator = defineFoundation({
  id: "attention-indicator",
  purpose: "Mark objects needing attention with the same amber indicator everywhere, steady when reduced motion is enabled.",
  messages: ["attentionIndicator.label"],
  owner: { entry: "AttentionIndicator.svelte" },
  shape: "none", states: ["required", "clear"],
  variants: { placement: ["inline", "overlay"] },
  approval: "required", contract: AttentionIndicatorContract,
} as const);
