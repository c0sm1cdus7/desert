// Stack: one titled stack of a place, revealed by its id, each item drawn by the node renderer.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { StackContract } from "./stack.contract.ts";

export const Stack = defineComposition({
  id: "stack",
  purpose: { key: "stack.purpose" },
  messages: ["stack.purpose"],
  owner: { entry: "Stack.svelte" },
  uses: ["node-renderer", "stack-item", "stack-layout", "view-region"], approval: "none", contract: StackContract,
} as const);
