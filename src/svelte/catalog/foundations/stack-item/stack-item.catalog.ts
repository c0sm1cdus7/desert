// StackItem: one entry of a stack, at the placement its caller gives: framed content (tag, avatar, image, card,
// availability) keeps its own inset, everything else reads at the surface inset.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { StackItemContract } from "./stack-item.contract.ts";

export const StackItem = defineFoundation({
  id: "stack-item",
  purpose: "Place one entry of a stack at the content or the surface inset.",
  owner: { entry: "StackItem.svelte", parts: ["stack-item.css"] },
  shape: "none", states: ["default"],
  variants: { placement: ["content", "surface"] },
  slots: { children: { accepts: ["heading", "node-renderer", "text"] } },
  approval: "required", contract: StackItemContract,
} as const);
