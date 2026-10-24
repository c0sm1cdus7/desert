// SurfaceSpecimen: a bank example of a mounted surface, the transient it opens, and the surface composition rules.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceSpecimenContract } from "./surface-specimen.contract.ts";

export const SurfaceSpecimen = defineComposition({
  id: "surface-specimen",
  purpose: "Demonstrate a mounted surface, the transient it launches, and the rules of surface composition.",
  owner: { entry: "SurfaceSpecimen.svelte" },
  uses: ["drawer", "information", "stack-layout", "surface-frame"], approval: "none", contract: SurfaceSpecimenContract,
} as const);
