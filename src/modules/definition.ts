import { freezeDeep, jsonSnapshot } from "../json.ts";
import { Check } from "@sinclair/typebox/value";
import { ModuleDefinitionSchema } from "./schema.ts";
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
  const snapshot = jsonSnapshot(lowerOwnedReferences(source, admission)) as unknown as ResolvedModuleDefinition;
  if (!Check(ModuleDefinitionSchema, snapshot)) throw new Error("INVALID_MODULE_DEFINITION");
  const ownership = ownershipRegistry([{ id: snapshot.id, definition: snapshot, exports: snapshot.exports }]);
  validateOwnedDomain(snapshot);
  validateObjectPublications(snapshot);
  resolvePresentation(snapshot, snapshot.id, ownership);
  const handle = issueModule(freezeDeep(snapshot), admission.identities, aliases);
  rememberModuleSource(definition, handle);
  return handle as RegisteredModule<M>;
}
