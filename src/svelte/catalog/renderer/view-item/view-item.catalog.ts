// ViewItem: the dispatcher of one view item; it mounts the piece for the item's kind with its bound node.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewItemContract } from "./view-item.contract.ts";

export const ViewItem = defineComposition({
  id: "view-item",
  purpose: "Mount the piece for one view item's kind (text, fact, destination link, bound node or summary widget).",
  owner: { entry: "ViewItem.svelte" },
  uses: ["information", "message-body", "node-renderer", "stack-item", "summary-widget", "text-content", "view-destination-link"], dispatch: "view-content", approval: "none", contract: ViewItemContract,
} as const);
