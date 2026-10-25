// OptionsControl: a labelled group of options drawn as Choice rows, a radio each for one choice and a checkbox each for
// several; an option that would break the selection's bounds is unavailable.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { OptionsControlContract } from "./options-control.contract.ts";

export const OptionsControl = defineComposition({
  id: "options-control",
  purpose: { key: "optionsControl.purpose" },
  messages: ["optionsControl.purpose"],
  owner: { entry: "OptionsControl.svelte" },
  uses: ["choice"], renders: ["control.options"], approval: "none", contract: OptionsControlContract,
} as const);
