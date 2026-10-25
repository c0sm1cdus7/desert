// Choice: a labelled choice among options given as data, drawn as rows of one pane (radio for one, checkbox for many),
// cards with artwork, tint swatches, or a menu behind a trigger. It absorbs ChoiceItem, ChoiceList, ChoiceRow and
// SelectionField and AppearancePreferences' cards and swatches; it owns the radio and checkbox vendor families.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceContract } from "./choice.contract.ts";

export const Choice = defineFoundation({
  id: "choice",
  purpose: "Choose one or several options given as data, as rows, cards, swatches or a menu, with a persistent label.",
  messages: ["choice.requiredMark", "choice.required", "choice.notSelected"],
  owner: { entry: "Choice.svelte", parts: ["ChoiceRows.svelte", "ChoiceCards.svelte", "ChoiceSwatches.svelte", "ChoiceMenu.svelte",
    "ChoiceMenuList.svelte", "ChoiceAnatomy.svelte", "ChoiceLeading.svelte", "choice-row.ts"], vendor: ["checkbox", "radio-group"], mechanisms: ["press-feedback", "surface-focus"] },
  shape: "radius", states: ["default", "described", "disabled", "required"],
  variants: { presentation: ["rows", "cards", "swatches", "menu"], cardinality: ["one", "many"], menuTrigger: ["well", "inline", "contextual"] },
  variantLimits: { presentation: { rows: { menuTrigger: [] }, cards: { menuTrigger: [] }, swatches: { cardinality: ["one"], menuTrigger: [] },
    menu: { cardinality: ["one"] } } },
  approval: "required", contract: ChoiceContract,
} as const);
