// Composition is a root of the calculation graph too; omitting it cannot conceal imported calculations.
import { resolve } from "node:path";
import { CodeProjectionVersion } from "../../src/runtime/calculation-version.ts";
import { codeFiles } from "../../src/runtime/code-files.ts";
import { checkCodeImports } from "../../src/checks/code/code-imports.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import type { Composed } from "./load.ts";
export function checkProgramCode<X extends Program>({ program, where }: Composed<X>): void {
  const version = program.projectionVersion;
  if (!(version instanceof CodeProjectionVersion)) return;
  const files = codeFiles(version.trees, version.extensions);
  const composition = resolve(where);
  if (!files.some(({ file }) => file === composition))
    throw new Error(`Composition outside declared calculation code: ${composition}`);
  checkCodeImports(files);
}
