// SurfaceSpecimen: a bank example of a mounted surface, the transient it opens, and the surface composition rules.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { SurfaceSpecimenContract } from "./surface-specimen.contract.ts";

export const SurfaceSpecimen = defineComposition({
  id: "surface-specimen",
  purpose: { key: "surfaceSpecimen.purpose" },
  messages: ["surfaceSpecimen.purpose", "surfaceSpecimen.edges", "surfaceSpecimen.toolbars", "surfaceSpecimen.sides",
    "surfaceSpecimen.rootSurfaces", "surfaceSpecimen.content", "surfaceSpecimen.contentOrder", "surfaceSpecimen.mountedTitle",
    "surfaceSpecimen.mountedSubtitle", "surfaceSpecimen.mountedText", "surfaceSpecimen.exampleTitle", "surfaceSpecimen.exampleSubtitle",
    "surfaceSpecimen.anatomy", "surfaceSpecimen.actions", "surfaceSpecimen.openTransient", "surfaceSpecimen.rules",
    "surfaceSpecimen.rulesMounted", "surfaceSpecimen.rulesAuthoring"],
  owner: { entry: "SurfaceSpecimen.svelte" },
  uses: ["information", "modal", "stack-layout", "surface-frame"], approval: "none", contract: SurfaceSpecimenContract,
} as const);
