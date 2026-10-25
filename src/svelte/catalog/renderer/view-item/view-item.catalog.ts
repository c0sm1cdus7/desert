// ViewItem: the dispatcher of one view item, one if-chain over its kind: text, a fact, a destination link, or an item
// bound to a node (a control of its own, or a view input), which the view binding draws.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewItemContract } from "./view-item.contract.ts";

export const ViewItem = defineComposition({
  id: "view-item",
  purpose: { key: "viewItem.purpose" },
  messages: ["viewItem.purpose"],
  owner: { entry: "ViewItem.svelte" },
  uses: ["information", "text-content", "view-binding", "view-destination-link"], dispatch: "view-content", approval: "none",
  contract: ViewItemContract,
} as const);
