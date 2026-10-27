// Row: one row of a list, with a leading face, attention dot, image or artwork placeholder, a title with its supporting
// lines, and a trailing chevron; it opens what it names, or only reads. It is destination-row renamed, and it absorbs the
// collection record row, the attention row, the search result row, the media list item and the catalog index row.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { RowContract } from "./row.contract.ts";

export const Row = defineFoundation({
  id: "row",
  purpose: { key: "row.purpose" }, messages: ["row.purpose"],
  owner: { entry: "Row.svelte", mechanisms: ["press-feedback"] },
  shape: "none", states: ["available", "unavailable", "current"],
  variants: { interaction: ["open", "static"], trailing: ["chevron", "none"] },
  // Only a row that opens can be unavailable or be the current one.
  stateVariants: { unavailable: { interaction: ["open"] }, current: { interaction: ["open"] } },
  approval: "required", contract: RowContract,
} as const);
