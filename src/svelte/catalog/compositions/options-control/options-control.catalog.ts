// OptionsControl: a labelled group of options, radio rows for one choice and checkbox rows for several.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { OptionsControlContract } from "./options-control.contract.ts";

export const OptionsControl = defineComposition({
  id: "options-control",
  purpose: "Choose one or several values from a divided group of options.",
  owner: { entry: "OptionsControl.svelte" },
  uses: ["choice-list", "choice-row", "grouped-panel"], approval: "none", contract: OptionsControlContract,
} as const);
