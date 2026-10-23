// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MoneyControlContract } from "./money-control.contract.ts";

export const MoneyControl = defineComposition({
  id: "money-control",
  purpose: "Enter an amount and choose its currency without losing the lexical draft.",
  owner: { entry: "MoneyControl.svelte" },
  uses: ["clear-input", "field-well", "masked-input", "measured-field", "selection-field"], approval: "none", contract: MoneyControlContract,
} as const);
