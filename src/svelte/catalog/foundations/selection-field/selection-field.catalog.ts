// SelectionField: choose one value from a list, shown inline, as a field well or as a contextual value, opening a
// popover (or a picker sheet on narrow surfaces). Its contract stays a stub: `selectedContent` and `optionLeading` are
// snippets with parameters, which declared slots (plain `Snippet`) cannot express.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SelectionFieldContract } from "./selection-field.contract.ts";

export const SelectionField = defineFoundation({
  id: "selection-field",
  purpose: "Choose one value from a list of options, inline, as a field well or as a contextual value.",
  owner: { entry: "SelectionField.svelte", parts: ["SelectionList.svelte"], vendor: ["popover"] },
  shape: "radius", states: ["inline", "field-control", "contextual", "disabled"], approval: "required", contract: SelectionFieldContract,
} as const);
