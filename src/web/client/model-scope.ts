import type { HumanSurface, Mutation, Read } from "../types.ts";
import { mutationPresentation, readPresentation } from "./presentation.ts";

export type ReadModelScope = {
  readonly kind: "read";
  readonly read: Read;
  readonly creations: readonly Mutation[];
  readonly primaryCreation?: Mutation;
  readonly subjectActions: readonly Mutation[];
  readonly referenceCreation?: "separate";
};
export type ModelScope = ReadModelScope | { readonly kind: "presentation" };

/** Presentation may remove companion creation, never add or alter canonical authority. */
export function referenceScopeSurface(surface:HumanSurface,scope:ModelScope):HumanSurface {
  if(scope.kind!=="read" || scope.referenceCreation!=="separate")return surface;
  return {...surface,fieldReferences:Object.fromEntries(Object.entries(surface.fieldReferences ?? {}).map(([key,reference])=>{
    if(!key.startsWith(`${scope.read.subject}.`))return [key,reference];
    const {create:_create,...selection}=reference;
    return [key,selection];
  }))};
}

/** Internal execution scope references canonical declarations; it never rewrites a surface. */
export function readModelScope(surface: HumanSurface, binding: {
  read: string; creations: readonly string[]; subjectActions: readonly string[]; primaryCreation?: string; referenceCreation?: "separate";
}): ReadModelScope {
  if (binding.referenceCreation !== undefined && binding.referenceCreation !== "separate") throw new Error("INVALID_REFERENCE_CREATION_POLICY");
  const read = readPresentation(surface, binding.read);
  const mutation = (id: string, subject: boolean) => {
    const value = mutationPresentation(surface, id);
    if (value.object !== read.subject || Boolean(value.subject) !== subject) throw new Error("INVALID_MODEL_SCOPE");
    return value;
  };
  const creations = binding.creations.map(id => mutation(id, false));
  const subjectActions = binding.subjectActions.map(id => mutation(id, true));
  const primaryCreation = binding.primaryCreation === undefined ? undefined : creations.find(item => item.id === binding.primaryCreation);
  if (binding.primaryCreation !== undefined && !primaryCreation) throw new Error("INVALID_MODEL_SCOPE");
  return Object.freeze({ kind: "read", read, creations: Object.freeze(creations), subjectActions: Object.freeze(subjectActions),
    ...(binding.referenceCreation ? {referenceCreation:binding.referenceCreation} : {}),
    ...(primaryCreation ? { primaryCreation } : {}) });
}

export function requireReadScope(scope: ModelScope): ReadModelScope {
  if (scope.kind !== "read") throw new Error("READ_MODEL_SCOPE_REQUIRED");
  return scope;
}
