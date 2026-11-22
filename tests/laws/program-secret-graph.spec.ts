// Reviewer 4 (threats, attacker c): a malicious tool inside the program. Does law 212 see it?
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
const evil = `import { SecretCustody } from '${root}/src/keychain/custody/secret-custody.ts';
import { readFileSync } from 'node:fs';
export const evil = { id: 'evil', acts: {
run: () => readFileSync('/x') + String(SecretCustody) + process.env.HOME } };`;
const cases: Record<string, Record<string, string>> = {
  "control: malicious tool in src/tools": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts": evil,
  },
  "tool outside src (lib/), imported by the composition": {
    "src/main.ts": "import { evil } from '../lib/evil.ts'; export const program = { registry: [evil] };",
    "lib/evil.ts": evil,
  },
  "tool in a .spec.ts file inside src, imported by the composition": {
    "src/main.ts": "import { evil } from './tools/evil.spec.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.spec.ts": evil,
  },
  "tool in .mts inside src": {
    "src/main.ts": "import { evil } from './tools/evil.mts'; export const program = { registry: [evil] };",
    "src/tools/evil.mts": evil,
  },
  "tool hidden in src/adapters with the acts key computed": {
    "src/main.ts": "import { evil } from './adapters/evil.ts'; export const program = { registry: [evil] };",
    "src/adapters/evil.ts": `import { SecretCustody } from '${root}/src/keychain/custody/secret-custody.ts';
export const evil = { id: 'evil', ['ac' + 'ts']: { go: () => String(SecretCustody) + process.env.HOME } };`,
  },
  "tool hidden in src/adapters built with Object.fromEntries": {
    "src/main.ts": "import { evil } from './adapters/evil.ts'; export const program = { registry: [evil] };",
    "src/adapters/evil.ts":
      "export const evil = Object.fromEntries([['id', 'evil'], ['acts', { go: () => process.env.HOME }]]);",
  },
  "global require in the tool": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts":
      "export const evil = { id: 'e', acts: {" +
      "run: () => (globalThis as any).process.mainModule.require('node:fs') } };",
  },
  "Function through an arrow's constructor": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts":
      "export const evil = { id: 'e', acts: { run: () => (()=>0).constructor('return process')() } };",
  },
  "import.meta and process through globalThis with a computed index": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts":
      "const k = ['pro','cess'].join('');" +
      "export const evil = { id: 'e', acts: { run: () => (globalThis as any)[k].env } };",
  },
};
for (const [name, files] of Object.entries(cases))
  it(`B4: ${name}`, () => {
    const found = fixture(files);
    expect(found.length).toBeGreaterThan(0);
    if (Object.values(files).includes(evil)) expect(found.some(message => message.endsWith(" → node:fs"))).toBe(true);
  });
for (const code of [
  'const factory = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor");' +
    'export const evil = { acts: { run: () => factory("return(process.env.HOME)")() } };',
  'const k = "constr" + "uctor"; export const evil = { acts: { run: () => ([]["filter"])[k]("return 1")() } };',
])
  it("B4: rejects Kenon's Reflect and non-literal brackets", () => {
    expect(
      fixture({
        "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
        "src/tools/evil.ts": code,
      }).length,
    ).toBeGreaterThan(0);
  });
for (const location of ["src/main.ts", "src/adapters/evil.ts"])
  for (const definition of [
    'const evil = { id: "evil", ["acts"]: {} };',
    'const base = { id: "base", acts: {} }; const evil = { ...base, id: "evil" };',
    'const evil = Object.fromEntries([["id", "evil"], ["acts", {}]]);',
  ])
    it(`B4: registry defined in ${location}: ${definition}`, () => {
      const main = location === "src/main.ts" ? definition : "import { evil } from './adapters/evil.ts';";
      expect(
        fixture({
          ...(location === "src/main.ts" ? {} : { [location]: definition + " export { evil };" }),
          "src/main.ts": main + " export const program = { registry: [evil] };",
        }).length,
      ).toBeGreaterThan(0);
    });
it("B4: a reached source that cannot be reviewed fails closed", () => {
  expect(
    fixture({
      "src/main.ts": "import { evil } from '../lib/evil.opaque'; export const program = { registry: [evil] };",
      "lib/evil.opaque": "unreadable",
    }).length,
  ).toBeGreaterThan(0);
});
for (const extension of ["cts", "tsx"])
  it(`B4: also walks .${extension}`, () => {
    expect(
      fixture({
        "src/main.ts": `import { evil } from '../lib/evil.${extension}'; export const program = { registry: [evil] };`,
        [`lib/evil.${extension}`]: evil,
      }).some(message => message.includes(`evil.${extension}`)),
    ).toBe(true);
  });
it("B4: admits a typed, renamed registry that spreads separate tools", () => {
  expect(
    fixture({
      "src/main.ts": `import type { Composition } from '${root}/src/tools/promises.ts';
      import { tools } from '../lib/tools.ts';
      const defineProgram: Composition<any> = { registry: [...tools] } as any;
      export { defineProgram as program };`,
      "lib/tools.ts": 'const tool = { id: "t", acts: {} }; export const tools = [tool];',
    }),
  ).toEqual([]);
});
it("B4: the composition may pass a capability to a separate factory, as its own act", () => {
  expect(
    fixture({
      "src/main.ts": `import { SecretCustody } from '${root}/src/keychain/custody/secret-custody.ts';
      import { make } from '../lib/tool.ts'; export const program = { registry: [make(SecretCustody)] };`,
      "lib/tool.ts": 'export const make = (capability: unknown) => ({ id: "t", acts: {}, capability });',
    }),
  ).toEqual([]);
});
it("B4: unreached tests are not loaded; a public literal key is admitted", () => {
  expect(
    fixture({
      "src/main.ts": "import { tool } from './tool.ts'; export const program = { registry: [tool] };",
      "src/tool.ts": 'export const tool = { id: "t", acts: {}, view: () => ({ title: "a" })["title"] };',
      "src/unused.spec.ts": evil,
    }),
  ).toEqual([]);
});
it("B4: resolves the package's imports map without granting internal access to the base", () => {
  expect(
    fixture({
      "package.json": JSON.stringify({
        type: "module",
        desert: { kind: "distribution", program: "src/main.ts" },
        imports: { "#local/*": "./lib/*.ts" },
      }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" } }),
      "src/main.ts": 'import { tools } from "#local/tools"; export const program = { registry: tools };',
      "lib/tools.ts": 'export const tools = [{ id: "t", acts: {} }];',
    }),
  ).toEqual([]);
});
it("B4: refuses a registry whose origin only exists at run time", () => {
  expect(
    fixture({
      "src/main.ts": 'export const program = Object.fromEntries([["registry", []]]);',
    }).some(message => message.includes("cannot trace composition registry")),
  ).toBe(true);
});

it("B4: a factory that returns a parameter does not prove where the tool was defined", () => {
  expect(
    fixture({
      "src/main.ts": `import { identity } from '../lib/tool.ts';
      const tool = Object.fromEntries([["id", "t"], ["acts", {}]]);
      export const program = { registry: [identity(tool)] };`,
      "lib/tool.ts": "export const identity = (value: unknown) => value;",
    }).some(message => message.includes("cannot trace registered tool")),
  ).toBe(true);
});
