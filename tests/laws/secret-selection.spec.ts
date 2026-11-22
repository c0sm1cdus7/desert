import { join } from "node:path";
import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
import { selectionCases } from "./secret-selection-cases.ts";
const policy = { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] };
const rejected = new Set(["N11", "N12", "N13", "N18", "N23"]);
for (const [name, code] of Object.entries(selectionCases))
  it(`212 selection: ${name}`, () => {
    const file = join(import.meta.dirname, "selection-fixture.ts");
    const found = secretBoundaryViolations({ [file]: code }, { ...policy, tools: [file] });
    if (rejected.has(name.slice(0, 3))) expect(found.length).toBeGreaterThan(0);
    else expect(found).toEqual([]);
  });
const types =
  "type Action = (arg: string) => unknown; type Input = { module: string; action: string; arg: string };" +
  "const actions: Record<string, Record<string, Action>> = { sales: { list: a => a } };";
const attacks = {
  "05 brackets": "return actions[e.module]?.[e.action]?.(e.arg);",
  "05 destructured":
    "const { [e.module]: chosen } = actions; const { [e.action]: action } = chosen ?? {}; return action?.(e.arg);",
  "E3 join":
    "const k = ['con', 'structor'].join(''); const { [k]: first } = actions;" +
    "const { [k]: factory } = first ?? {}; return factory?.('return process');",
  "assignment twin":
    "let m: Record<string, Action> | undefined; let a: Action | undefined;" +
    "({ [e.module]: m } = actions); ({ [e.action]: a } = m ?? {}); return a?.(e.arg);",
  "parameter twin":
    "const take = (k: string, { [k]: v }: Record<string, Record<string, Action>>) => v;" +
    "const take2 = (k: string, { [k]: v }: Record<string, Action>) => v;" +
    "return take2(e.action, take(e.module, actions) ?? {})?.(e.arg);",
};
for (const [name, body] of Object.entries(attacks))
  it(`212 selection: rejects ${name}`, () => {
    const code = `${types} export function dispatch(e: Input): unknown { ${body} }`;
    expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(item => item.includes("nonliteral"))).toBe(true);
  });

it("212 selection: the original E3 without any or assertions", () => {
  const code =
    "type Factory = (code: string) => () => unknown;" +
    "const k = ['con', 'structor'].join(''); const table: Record<string, Record<string, Factory>> = {};" +
    "export function run(): unknown { const { [k]: first } = table;" +
    "const { [k]: factory } = first ?? {}; return factory?.('return process')(); }";
  expect(secretBoundaryViolations({ "tool.ts": code }, policy).some(item => item.includes("nonliteral"))).toBe(true);
});
