import { Check } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import { compile } from "../compile.ts";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ViewProgramVersion, type ViewProgram } from "../views/program-schema.ts";
import { compileViewProgram } from "../views/program.ts";
import { deriveModuleCatalog } from "./catalog.ts";
import { ProductCompositionSchema } from "./schema.ts";
import { resolvePresentation } from "./presentation.ts";
import { ownershipRegistry, productOwner, validateOwnedDomain, type Owner } from "./ownership.ts";
import type { Closed, ProductComposition } from "./types.ts";
import { canonicalObjects, objectPublications, validateObjectPublications } from "./object-publication.ts";
import type { ProductLinks } from "./links.ts";
import { requireJourneyOwnedSurfaceSemantics } from "../human-exposure.ts";
import { compileSurfaceExposures } from "./compile-surfaces.ts";
import { requireModuleCatalog, recordProductModules } from "./module-catalog.ts";
import { declarationArray, declarationRecord } from "./declaration-data.ts";
import { referenceAdmission } from "./admission.ts";
import { lowerProductReferences } from "./lower-references.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { registerCompiledProduct } from "./compiled-product.ts";
import type { ComposedDefinition } from "./composed-definition.ts";

/** Compile one root into the existing domain/runtime and presentation protocols. */
export function composeProduct<const P extends ProductComposition>(definition: Closed<P, ProductComposition> & ProductLinks<NoInfer<P>>) {
  const authored = declarationRecord(definition);
  const mounted = requireModuleCatalog(authored.modules);
  for (const value of declarationArray(authored.surfaces)) {
    const surface = declarationRecord(value);
    if (surface.kind === "human") requireJourneyOwnedSurfaceSemantics(surface);
  }
  const admission = referenceAdmission(authored, true, mounted);
  const source = jsonSnapshot({ ...lowerProductReferences(authored, admission), modules: mounted.map(module => module.definition) }) as
    unknown as Static<typeof ProductCompositionSchema>;
  if (!Check(ProductCompositionSchema, source) || !source.surfaces) throw new Error("INVALID_PRODUCT_COMPOSITION");
  const modules = source.modules;
  if (new Set(modules.map(module => module.id)).size !== modules.length) throw new Error("DUPLICATE_MODULE_ID");
  const owners: Owner[] = [
    ...modules.map(module => ({ id: module.id, definition: module, exports: module.exports })),
    { id: productOwner, definition: source },
  ];
  const ownership = ownershipRegistry(owners);
  validateOwnedDomain(source);
  validateObjectPublications(source);
  const definitions = owners.map(owner => owner.definition);
  for (const surface of source.surfaces) for (const id of surface.journeys) {
    const owner = ownership.registry.get("journeys")!.get(id);
    if (owner && owner.id !== productOwner && !owner.exports?.journeys?.includes(id)) {
      throw new Error("PRIVATE_MODULE_EXPOSURE");
    }
  }
  const domain = {
    id: source.id, objects: canonicalObjects(definitions),
    ...(definitions.some(owner => owner.dependencies !== undefined)
      ? { dependencies: definitions.flatMap(owner => owner.dependencies ?? []) } : {}),
    ...(definitions.some(owner => owner.policies !== undefined)
      ? { policies: definitions.flatMap(owner => owner.policies ?? []) } : {}),
    journeys: definitions.flatMap(owner => (owner.journeys ?? []).flatMap(item => item.execution ? [item.execution] : [])),
    surfaces: compileSurfaceExposures(source.surfaces, definitions),
  };
  const application = compile(domain);
  const presentation = owners.map(owner => resolvePresentation(owner.definition, owner.id, ownership));
  const objects = objectPublications(definitions);
  const program: ViewProgram = {
    version: ViewProgramVersion, productId: source.id, label: source.label,
    workspace: ownership.resolve(source.workspace, "view", productOwner),
    ...(objects.length ? { objects } : {}),
    views: definitions.flatMap(owner => owner.views ?? []),
    journeys: presentation.flatMap(owner => owner.journeys),
    destinations: presentation.flatMap(owner => owner.destinations),
    entry: ownership.resolve(source.entry, "destination", productOwner),
    navigation: source.navigation.map(item => ({ ...item, destination: ownership.resolve(item.destination, "destination", productOwner) })),
  };
  const human = domain.surfaces.filter(surface => surface.kind === "human");
  if (human.length === 0) throw new Error("MISSING_COMPOSITION_HUMAN_SURFACE");
  for (const surface of human) {
    compileViewProgram(program, application.surface(surface.id));
    viewProgramActivities(application, program, surface.id);
  }
  const result = freezeDeep({
    definition: domain as ComposedDefinition<P, typeof domain>,
    viewProgram: program,
    ...deriveModuleCatalog(owners, program, domain.surfaces),
  });
  recordProductModules(result.definition, mounted, admission.identities);
  registerCompiledProduct(result, application, result.viewProgram);
  return result;
}
