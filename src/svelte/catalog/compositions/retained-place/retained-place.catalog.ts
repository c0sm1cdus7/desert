// RetainedPlace: a place kept mounted while hidden, which tells its content whether it is the active surface.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { RetainedPlaceContract } from "./retained-place.contract.ts";

export const RetainedPlace = defineComposition({
  id: "retained-place",
  purpose: "Keep a place mounted while hidden and provide whether it is the active surface.",
  owner: { entry: "RetainedPlace.svelte" },
  uses: [], slots: { children: { accepts: ["inspection-catalog", "inspection-content", "local-exercises", "public-catalog-bank", "view-content"] } },
  approval: "none", contract: RetainedPlaceContract,
} as const);
