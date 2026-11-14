// Revisor 4 (amenazas, atacante c): una herramienta maliciosa dentro del programa. ¿La ley 212 la ve?
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { expect, it } from "vitest";
import { root } from "../support/sources.ts";
import { programSecretBoundaries } from "./program-secret-boundaries.ts";
function fixture(files: Readonly<Record<string, string>>) {
  const home = mkdtempSync(join(tmpdir(), "rev4-boundary-"));
  const sources = {
    "package.json": JSON.stringify({ desert: { program: "src/main.ts" } }),
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
const evil = `import { SecretCustody } from '${root}/src/adapters/secrets/custody/secret-custody.ts';
import { readFileSync } from 'node:fs';
export const evil = { id: 'evil', acts: {
run: () => readFileSync('/x') + String(SecretCustody) + process.env.HOME } };`;
const cases: Record<string, Record<string, string>> = {
  "control: herramienta maliciosa en src/tools": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts": evil,
  },
  "herramienta fuera de src (lib/), importada por la composición": {
    "src/main.ts": "import { evil } from '../lib/evil.ts'; export const program = { registry: [evil] };",
    "lib/evil.ts": evil,
  },
  "herramienta en un archivo .spec.ts dentro de src, importada por la composición": {
    "src/main.ts": "import { evil } from './tools/evil.spec.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.spec.ts": evil,
  },
  "herramienta en .mts dentro de src": {
    "src/main.ts": "import { evil } from './tools/evil.mts'; export const program = { registry: [evil] };",
    "src/tools/evil.mts": evil,
  },
  "herramienta escondida en src/adapters con la clave acts calculada": {
    "src/main.ts": "import { evil } from './adapters/evil.ts'; export const program = { registry: [evil] };",
    "src/adapters/evil.ts": `import { SecretCustody } from '${root}/src/adapters/secrets/custody/secret-custody.ts';
export const evil = { id: 'evil', ['ac' + 'ts']: { go: () => String(SecretCustody) + process.env.HOME } };`,
  },
  "herramienta escondida en src/adapters armada con Object.fromEntries": {
    "src/main.ts": "import { evil } from './adapters/evil.ts'; export const program = { registry: [evil] };",
    "src/adapters/evil.ts":
      "export const evil = Object.fromEntries([['id', 'evil'], ['acts', { go: () => process.env.HOME }]]);",
  },
  "require global en la herramienta": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts":
      "export const evil = { id: 'e', acts: {" +
      "run: () => (globalThis as any).process.mainModule.require('node:fs') } };",
  },
  "Function por constructor de una flecha": {
    "src/main.ts": "import { evil } from './tools/evil.ts'; export const program = { registry: [evil] };",
    "src/tools/evil.ts":
      "export const evil = { id: 'e', acts: { run: () => (()=>0).constructor('return process')() } };",
  },
  "import.meta y process por globalThis con índice calculado": {
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
  'const fabrica = Reflect.get(Reflect.get([], "filter"), "constr" + "uctor");' +
    'export const evil = { acts: { run: () => fabrica("return(process.env.HOME)")() } };',
  'const k = "constr" + "uctor"; export const evil = { acts: { run: () => ([]["filter"])[k]("return 1")() } };',
])
  it("B4: rechaza Reflect y corchetes no literales de Kenon", () => {
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
    it(`B4: registro definido en ${location}: ${definition}`, () => {
      const main = location === "src/main.ts" ? definition : "import { evil } from './adapters/evil.ts';";
      expect(
        fixture({
          ...(location === "src/main.ts" ? {} : { [location]: definition + " export { evil };" }),
          "src/main.ts": main + " export const program = { registry: [evil] };",
        }).length,
      ).toBeGreaterThan(0);
    });
it("B4: una fuente alcanzada que no se puede revisar falla cerrada", () => {
  expect(
    fixture({
      "src/main.ts": "import { evil } from '../lib/evil.opaque'; export const program = { registry: [evil] };",
      "lib/evil.opaque": "unreadable",
    }).length,
  ).toBeGreaterThan(0);
});
for (const extension of ["cts", "tsx"])
  it(`B4: recorre también .${extension}`, () => {
    expect(
      fixture({
        "src/main.ts": `import { evil } from '../lib/evil.${extension}'; export const program = { registry: [evil] };`,
        [`lib/evil.${extension}`]: evil,
      }).some(message => message.includes(`evil.${extension}`)),
    ).toBe(true);
  });
it("B4: admite un registro tipado, renombrado y con spread de herramientas separadas", () => {
  expect(
    fixture({
      "src/main.ts": `import type { Composition } from '${root}/src/tools/promises.ts';
      import { tools } from '../lib/tools.ts';
      const programa: Composition<any> = { registry: [...tools] } as any;
      export { programa as program };`,
      "lib/tools.ts": 'const tool = { id: "t", acts: {} }; export const tools = [tool];',
    }),
  ).toEqual([]);
});
it("B4: la composición puede pasar capacidad a una fábrica separada, como acto propio", () => {
  expect(
    fixture({
      "src/main.ts": `import { SecretCustody } from '${root}/src/adapters/secrets/custody/secret-custody.ts';
      import { make } from '../lib/tool.ts'; export const program = { registry: [make(SecretCustody)] };`,
      "lib/tool.ts": 'export const make = (capability: unknown) => ({ id: "t", acts: {}, capability });',
    }),
  ).toEqual([]);
});
it("B4: las pruebas no alcanzadas no se cargan; una clave literal pública sí se admite", () => {
  expect(
    fixture({
      "src/main.ts": "import { tool } from './tool.ts'; export const program = { registry: [tool] };",
      "src/tool.ts": 'export const tool = { id: "t", acts: {}, view: () => ({ title: "a" })["title"] };',
      "src/unused.spec.ts": evil,
    }),
  ).toEqual([]);
});
it("B4: resuelve el mapa de imports del paquete sin dar acceso interno a la base", () => {
  expect(
    fixture({
      "package.json": JSON.stringify({
        type: "module",
        desert: { program: "src/main.ts" },
        imports: { "#local/*": "./lib/*.ts" },
      }),
      "tsconfig.json": JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext" } }),
      "src/main.ts": 'import { tools } from "#local/tools"; export const program = { registry: tools };',
      "lib/tools.ts": 'export const tools = [{ id: "t", acts: {} }];',
    }),
  ).toEqual([]);
});
it("B4: no acepta un registro cuyo origen solo existe al ejecutar", () => {
  expect(
    fixture({
      "src/main.ts": 'export const program = Object.fromEntries([["registry", []]]);',
    }).some(message => message.includes("cannot trace composition registry")),
  ).toBe(true);
});

it("B4: una fábrica que devuelve un parámetro no prueba dónde se definió la herramienta", () => {
  expect(
    fixture({
      "src/main.ts": `import { identity } from '../lib/tool.ts';
      const tool = Object.fromEntries([["id", "t"], ["acts", {}]]);
      export const program = { registry: [identity(tool)] };`,
      "lib/tool.ts": "export const identity = (value: unknown) => value;",
    }).some(message => message.includes("cannot trace registered tool")),
  ).toBe(true);
});
