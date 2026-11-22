import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
// Seven source positions from capibara-obra, with their relevant types and expressions preserved locally.
const sale = "type Venta = { articulos: readonly { descripcion: string }[] };";
const words =
  "const dicho = { oficial: 'Oficial', propia: 'Propia', fila: (n: number) => String(n)," +
  "leida: (n: number) => String(n), precio: (n: number) => String(n), breve: (n: number) => String(n)," +
  "elegida: (s: string) => s };";
const rejection =
  "const words = { rejections: { 1: 'Uno', 2: { reason: 'Dos' }, 10016: { proximo: (n: number) => String(n) } } };" +
  "type Rechaza = { code: 1 } | { code: 2; variante: string };";
const cases = {
  "devoluciones/devolucion/shown.ts:22":
    sale + "export function read(sale: Venta | undefined, number: number) { return sale?.articulos[number - 1]; }",
  "devoluciones/actions/devolver.ts:59":
    sale +
    "export function read(sale: Venta | undefined, number: number) {" +
    "return sale?.articulos[number - 1]?.descripcion ?? String(number); }",
  "sales/actions/edit/quitar.ts:75":
    sale +
    "export function read(state: { tools: { sales: Map<string, Venta> } }, target: string, number: number) {" +
    "return state.tools.sales.get(target)?.articulos[number - 1]; }",
  "fisco/simulado/simulado.ts:116":
    rejection +
    "export function read(falla: Rechaza) { if (!('variante' in falla)) return words.rejections[falla.code]; }",
  "fisco/simulado/simulado.ts:117":
    rejection +
    "export function read(falla: Rechaza) { if (!('variante' in falla)) return;" +
    "const variantes: Readonly<Record<string, string>> = words.rejections[falla.code]; return variantes; }",
  "fiscal/del-dia/reading.ts:17":
    words + "export function read(fuente: 'oficial' | 'propia', change: string) { return dicho[fuente] + change; }",
  "fiscal/del-dia/actions.ts:24":
    words +
    "export function read(input: { fuente: 'oficial' | 'propia' }) { return dicho.elegida(dicho[input.fuente]); }",
};
for (const [name, code] of Object.entries(cases))
  it(`212 Capibara: admite ${name}`, () => {
    expect(
      secretBoundaryViolations(
        { "tool.ts": code },
        { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] },
      ),
    ).toEqual([]);
  });
