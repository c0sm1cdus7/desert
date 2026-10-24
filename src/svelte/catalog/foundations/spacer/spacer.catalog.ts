// Spacer: an empty space of one spacing step, or the space left over in a row or column (fill).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SpacerContract } from "./spacer.contract.ts";

export const Spacer = defineFoundation({
  id: "spacer",
  purpose: "Leave an empty space of one spacing step, or take the space a row or column leaves over.",
  owner: { entry: "Spacer.svelte" },
  shape: "none", states: ["default"],
  variants: { size: ["snug", "close", "regular", "relaxed", "section", "fill"] },
  approval: "required", contract: SpacerContract,
} as const);
