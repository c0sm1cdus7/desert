// Stack: one titled stack of a place, each item drawn by the node renderer. Its contract stays a stub: `host` is a
// LocalFileHost, a class that lives in src/svelte/infra (visual code), so no contract may reference it.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { StackContract } from "./stack.contract.ts";

export const Stack = defineComposition({
  id: "stack",
  purpose: "Draw one titled stack of a place's items, each through the node renderer.",
  owner: { entry: "Stack.svelte" },
  uses: ["node-renderer", "stack-item", "stack-layout"], approval: "none", contract: StackContract,
} as const);
