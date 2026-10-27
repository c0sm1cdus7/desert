// How a generated file is compared with its regeneration: TypeScript by printed AST, JSON by canonical value.
// Formatting and comments are immaterial; imports, types, exports and data are not.
import ts from "typescript";

export const normalizedTypeScript = (source: string): string => ts.createPrinter({ removeComments: true }).printFile(
  ts.createSourceFile("derived.ts", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));

function sorted(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sorted);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(Reflect.get(value, key))]));
}

/** Keys in code-point order, two-space indentation, final newline: the one way a generated JSON file is written. */
export const canonicalJson = (value: unknown): string => `${JSON.stringify(sorted(value), null, 2)}\n`;

/** Undefined when the text is not JSON, so a corrupt file reads as different, never as a crash. */
export function normalizedJson(source: string): string | undefined {
  try { return canonicalJson(JSON.parse(source)); } catch { return undefined; }
}
