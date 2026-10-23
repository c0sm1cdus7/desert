// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ActionContract } from "./action.contract.ts";

export const Action = defineFoundation({
  id: "action",
  purpose: "Invoke one command with a text button or an icon button, never competing text and icons.",
  owner: { entry: "Action.svelte", vendor: ["button"] },
  shape: "capsule", states: ["default"], approval: "required", contract: ActionContract,
} as const);
