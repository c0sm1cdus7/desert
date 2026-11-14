import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
// Seven source positions from capibara-obra, with their relevant types and expressions preserved locally.
const sale = "type Venta = { articulos: readonly { descripcion: string }[] };";
const words =
  "const dicho = { oficial: 'Oficial', propia: 'Propia', fila: (n: number) => String(n)," +
  "leida: (n: number) => String(n), precio: (n: number) => String(n), breve: (n: number) => String(n)," +
  "elegida: (s: string) => s };";
const rejection =
  "const palabras = { rechazos: { 1: 'Uno', 2: { motivo: 'Dos' }, 10016: { proximo: (n: number) => String(n) } } };" +
  "type Rechaza = { codigo: 1 } | { codigo: 2; variante: string };";
const cases = {
  "devoluciones/devolucion/presentacion.ts:22":
    sale + "export function leer(venta: Venta | undefined, numero: number) { return venta?.articulos[numero - 1]; }",
  "devoluciones/acciones/devolver.ts:59":
    sale +
    "export function leer(venta: Venta | undefined, numero: number) {" +
    "return venta?.articulos[numero - 1]?.descripcion ?? String(numero); }",
  "ventas/acciones/editar/quitar.ts:75":
    sale +
    "export function leer(state: { tools: { ventas: Map<string, Venta> } }, target: string, numero: number) {" +
    "return state.tools.ventas.get(target)?.articulos[numero - 1]; }",
  "fisco/simulado/simulado.ts:116":
    rejection +
    "export function leer(falla: Rechaza) { if (!('variante' in falla)) return palabras.rechazos[falla.codigo]; }",
  "fisco/simulado/simulado.ts:117":
    rejection +
    "export function leer(falla: Rechaza) { if (!('variante' in falla)) return;" +
    "const variantes: Readonly<Record<string, string>> = palabras.rechazos[falla.codigo]; return variantes; }",
  "fiscal/del-dia/lectura.ts:17":
    words + "export function leer(fuente: 'oficial' | 'propia', cambio: string) { return dicho[fuente] + cambio; }",
  "fiscal/del-dia/acciones.ts:24":
    words +
    "export function leer(input: { fuente: 'oficial' | 'propia' }) { return dicho.elegida(dicho[input.fuente]); }",
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
