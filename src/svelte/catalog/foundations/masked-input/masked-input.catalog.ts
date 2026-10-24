// MaskedInput: the text input of a masked value (a decimal amount): it formats as the person types, keeps the caret
// and its own undo history, and reports the canonical value.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { MaskedInputContract } from "./masked-input.contract.ts";

export const MaskedInput = defineFoundation({
  id: "masked-input",
  purpose: "Edit a masked value such as a decimal amount: format while typing, keep the caret and undo, report the canonical value.",
  owner: { entry: "MaskedInput.svelte", parts: ["input-edit-history.ts"] },
  shape: "none", states: ["default", "invalid", "disabled"], approval: "required", contract: MaskedInputContract,
} as const);
