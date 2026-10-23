// Authoring API of the Visual Catalog. A declaration is data: these functions only validate and freeze it.
// Raises CATALOG_DECLARATION with the path of the first violation.
import { Value } from "@sinclair/typebox/value";
import { freezeDeep, type Frozen } from "../../json.ts";
import { DeclarationSchemas, type CompositionData, type DeclarationData, type DeclarationKind,
  type FoundationData, type MechanismData } from "./declaration-schema.ts";

export function validateDeclaration<K extends DeclarationKind>(kind: K, value: unknown): DeclarationData<K> {
  const schema = DeclarationSchemas[kind];
  if (Value.Check(schema, value)) return value;
  const first = Value.Errors(schema, value).First();
  const where = first ? `${first.path || "/"}: ${first.message}` : "not an object";
  throw new Error(`CATALOG_DECLARATION: ${kind}: ${where}`);
}

/** The contract is a live module value: it is kept by reference, never frozen by the catalog. */
function declarePiece<K extends "foundation" | "composition", D extends Frozen<DeclarationData<K>>>(kind: K, declaration: D) {
  validateDeclaration(kind, declaration);
  const { contract, ...data } = declaration;
  return Object.freeze({ ...freezeDeep(data), kind, contract });
}

export const defineFoundation = <const D extends Frozen<FoundationData>>(declaration: D) => declarePiece("foundation", declaration);
export const defineComposition = <const D extends Frozen<CompositionData>>(declaration: D) => declarePiece("composition", declaration);
export function defineMechanism<const D extends Frozen<MechanismData>>(declaration: D) {
  validateDeclaration("mechanism", declaration);
  return Object.freeze({ ...freezeDeep(declaration), kind: "mechanism" as const });
}
