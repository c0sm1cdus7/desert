// SelectControl: the select control of a form; a selection field plus a clear action when the choice is optional.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SelectControlContract } from "./select-control.contract.ts";

export const SelectControl = defineComposition({
  id: "select-control",
  purpose: "Choose one value from a labeled field and a shared options popover.",
  owner: { entry: "SelectControl.svelte" },
  uses: ["measured-field", "node-renderer", "selection-field"], approval: "none", contract: SelectControlContract,
} as const);
