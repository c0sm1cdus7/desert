// ChoiceItem: the one visual anatomy of a choice, its selection mark and leading artwork beside a title and an optional
// description; radio, checkbox or listbox behaviour belongs to its host.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceItemContract } from "./choice-item.contract.ts";

export const ChoiceItem = defineFoundation({
  id: "choice-item",
  purpose: "Lay out one choice as its selection mark beside a title and an optional description.",
  owner: { entry: "ChoiceItem.svelte" },
  shape: "none", states: ["label", "described"],
  slots: { children: { accepts: ["choice-list", "face", "color-bullet", "artwork-placeholder", "image"] } },
  approval: "required", contract: ChoiceItemContract,
} as const);
