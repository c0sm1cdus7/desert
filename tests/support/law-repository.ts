// Disposable repositories for planted violations, with only synthetic code and configuration.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach } from "vitest";
import type { Repository } from "../../src/checks/laws/law-files.ts";
import { root } from "./sources.ts";

import pkg from "../../package.json" with { type: "json" };
export const baseImportOptions = pkg.desert.laws;

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
export const lawOptions = {
  code: ["src"],
  base: null,
  adapters: [],
  adapterUsers: {},
  mayTalkOutside: {},
  catalog: [],
  exemptWords: {},
  exemptRules: {},
  data: {},
  maxLines: 300,
};
export const lawPackage = {
  name: "fixture",
  private: true,
  type: "module",
  engines: { node: ">=24" },
  scripts: {
    gate: "pnpm format:check && pnpm lint && pnpm typecheck && pnpm test && pnpm laws",
    lint: "eslint --max-warnings 0 .",
  },
  desert: { program: "src/a.ts", testDistribution: "tests/distribution.ts", laws: lawOptions },
};
export function lawRepository(files: Readonly<Record<string, string>>): Repository {
  const folder = mkdtempSync(join(tmpdir(), "repository-law-"));
  folders.push(folder);
  const compilerOptions = {
    strict: true,
    erasableSyntaxOnly: true,
    noUncheckedIndexedAccess: true,
    exactOptionalPropertyTypes: true,
  };
  const lint = pathToFileURL(join(root, "eslint.config.js")).href;
  const contents = {
    "src/a.ts": "export const id = 1;",
    "tests/support.ts": "export {};",
    "vitest.config.ts":
      "export default { test: { projects: [\n" +
      '{ test: { include: ["src/**/*.spec.ts", "tests/program/**/*.checks.ts"] } },\n' +
      '{ test: { include: ["tests/laws/**/*.spec.ts"] } } ] } };',
    "eslint.config.js": lintConfiguration(lint),
    "tsconfig.json": JSON.stringify({ compilerOptions, include: ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"] }),
    "package.json": JSON.stringify(lawPackage),
    ...files,
  };
  for (const [path, text] of Object.entries(contents)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true });
    writeFileSync(join(folder, path), text);
  }
  return { root: folder, code: ["src"] };
}

/** Split the URL as data: the generated source keeps its line budget at any checkout depth. */
export function lintConfiguration(url: string): string {
  const chunks = Array.from(url.matchAll(/.{1,60}/gu), match => JSON.stringify(match[0]));
  return `const url = [\n${chunks.join(",\n")}\n].join("");\nexport default (await import(url)).default;\n`;
}
