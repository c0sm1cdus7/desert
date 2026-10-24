// Specimen: an isolated witness of one resolved node in one scenario, interactive through local state only.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SpecimenContract } from "./specimen.contract.ts";

export const Specimen = defineComposition({
  id: "specimen",
  purpose: { key: "specimen.purpose" },
  messages: ["specimen.purpose"],
  owner: { entry: "Specimen.svelte", parts: ["specimen-presentation.ts"] },
  uses: ["node-renderer", "surface-frame"], approval: "none", contract: SpecimenContract,
} as const);
