// ViewBinding: one view item that shows a node: its own control, the summary widget of a bound collection, the bound node
// itself (in a stack item, unless a frame holds it), or the message of an input still pending.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { ViewBindingContract } from "./view-binding.contract.ts";

export const ViewBinding = defineComposition({
  id: "view-binding",
  purpose: { key: "viewBinding.purpose" },
  messages: ["viewBinding.purpose"],
  owner: { entry: "ViewBinding.svelte" },
  uses: ["node-renderer", "stack-item", "summary-widget", "text"], approval: "none", contract: ViewBindingContract,
} as const);
