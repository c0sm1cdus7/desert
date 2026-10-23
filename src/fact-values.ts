import { Type } from "@sinclair/typebox";
import { AssetReferenceSchema, type AssetReference } from "./assets/types.ts";

export const FactValueSchema = Type.Union([Type.String(), Type.Number(), AssetReferenceSchema, Type.Array(Type.String())]);
export type FactValue = string | number | AssetReference | readonly string[];
export type Facts = Record<string, FactValue>;

export function sameFact(left: FactValue | undefined, right: FactValue | undefined): boolean {
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left) && Array.isArray(right) && left.length === right.length
      && left.every((value, index) => value === right[index]);
  }
  return typeof left === "object" && typeof right === "object" && "reference" in left && "reference" in right
    ? left.reference === right.reference : left === right;
}
