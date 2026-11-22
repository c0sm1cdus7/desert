import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { root } from "../support/sources.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
function fixture(files: Readonly<Record<string, string>>) {
  const home = mkdtempSync(join(tmpdir(), "rev4-boundary-"));
  const sources = {
    "package.json": JSON.stringify({ desert: { kind: "distribution", program: "src/main.ts" } }),
    "tsconfig.json": JSON.stringify({ compilerOptions: {} }),
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

for (const [name, main, tool] of [
  [
    "typed return",
    "import { a } from '../lib/t.ts'; type C = { registry: readonly object[] }; " +
      "function build(): C { return { registry: [a] }; } export const program = build();",
    'export const a = { id: "a", acts: {} };',
  ],
  [
    "object property",
    "import { tools } from '../lib/t.ts'; export const program = { registry: [tools.sales] };",
    'export const tools = { sales: { id: "v", acts: {} } };',
  ],
  [
    "export default",
    "import sales from '../lib/t.ts'; export const program = { registry: [sales] };",
    'export default { id: "v", acts: {} };',
  ],
  [
    "freeze",
    "import { frozen } from '../lib/t.ts'; export const program = { registry: frozen };",
    'const a = { id: "a", acts: {} }; export const frozen = Object.freeze([a]);',
  ],
  [
    "as const",
    "import { a } from '../lib/t.ts'; export const program = { registry: [a] as const };",
    'export const a = { id: "a", acts: {} };',
  ],
] as const)
  it(`admits a traceable registry: ${name}`, () => {
    expect(fixture({ "src/main.ts": main, "lib/t.ts": tool })).toEqual([]);
  });
it("rejects freeze of a local Object", () => {
  const found = fixture({
    "src/main.ts":
      `import { a } from '../lib/t.ts'; const Object = { freeze: (x: unknown) => x }; ` +
      `export const program = { registry: Object.freeze([a]) };`,
    "lib/t.ts": 'export const a = { id: "a", acts: {} };',
  });
  expect(found.some(message => message.includes("cannot trace registry"))).toBe(true);
});
it("admits imported JSON as data", () => {
  expect(
    fixture({
      "src/main.ts": `import { a } from '../lib/t.ts'; export const program = { registry: [a] };`,
      "lib/t.ts": `import data from './data.json' with { type: 'json' }; export const a = { id: data.id, acts: {} };`,
      "lib/data.json": '{"id":"a"}',
    }),
  ).toEqual([]);
});
it("rejects a computed registry", () => {
  expect(
    fixture({
      "src/main.ts": `import { all } from '../lib/t.ts'; export const program = { registry: all.filter(Boolean) };`,
      "lib/t.ts": 'export const all = [{ id: "a", acts: {} }];',
    }).some(message => message.includes("cannot trace registry")),
  ).toBe(true);
});
it("rejects a privileged factory", () => {
  expect(
    fixture({
      "src/main.ts": `import { make } from './adapters/t.ts'; export const program = { registry: [make()] };`,
      "src/adapters/t.ts": 'export function make() { return { id: "a" }; }',
    }).some(message => message.includes("tool factory belongs")),
  ).toBe(true);
});
it("rejects a factory without a return", () => {
  expect(
    fixture({
      "src/main.ts": `import { make } from '../lib/t.ts'; export const program = { registry: [make()] };`,
      "lib/t.ts": "export function make() {}",
    }).some(message => message.includes("cannot trace tool factory return")),
  ).toBe(true);
});
it("rejects import.meta in tools", () => {
  expect(
    fixture({
      "src/main.ts": `import { a } from '../lib/t.ts'; export const program = { registry: [a] };`,
      "lib/t.ts": 'export const a = { id: "a", acts: {}, value: import.meta.url };',
    }).some(message => message.includes("import.meta")),
  ).toBe(true);
});
it("rejects a public namespace import", () => {
  expect(
    fixture({
      "src/main.ts": `import { a } from '../lib/t.ts'; export const program = { registry: [a] };`,
      "lib/t.ts": `import * as api from '${root}/src/tools/promises.ts'; export const a = { id: 'a', acts: {}, api };`,
    }).some(message => message.includes("promises.ts")),
  ).toBe(true);
});
it("rejects a tool modified directly in the composition", () => {
  const hidden = 'Object.fromEntries([["id", "h"], ["acts", {}]])';
  const found = fixture({
    "src/main.ts":
      `import { tool } from '../lib/t.ts'; Object.assign(tool, { acts: ${hidden}.acts }); ` +
      "export const program = { registry: [tool] };",
    "lib/t.ts": 'export const tool = { id: "t", acts: {} };',
  });
  expect(found.some(message => message.includes("separate tool declarations"))).toBe(true);
});
it("points at the program's composition when its registry is computed", () => {
  const found = fixture({
    "src/main.ts":
      `import { all } from '../lib/t.ts'; type C = { registry: object[] }; ` +
      `function build(): C { return { registry: Object.entries(all).map(([, tool]) => tool) }; } ` +
      `export const program = build();`,
    "lib/t.ts": 'export const all = { a: { id: "a", acts: {} } };',
  });
  expect(found.some(message => message.includes("src/main.ts: cannot trace registry"))).toBe(true);
});
it("reviews every return of the composition", () => {
  const found = fixture({
    "src/main.ts":
      `import { a } from '../lib/t.ts'; function build(x: boolean) { ` +
      `if (x) return { registry: [a] }; return { registry: [ { id: 'local' } ] }; } ` +
      `export const program = build(true);`,
    "lib/t.ts": 'export const a = { id: "a", acts: {} };',
  });
  expect(found.some(message => message.includes("tool belongs to composition"))).toBe(true);
});
