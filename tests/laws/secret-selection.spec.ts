import { join } from "node:path";
import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { selectionCases } from "./secret-selection-cases.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const rejected = new Set(["N11", "N12", "N13", "N18", "N23"]);
for (const [name, code] of Object.entries(selectionCases))
  it(`212 selección: ${name}`, () => {
    const file = join(import.meta.dirname, "selection-fixture.ts");
    const found = secretBoundaryViolations({ [file]: code }, { ...policy, tools: [file] });
    if (rejected.has(name.slice(0, 3))) expect(found.length).toBeGreaterThan(0);
    else expect(found).toEqual([]);
  });
const types =
  "type Accion = (arg: string) => unknown; type Entrada = { modulo: string; accion: string; arg: string };" +
  "const acciones: Record<string, Record<string, Accion>> = { ventas: { listar: a => a } };";
const attacks = {
  "05 corchetes": "return acciones[e.modulo]?.[e.accion]?.(e.arg);",
  "05 desestructurada":
    "const { [e.modulo]: modulo } = acciones; const { [e.accion]: accion } = modulo ?? {}; return accion?.(e.arg);",
  "E3 join":
    "const k = ['con', 'structor'].join(''); const { [k]: primero } = acciones;" +
    "const { [k]: fabrica } = primero ?? {}; return fabrica?.('return process');",
  "gemela asignación":
    "let m: Record<string, Accion> | undefined; let a: Accion | undefined;" +
    "({ [e.modulo]: m } = acciones); ({ [e.accion]: a } = m ?? {}); return a?.(e.arg);",
  "gemela parámetro":
    "const sacar = (k: string, { [k]: v }: Record<string, Record<string, Accion>>) => v;" +
    "const sacar2 = (k: string, { [k]: v }: Record<string, Accion>) => v;" +
    "return sacar2(e.accion, sacar(e.modulo, acciones) ?? {})?.(e.arg);",
};
for (const [name, body] of Object.entries(attacks))
  it(`212 selección: rechaza ${name}`, () => {
    const code = `${types} export function despachar(e: Entrada): unknown { ${body} }`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(item => item.includes("nonliteral"))).toBe(true);
  });

it("212 selección: E3 original sin any ni aserciones", () => {
  const code =
    "type Fabrica = (codigo: string) => () => unknown;" +
    "const k = ['con', 'structor'].join(''); const tabla: Record<string, Record<string, Fabrica>> = {};" +
    "export function run(): unknown { const { [k]: primero } = tabla;" +
    "const { [k]: fabrica } = primero ?? {}; return fabrica?.('return process')(); }";
  expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(item => item.includes("nonliteral"))).toBe(true);
});
