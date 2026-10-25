// SelectControl: the select control of a form, a menu choice in a field well at the choice measure, plus a clear action
// when the choice is optional.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SelectControlContract } from "./select-control.contract.ts";

export const SelectControl = defineComposition({
  id: "select-control",
  purpose: { key: "selectControl.purpose" },
  messages: ["selectControl.purpose", "selectControl.clear"],
  owner: { entry: "SelectControl.svelte" },
  uses: ["action", "choice", "column"], renders: ["control.select"], approval: "none", contract: SelectControlContract,
} as const);
