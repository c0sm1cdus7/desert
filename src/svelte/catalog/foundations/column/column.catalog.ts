// Column: children stacked vertically with a gap from the spacing scale. Compositions lay content out with it instead of
// writing their own grid.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ColumnContract } from "./column.contract.ts";

export const Column = defineFoundation({
  id: "column",
  purpose: "Stack pieces vertically with a gap from the spacing scale, optionally at the reading measure.",
  owner: { entry: "Column.svelte" },
  shape: "none", states: ["default"],
  variants: { gap: ["snug", "close", "regular", "relaxed", "section"] },
  slots: { children: { accepts: ["action", "clock", "fact-list", "form", "heading", "seed-avatar", "text"] } },
  approval: "required", contract: ColumnContract,
} as const);
