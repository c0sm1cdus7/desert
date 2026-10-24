// Specimen: an isolated witness of one resolved node in one scenario, interactive through local state only. Its contract
// stays a stub: the generated CatalogProps makes `surface` (HumanSurface) deep-readonly, which turns its tuples into arrays.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenContract } from "./specimen.contract.ts";

export const Specimen = defineComposition({
  id: "specimen",
  purpose: "Witness one resolved node in one scenario, with local interaction, through the product node and frame grammar.",
  owner: { entry: "Specimen.svelte", parts: ["specimen-presentation.ts"] },
  uses: ["node-renderer", "surface-frame"], approval: "none", contract: SpecimenContract,
} as const);
