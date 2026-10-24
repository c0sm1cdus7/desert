import { freezeDeep, jsonSnapshot } from "../json.ts";
import { Check } from "@sinclair/typebox/value";
import { DeclaredModuleDefinitionSchema, ModuleDefinitionSchema } from "./schema.ts";
import { keysAsText } from "../views/declared.ts";
import { ownershipRegistry, validateOwnedDomain } from "./ownership.ts";
import { resolvePresentation } from "./presentation.ts";
import type { Closed, ModuleDefinition, RegisteredModule, ResolvedModuleDefinition } from "./types.ts";
import { validateObjectPublications } from "./object-publication.ts";
import type { ModuleLinks } from "./links.ts";
import { declarationRecord } from "./declaration-data.ts";
import { referenceAdmission } from "./admission.ts";
import { lowerOwnedReferences } from "./lower-references.ts";
import { issueModule } from "./references.ts";
import { registeredModuleSource, rememberModuleSource } from "./module-source.ts";

/** A module is declarations, never an executable controller or renderer extension. */
export function defineModule<const M extends ModuleDefinition>(definition: Closed<M, ModuleDefinition> & ModuleLinks<NoInfer<M>>): RegisteredModule<M> {
  const registered = registeredModuleSource(definition);
  if (registered) return registered as RegisteredModule<M>;
  const source = declarationRecord(definition);
  const admission = referenceAdmission(source, false);
  const aliases = admission.aliases();
  const declared = jsonSnapshot(lowerOwnedReferences(source, admission));
  if (!Check(DeclaredModuleDefinitionSchema, declared)) throw new Error("INVALID_MODULE_DEFINITION");
  // No locale is chosen yet: the structural checks read the shape, each message's key standing in for its sentence.
  const shape = keysAsText(declared);
  if (!Check(ModuleDefinitionSchema, shape)) throw new Error("INVALID_MODULE_DEFINITION");
  const snapshot: ResolvedModuleDefinition = shape;
  const ownership = ownershipRegistry([{ id: snapshot.id, definition: snapshot, exports: snapshot.exports }]);
  validateOwnedDomain(snapshot);
  validateObjectPublications(snapshot);
  resolvePresentation(snapshot, snapshot.id, ownership);
  // The module keeps its messages; the product's catalog resolves them when the product is composed.
  const handle = issueModule(freezeDeep(declared), admission.identities, aliases);
  rememberModuleSource(definition, handle);
  return handle as RegisteredModule<M>;
}
