// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { LabelRailContract } from "./label-rail.contract.ts";

export const LabelRail = defineFoundation({
  id: "label-rail",
  purpose: "Present selected labels in a wrapping rail using the same value representation as the field.",
  owner: { entry: "LabelRail.svelte", vendor: ["badge"] },
  shape: "none", states: ["default"], approval: "required", contract: LabelRailContract,
} as const);
