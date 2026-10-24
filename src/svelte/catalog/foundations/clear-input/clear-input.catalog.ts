// ClearInput: the trailing button of a text field that empties its control through the editor's own edit pipeline.
// It renders nothing while the control is empty.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ClearInputContract } from "./clear-input.contract.ts";

export const ClearInput = defineFoundation({
  id: "clear-input",
  purpose: "Empty a text control in one press, keeping its masks and undo history, shown only while it holds a value.",
  owner: { entry: "ClearInput.svelte" },
  shape: "none", states: ["empty", "value", "disabled"], approval: "required", contract: ClearInputContract,
} as const);
