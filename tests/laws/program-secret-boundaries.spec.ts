import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { root } from "../support/sources.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
it("checks the actual program's source graph in the gate", () => {
  expect(programSecretBoundaries(root)).toEqual([]);
});
function fixture(files: Readonly<Record<string, string>>) {
  const home = mkdtempSync(join(tmpdir(), "program-boundary-"));
  const sources = {
    "package.json": JSON.stringify({ desert: { program: "src/main.ts" } }),
    "tsconfig.json": JSON.stringify({ compilerOptions: { paths: { "@shared/*": ["./src/shared/*"] } } }),
    "src/main.ts":
      Object.keys(files)
        .filter(file => file.startsWith("src/") && file !== "src/main.ts")
        .map(file => `import "./${file.slice(4)}";`)
        .join("\n") + "\nexport const program = { registry: [] };",
    ...files,
  };
  try {
    for (const [name, code] of Object.entries(sources)) {
      const file = join(home, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, code);
    }
    return programSecretBoundaries(home);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
}
it("a real consumer can import public names through testing.ts", () => {
  expect(
    fixture({
      "src/tools/fiscal.ts": `import type { SecretRef } from '${root}/src/testing.ts';
    export type Input = { key: SecretRef };`,
    }),
  ).toEqual([]);
});
it("a tool can format cents through the public catalog", () => {
  expect(fixture({ "src/tools/sales.ts": `import { shownMoney } from '${root}/src/catalogs/fields.ts';` })).toEqual([]);
});
for (const name of ["SecretResolver", "AdapterDeclaration", "HouseKeyProvider", "KeyStore", "adapterTest"])
  it(`a real consumer cannot launder ${name} through the testing barrel`, () => {
    expect(
      fixture({ "src/tools/fiscal.ts": `import { ${name} as renamed } from '${root}/src/testing.ts';` }).length,
    ).toBeGreaterThan(0);
  });
it("resolves tsconfig aliases and rejects transitive I/O outside the tools folder", () => {
  expect(
    fixture({
      "src/tools/fiscal.ts": "import '@shared/io';",
      "src/shared/io.ts": "import { readFileSync } from 'node:fs';",
    }).length,
  ).toBeGreaterThan(0);
});
it("composition and adapters cannot be used as a hiding place for tools", () => {
  for (const name of ["main", "adapters/sign"])
    expect(
      fixture({ [`src/${name}.ts`]: "export const tool = { acts: { run: () => process.env } };" }).length,
    ).toBeGreaterThan(0);
});
it("rejects indirect imports of composition and its factory", () => {
  expect(
    fixture({
      "src/main.ts":
        "import './tools/fiscal.ts'; export const factory = () => {}; export const program = { registry: [] };",
      "src/tools/fiscal.ts": "import { factory } from '../main.ts';",
    }).some(message => message.includes("../main.ts")),
  ).toBe(true);
});
it("rejects imports of adapters by tools", () => {
  expect(
    fixture({
      "src/adapters/port.ts": "export const port = {};",
      "src/tools/fiscal.ts": "import { port } from '../adapters/port.ts';",
    }).some(message => message.includes("adapters/port")),
  ).toBe(true);
});

it("also inspects a composition entry outside src", () => {
  expect(
    fixture({
      "package.json": JSON.stringify({ desert: { program: "main.ts" } }),
      "main.ts": "export const tool = { 'acts': { run: () => process.env } };",
    }).length,
  ).toBeGreaterThan(0);
});
