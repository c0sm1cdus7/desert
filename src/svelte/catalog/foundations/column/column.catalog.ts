// Column: children stacked vertically with a gap from the spacing scale, at a measure and an inline alignment. Compositions
// lay content out with it instead of writing their own grid.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ColumnContract } from "./column.contract.ts";

export const Column = defineFoundation({
  id: "column",
  purpose: "Stack pieces vertically with a gap from the spacing scale, at the reading, narrow or wide measure, aligned or centred.",
  owner: { entry: "Column.svelte" },
  shape: "none", states: ["default"],
  variants: { gap: ["snug", "close", "regular", "relaxed", "section"], measure: ["reading", "narrow", "wide"], align: ["start", "center", "stretch"] },
  slots: { children: { accepts: ["access-form", "action", "appearance-preferences", "avatar", "clock", "column", "fact-list", "form", "heading",
    "inline", "lock-screen", "stack-layout", "text"] } },
  approval: "required", contract: ColumnContract,
} as const);
