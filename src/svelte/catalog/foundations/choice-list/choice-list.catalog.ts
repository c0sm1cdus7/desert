// ChoiceList: the transparent geometry that holds a host's choice rows, never a second pane inside it; it owns the
// radio and checkbox vendor families those rows use.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ChoiceListContract } from "./choice-list.contract.ts";

export const ChoiceList = defineFoundation({
  id: "choice-list",
  purpose: "Hold the rows of a single or multiple choice in one transparent geometry inside its host.",
  owner: { entry: "ChoiceList.svelte", vendor: ["checkbox", "radio-group"] },
  shape: "none", states: ["default"],
  slots: { children: { accepts: ["choice-row", "choice-item"] } },
  approval: "required", contract: ChoiceListContract,
} as const);
