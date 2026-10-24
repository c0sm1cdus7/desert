// Action: one command as a button that shows its label, or its icon when the label no longer fits; a pending command
// spins its icon, an unavailable one is disabled and may say why.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ActionContract } from "./action.contract.ts";

export const Action = defineFoundation({
  id: "action",
  purpose: "Invoke one command with a text button or an icon button, never competing text and icons.",
  owner: { entry: "Action.svelte", vendor: ["button"] },
  shape: "capsule", states: ["ready", "unavailable", "pending"],
  variants: { emphasis: ["primary", "secondary"] },
  approval: "required", contract: ActionContract,
} as const);
