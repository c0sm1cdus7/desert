// MoneyControl: an amount Field with a decimal mask at the amount measure, its currency chosen from an inline menu in the
// field's prefix; it keeps the lexical draft across owner acknowledgements.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MoneyControlContract } from "./money-control.contract.ts";

export const MoneyControl = defineComposition({
  id: "money-control",
  purpose: { key: "moneyControl.purpose" },
  messages: ["moneyControl.purpose", "moneyControl.currency", "moneyControl.format", "moneyControl.tooLarge", "moneyControl.scale",
    "moneyControl.currencyScale"],
  owner: { entry: "MoneyControl.svelte" },
  uses: ["choice", "field"], renders: ["control.money"], approval: "none", contract: MoneyControlContract,
} as const);
