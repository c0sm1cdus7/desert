// Column: children stacked vertically with a gap from the spacing scale, at a measure and an inline alignment. Compositions
// lay content out with it instead of writing their own grid.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ColumnContract } from "./column.contract.ts";

export const Column = defineFoundation({
  id: "column",
  purpose: "Stack pieces vertically with a gap from the spacing scale, at the reading, narrow or wide measure, aligned or centred.",
  owner: { entry: "Column.svelte" },
  shape: "none", states: ["default"],
  variants: { gap: ["tight", "snug", "close", "regular", "loose", "relaxed", "section"], measure: ["reading", "narrow", "wide"], align: ["start", "center", "stretch"] },
  slots: { children: { accepts: ["access-appearance-specimen", "access-form", "action", "appearance-preferences", "attention-indicator", "attention-list", "attention-status", "avatar", "bar", "choice", "clock", "column", "content-flow", "context-properties", "contract-inspection", "control-bench", "dialog", "face", "fact-list", "form", "gallery", "grid", "heading", "image", "information", "inline", "list", "lock-screen", "media-object", "media-player", "media-reference-specimen", "menu", "node-renderer", "object-state-control", "place-heading", "popover", "reading-content", "reference-specimen", "related-selection", "seed-avatar", "shared-owner-catalog", "spacer", "specimen-group", "stack-item", "stack-layout", "status", "summary-widget", "surface-specimen", "text", "theme-preview", "view-region"] } },
  approval: "required", contract: ColumnContract,
} as const);
