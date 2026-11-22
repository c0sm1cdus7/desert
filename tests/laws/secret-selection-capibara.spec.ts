import { expect, it } from "vitest";
import { secretBoundaryViolations } from "./secret-boundaries.ts";
// Seven source positions from capibara-obra (paths translated), with their types and expressions kept locally.
const sale = "type Sale = { items: readonly { description: string }[] };";
const words =
  "const said = { official: 'Official', own: 'Own', row: (n: number) => String(n)," +
  "seen: (n: number) => String(n), price: (n: number) => String(n), brief: (n: number) => String(n)," +
  "chosen: (s: string) => s };";
const rejection =
  "const words = { rejections: { 1: 'One', 2: { reason: 'Two' }, 10016: { next: (n: number) => String(n) } } };" +
  "type Rejection = { code: 1 } | { code: 2; variant: string };";
const cases = {
  "returns/return/shown.ts:22":
    sale + "export function read(sale: Sale | undefined, number: number) { return sale?.items[number - 1]; }",
  "returns/actions/give-back.ts:59":
    sale +
    "export function read(sale: Sale | undefined, number: number) {" +
    "return sale?.items[number - 1]?.description ?? String(number); }",
  "sales/actions/edit/remove.ts:75":
    sale +
    "export function read(state: { tools: { sales: Map<string, Sale> } }, target: string, number: number) {" +
    "return state.tools.sales.get(target)?.items[number - 1]; }",
  "tax/simulated/simulated.ts:116":
    rejection +
    "export function read(failure: Rejection) { if (!('variant' in failure)) return words.rejections[failure.code]; }",
  "tax/simulated/simulated.ts:117":
    rejection +
    "export function read(failure: Rejection) { if (!('variant' in failure)) return;" +
    "const variants: Readonly<Record<string, string>> = words.rejections[failure.code]; return variants; }",
  "fiscal/of-the-day/reading.ts:17":
    words + "export function read(source: 'official' | 'own', change: string) { return said[source] + change; }",
  "fiscal/of-the-day/actions.ts:24":
    words + "export function read(input: { source: 'official' | 'own' }) { return said.chosen(said[input.source]); }",
};
for (const [name, code] of Object.entries(cases))
  it(`212 Capibara: admits ${name}`, () => {
    expect(
      secretBoundaryViolations(
        { "tool.ts": code },
        { composition: [], adapters: [], custody: [], publicTypes: [], tools: ["tool.ts"] },
      ),
    ).toEqual([]);
  });
