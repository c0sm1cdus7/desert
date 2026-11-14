import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const forms = {
  corchetes: "export function leer(o: T, k: string) { return o[k]; }",
  declaración: "export function leer(o: T, k: string) { const { [k]: v } = o; return v; }",
  asignación: "export function leer(o: T, k: string) { let v: unknown; ({ [k]: v } = o); return v; }",
  parámetro: "export function leer(k: string, { [k]: v }: T) { return v; }",
};
const values = {
  texto: "string",
  fecha: "Date",
  mapa: "ReadonlyMap<string, number>",
  conjunto: "ReadonlySet<string>",
  expresión: "RegExp",
  error: "Error",
  promesa: "Promise<number>",
  bytes: "Uint8Array",
  clase: "Item",
  fila: "{ id: string; etiqueta(): string }",
  claseVacía: "Empty",
  invocableConPropiedad: "(() => void) & { id: string }",
  construibleConPropiedad: "(new () => Item) & { id: string }",
  any: "any",
  unknown: "unknown",
  object: "object",
  vacío: "{}",
  función: "() => void",
  constructor: "new () => Item",
  unión: "string | (() => void)",
};
const rejected = new Set([
  "any",
  "unknown",
  "object",
  "vacío",
  "función",
  "constructor",
  "unión",
  "invocableConPropiedad",
  "construibleConPropiedad",
]);
for (const [form, body] of Object.entries(forms))
  it(`212 formas: ${form} juzga el valor elegido, no el destino ni los métodos internos`, () => {
    const sources = Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        `${name}.ts`,
        `class Empty {} class Item { id = ''; } type T = Record<string, ${value}>; ${body}`,
      ]),
    );
    const found = secretBoundaryViolations(sources, { ...policy, tools: Object.keys(sources) });
    for (const name of Object.keys(values))
      expect(
        found.some(message => message.startsWith(`${name}.ts`)),
        name,
      ).toBe(rejected.has(name));
  });
for (const [name, code] of Object.entries({
  module: "export const cargar = module.require;",
  Reflect: "export const leer = Reflect.get;",
  asignaciónReservada: "const o = {}; let v: unknown; ({ ['con' + 'structor']: v } = o);",
  asignaciónLiteral: "const o = {}; let v: unknown; ({ constructor: v } = o);",
  asignaciónProto: "const o = {}; let v: unknown; ({ __proto__: v } = o);",
  asignaciónPrototype: "const o = {}; let v: unknown; ({ prototype: v } = o);",
  declaraciónConvertida: "const o = {} as Record<string, number>; const k = 'a'; const { [k]: v } = o;",
  asignaciónConvertida: "const o = {} as Record<string, number>; const k = 'a'; let v; ({ [k]: v } = o);",
  parámetroConvertido:
    "function leer(k: string, { [k]: v }: Record<string, number>) { return v; }" +
    "leer('a', {} as Record<string, number>);",
}))
  it(`212 formas: rechaza ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
