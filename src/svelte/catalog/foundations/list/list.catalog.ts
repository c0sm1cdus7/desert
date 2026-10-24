// List: one shared pane holding sibling rows, or the fact rows of a description list, at the reading measure or the full
// overview width. It absorbs grouped-panel and fact-list, and the grouped rows and fact stack of structured-content.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ListContract } from "./list.contract.ts";

export const List = defineFoundation({
  id: "list",
  purpose: "Hold sibling rows or facts in one shared pane, at the reading measure or the full overview width.",
  owner: { entry: "List.svelte" },
  shape: "radius", states: ["default"],
  variants: { kind: ["rows", "facts"], measure: ["reading", "overview"] },
  slots: { children: { accepts: ["row", "fact-row", "object-state-row", "text", "status", "loading"] } },
  approval: "required", contract: ListContract,
} as const);
