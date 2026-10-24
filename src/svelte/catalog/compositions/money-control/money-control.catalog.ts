// MoneyControl: an amount field with its currency chooser, keeping the lexical draft across owner acknowledgements.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MoneyControlContract } from "./money-control.contract.ts";

export const MoneyControl = defineComposition({
  id: "money-control",
  purpose: "Enter an amount and choose its currency without losing the lexical draft.",
  owner: { entry: "MoneyControl.svelte" },
  uses: ["clear-input", "field-well", "masked-input", "measured-field", "selection-field"], approval: "none", contract: MoneyControlContract,
} as const);
