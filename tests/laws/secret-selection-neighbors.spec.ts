import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const admitted = {
  literalFunción: "const t = { f: () => 1 }; t['f']();",
  objetoCalculado: "const k: string = ''; const v = () => 1; const o = { [k]: v };",
  claseSinParametroPropiedad:
    "class Item { readonly id: string; constructor(id: string) { this.id = id; } }" +
    "export function read(items: readonly Item[], i: number) { return items[i]?.id; }",
  textoEnDeclaración:
    "const o = { a: 'A', b: 'B', f: () => 1 };" +
    "export function read(k: 'a' | 'b') { const { [k]: v } = o; return v; }",
  textoEnAsignación:
    "const o = { a: 'A', b: 'B', f: () => 1 };" +
    "export function read(k: 'a' | 'b') { let v: string; ({ [k]: v } = o); return v; }",
  textoEnParámetro: "export function read(k: 'a' | 'b', { [k]: v }: { a: string; b: string; f(): void }) { return v; }",
  parámetroAcotado: "export function read<T extends Record<string, number>>(k: string, { [k]: v }: T) { return v; }",
  declaraciónAnidada:
    "export function read(o: { xs: Record<string, Date> }, k: string) { const { xs: { [k]: v } } = o; return v; }",
  asignaciónAnidada:
    "export function read(o: { xs: Record<string, Date> }, k: string) { let v: Date; ({ xs: { [k]: v } } = o); }",
  errorOpcional: "export function read(v: { xs: Error[] } | null, i: number) { return v?.xs[i]; }",
  moduleLocal: "const module = { kind: 'm' }; const k = 'kind'; module[k];",
};
const rejected = {
  contenedorFunción: "type T = (() => void) & { a: number }; export function read(k: 'a', { [k]: v }: T) { return v; }",
  contenedorClase: "class Item { static a = 1; } const k = 'a'; const { [k]: v } = Item;",
  contenedorAmbiente: "const k = 'PI'; const { [k]: v } = Math;",
  ambientePorTipo: "export function read(k: 'PI', { [k]: v }: typeof Math) { return v; }",
  contenedorAny: "export function read(o: any, k: string) { const { [k]: v } = o; }",
  contenedorUnknown: "export function read(o: unknown, k: string) { const { [k]: v } = o; }",
  parámetroLibre: "export function read<T>(k: string, { [k]: v }: Record<string, T>) { return v; }",
  asignaciónAnidada:
    "export function read(o: { xs: Record<string, () => void> }, k: string) {" +
    "let v: unknown; ({ xs: { [k]: v } } = o); }",
  defectoNoOcultaFunción:
    "export function read(o: Record<string, (() => void) | undefined>, k: string) {" +
    "const { [k]: v = 1 } = o; return v; }",
  claveConvertidaDeclaración: "const o = { a: 1 }; const k = 'a' as any; const { [k]: v } = o;",
  claveConvertidaAsignación: "const o = { a: 1 }; const k = 'a' as any; let v; ({ [k]: v } = o);",
};
for (const [name, code] of Object.entries(admitted))
  it(`212 vecino de selección: admite ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy)).toEqual([]);
  });
for (const [name, code] of Object.entries(rejected))
  it(`212 vecino de selección: rechaza ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length).toBeGreaterThan(0);
  });
const keys = {
  númeroEnRegistro: "export function read(o: Record<string, number>, k: number) { BODY }",
  textoNumérico: "export function read(o: number[], k: '0' | '1') { BODY }",
  símboloIndexado: "export function read(o: { [k: symbol]: number }, k: symbol) { BODY }",
  símboloPropio: "const k = Symbol('datum'); const o = { [k]: 1 }; export function read() { BODY }",
};
for (const [name, template] of Object.entries(keys))
  for (const [form, body] of Object.entries({
    corchetes: "return o[k];",
    declaración: "const { [k]: v } = o; return v;",
    asignación: "let v: number | undefined; ({ [k]: v } = o); return v;",
  }))
    it(`212 claves: admite ${name} ${form}`, () => {
      expect(secretBoundaryViolations({ "tool.ts": template.replace("BODY", body) }, policy)).toEqual([]);
    });
const iterations = {
  asignaDato: [false, "let v: unknown; for ({ [k]: v } of [o]) {}"],
  asignaFunción: [true, "let v: unknown; for ({ [k]: v } of [o]) {}"],
  conjuntoDato: [false, "let v: unknown; for ({ [k]: v } of new Set([o])) {}"],
  conjuntoFunción: [true, "let v: unknown; for ({ [k]: v } of new Set([o])) {}"],
} as const;
for (const [name, [reject, body]] of Object.entries(iterations))
  it(`212 iteración: ${name}`, () => {
    const value = reject ? "() => number" : "number";
    const code = `export function read(o: Record<string, ${value}>, k: string) { ${body} }`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).length > 0).toBe(reject);
  });
for (const declaration of ["", "const "])
  it(`212 iteración: conversión en ${declaration || "asignación"}`, () => {
    const code =
      "let v: unknown; const k: string = 'a';" + `for (${declaration}{ [k]: v } of [{} as Record<string, number>]) {}`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(x => x.includes("converted"))).toBe(true);
  });
it("212 claves: una cota genérica no oculta constructor en ninguna sintaxis", () => {
  const code =
    "export function read<K extends 'a' | 'constructor'>(o: Record<string, number>, k: K) {" +
    "o[k]; const { [k]: v } = o; let w: unknown; ({ [k]: w } = o);" +
    "const sacar = ({ [k]: x }: Record<string, number>) => x; return [v, w, sacar(o)]; }";
  const found = secretBoundaryViolations({ "tool.ts": code }, policy);
  expect(found.filter(message => message.endsWith(" → constructor"))).toHaveLength(4);
});
for (const [name, code] of Object.entries({
  coerciónSombreada:
    "const String = (x: unknown) => x; function data() { return [String((() => 1) as any)]; }" +
    "const i: number = 0; data()[i];",
  coerciónHaciaAny: "const k = String('a') as any; const o = { a: 1 }; o[k];",
  coerciónDoble: "const k = Number('1') as unknown as number; const o = [1]; o[k];",
}))
  it(`212 coerciones: rechaza ${name}`, () => {
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(x => x.includes("converted"))).toBe(true);
  });
