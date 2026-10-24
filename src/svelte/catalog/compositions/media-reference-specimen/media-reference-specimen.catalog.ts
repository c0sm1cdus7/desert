// MediaReferenceSpecimen: a self-contained bank witness of the media reference selector, with one local image.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { MediaReferenceSpecimenContract } from "./media-reference-specimen.contract.ts";

export const MediaReferenceSpecimen = defineComposition({
  id: "media-reference-specimen",
  purpose: { key: "mediaReferenceSpecimen.purpose" },
  messages: ["mediaReferenceSpecimen.purpose"],
  owner: { entry: "MediaReferenceSpecimen.svelte" },
  uses: ["media-reference-selector"], approval: "none", contract: MediaReferenceSpecimenContract,
} as const);
