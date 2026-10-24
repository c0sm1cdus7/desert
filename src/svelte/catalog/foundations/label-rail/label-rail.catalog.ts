// LabelRail: the selected labels of a field as a wrapping rail of badges, each removable when the owner allows it.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { LabelRailContract } from "./label-rail.contract.ts";

export const LabelRail = defineFoundation({
  id: "label-rail",
  purpose: "Present selected labels in a wrapping rail using the same value representation as the field.",
  owner: { entry: "LabelRail.svelte", vendor: ["badge"] },
  shape: "none", states: ["read-only", "removable", "disabled"],
  approval: "required", contract: LabelRailContract,
} as const);
