// Resolve the declared executable composition without dynamically importing undeclared calculation code.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === "object" ? Reflect.get(value, key) : undefined;
export function terminalProgram(root: string): string {
  const manifest: unknown = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  const entry = field(field(manifest, "desert"), "program");
  if (typeof entry !== "string") throw new Error('Missing or invalid "desert.program" string in package.json');
  return resolve(root, entry);
}
