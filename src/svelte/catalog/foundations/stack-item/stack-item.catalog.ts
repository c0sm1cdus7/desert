// StackItem: one entry of a stack, placed by the kind of node it holds: framed content (tag, avatar, image, card,
// availability) keeps its own inset, everything else reads at the surface inset.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StackItemContract } from "./stack-item.contract.ts";

export const StackItem = defineFoundation({
  id: "stack-item",
  purpose: "Place one entry of a stack by the kind of node it holds, at the content or the surface inset.",
  owner: { entry: "StackItem.svelte" },
  shape: "none", states: ["content", "surface"],
  slots: { children: { accepts: ["node-renderer"] } },
  approval: "required", contract: StackItemContract,
} as const);
