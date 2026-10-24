// DestinationRow: one row of a grouped list that opens a destination, with its face, title and a trailing chevron.
// An unavailable destination stays visible, disabled, with its reason.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { DestinationRowContract } from "./destination-row.contract.ts";

export const DestinationRow = defineFoundation({
  id: "destination-row",
  purpose: "A grouped row that opens one destination, or shows why that destination is unavailable.",
  owner: { entry: "DestinationRow.svelte" },
  shape: "none", states: ["available", "unavailable"], approval: "required", contract: DestinationRowContract,
} as const);
