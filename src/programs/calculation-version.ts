// A code-derived version carries its declaration; it cannot silently turn into a manually maintained string.
import { resolve } from "node:path";
import { codeExtensions, projectionVersion } from "./projection-version.ts";
const versions = new Map<string, string>();
export class CodeProjectionVersion {
  readonly kind = "code";
  readonly trees: readonly string[];
  readonly extensions: readonly string[];
  readonly value: string;
  constructor(trees: readonly string[], extensions: readonly string[] = codeExtensions) {
    this.trees = Object.freeze(trees.map(tree => resolve(tree)));
    this.extensions = Object.freeze([...extensions]);
    const key = JSON.stringify([this.trees, this.extensions]);
    this.value = versions.get(key) ?? projectionVersion(this.trees, this.extensions);
    versions.set(key, this.value);
    Object.freeze(this);
  }
}
export type CalculationVersion = string | CodeProjectionVersion;
export const codeProjectionVersion = (trees: readonly string[], extensions: readonly string[] = codeExtensions) =>
  new CodeProjectionVersion(trees, extensions);
export function requireProjectionVersion(value: unknown): asserts value is CalculationVersion {
  if (value instanceof CodeProjectionVersion || (typeof value === "string" && value.trim())) return;
  throw new Error("An explicit projectionVersion is required");
}
export const calculationIdentity = (value: CalculationVersion): string =>
  typeof value === "string" ? value : `code:${value.value}`;
