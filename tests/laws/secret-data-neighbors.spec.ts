import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
for (const [name, code] of Object.entries({
  desestructurarConversion:
    "const original = {} as Record<string, number>; const { value: objeto } = { value: original };" +
    "const clave = 'a'; objeto[clave];",
  plantilla: 'const objeto: Record<string, number> = {}; objeto[`con${"structor"}`];',
  claveAsignada:
    'const objeto: Record<string, number> = {}; let clave: string = "a";' +
    'clave = "con" + "structor"; objeto[clave];',
  conversionPorParametro:
    'function leer(objeto: Record<string, number>) { const clave = "a"; return objeto[clave]; }' +
    "leer((() => 1) as unknown as Record<string, number>);",
}))
  it(`212 vecinos: rechaza ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
it("212 vecinos: rechaza conversión exportada por una auxiliar", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { objeto } from './helper.ts'; const clave = 'a'; objeto[clave];",
        "helper.ts": "export const objeto = (() => 1) as unknown as Record<string, number>;",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 vecinos: sigue argumentos convertidos hasta una auxiliar importada", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { leer } from './helper.ts'; leer({} as Record<string, number>);",
        "helper.ts": "export function leer(objeto: Record<string, number>) { const k = 'a'; return objeto[k]; }",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 vecinos: una asignación inocua no tapa otra clave prohibida", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "const tabla: Record<string, number> = {}; let k: string = ''; k = 'a';" +
          "k = 'con' + 'structor'; tabla[k];",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 vecinos: un índice numérico fuera de rango sigue siendo lectura de datos", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "const tupla: readonly [string, number] = ['a', 1]; const i: number = 20; tupla[i];",
      },
      policy,
    ),
  ).toEqual([]);
});
it("212 vecinos: la composición confiable sigue pudiendo entregar datos tipados", () => {
  expect(
    secretBoundaryViolations(
      {
        "main.ts": "import { leer } from './tool.ts'; leer({} as Record<string, number>);",
        "tool.ts": "export function leer(objeto: Record<string, number>) { const k = 'a'; return objeto[k]; }",
      },
      { ...policy, composition: ["main.ts"] },
    ),
  ).toEqual([]);
});
it("212 vecinos: los datos de un esquema público conservan su tipo al indexarse", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "import { Type, type Static } from '@sinclair/typebox';" +
          "const esquema = Type.Object({ a: Type.Number() }); type Dato = Static<typeof esquema>;" +
          "export function leer(lista: Dato[], i: number) { return lista[i]; }",
      },
      { ...policy, publicModules: { "@sinclair/typebox": ["Type", "Static"] } },
    ),
  ).toEqual([]);
});
it("212 vecinos: tener declaraciones instaladas no autoriza un import", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": "import { Type } from '@sinclair/typebox'; export const esquema = Type.Number();",
      },
      policy,
    ),
  ).toContain("tool.ts:1:1 → @sinclair/typebox");
});
it("212 vecinos: desestructurar un arreglo no lee una propiedad con el nombre de la variable", () => {
  expect(secretBoundaryViolations({ "tool.ts": "const [constructor] = [1];" }, policy)).toEqual([]);
});
it("212 vecinos: una clave desestructurada con escape Unicode sigue prohibida", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts": String.raw`const { "constr\u0075ctor": fabrica } = {};`,
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
it("212 vecinos: un argumento incompatible se rechaza sin romper el comprobador", () => {
  expect(
    secretBoundaryViolations(
      {
        "tool.ts":
          "import { leer } from './reader.ts'; import { dato } from './data.ts';" +
          "leer(dato); const tabla = {} as Record<string, number>; const k = 'a'; tabla[k];",
        "reader.ts":
          "import type { B } from './b.ts'; export function leer(x: { item: B }) { const k = 'item'; return x[k]; }",
        "data.ts": "import type { A } from './a.ts'; export const dato: { item: A } = { item: { a: 1 } };",
        "a.ts": "export interface A { a: number }",
        "b.ts": "export interface B { b: string }",
      },
      policy,
    ).length,
  ).toBeGreaterThan(0);
});
