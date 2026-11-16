// Repository-local names wrap the shared law readers.
import { join, resolve } from "node:path";
import { filesUnder as under, fromRoot as relativeTo, codeFiles, isSpec } from "../../src/checks/laws/law-files.ts";
import { importsOf as imported } from "../../src/checks/laws/adapters.ts";
export { isSpec, parsed } from "../../src/checks/laws/law-files.ts";
export { stringsOf, isProse, proseOf } from "../../src/checks/laws/law-words.ts";
export const root = resolve(import.meta.dirname, "../..");
export const src = join(root, "src");
export const filesUnder = (folder: string, accept = (path: string): boolean => path.endsWith(".ts")): string[] =>
  under(folder, accept);
export const fromRoot = (path: string): string => relativeTo(root, path);
export const sourceFiles = (): string[] => codeFiles({ root, code: ["src"] }).filter(file => !isSpec(file));
export const importsOf = (path: string, values = false): string[] => imported(path, values);
