// Time-dependent refusals belong to input rules; cases straddle a UTC boundary in the program's local day.
import { object } from "../../src/catalogs/acts.ts";
import { day, holding, thing } from "../../src/catalogs/fields.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, registerOffer, salesTool, shopProgram, shopShown, type Shop } from "./shop.ts";

export const instant = Date.UTC(2026, 10, 13, 1);
export const localDay = (at: number): string => new Date(at - 3 * 3_600_000).toISOString().slice(0, 10);
export const future = (value: unknown, at: number) =>
  typeof value === "string" && value > localDay(at) ? "día futuro" : undefined;
export const datedShown = { ...shopShown, day: localDay };
type Clock = (at: number) => number;
const cases = [
  {
    promise: "yesterday is allowed",
    at: instant,
    input: { on: "2026-11-11" },
    then: { says: "Fechado · Recibo", facts: [] },
  },
  { promise: "tomorrow is closed", at: instant, input: { on: "2026-11-13" }, then: { refused: "día futuro" } },
  {
    promise: "tomorrow becomes today",
    at: instant + 86_400_000,
    input: { on: "2026-11-13" },
    then: { says: "Fechado · Recibo", facts: [] },
  },
] as const;
function dateAct(mode: "stops" | "wrong" | "among", clock: Clock) {
  const field = mode === "wrong" ? holding(day("Día"), (value, at) => future(value, clock(at))) : day("Día");
  const input = object({ on: field });
  return programAct<Shop, typeof input>({
    ...registerOffer,
    name: "fechar",
    enter: "fechar",
    key: "f",
    input,
    refuses: ["día futuro"],
    ...(mode === "stops" ? { stops: (answers, _state, _target, at) => future(answers.on, clock(at)) } : {}),
    run: () => ({ status: "accepted", text: "Fechado · Recibo" }),
    cases,
  });
}
function choosingAct(clock: Clock) {
  const input = object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas previas") });
  const given = ["2026-11-11", "2026-11-13"].map(sale => ({ act: "register", input: { sale, total: 100 } }));
  return programAct<Shop, typeof input>({
    ...registerOffer,
    name: "elegir",
    enter: "elegir",
    key: "e",
    input,
    refuses: ["día futuro"],
    among: (_answers, _state, _target, at) => ({ sales: id => future(id.slice("sales/".length), clock(at)) }),
    run: () => ({ status: "accepted", text: "Fechado · Recibo" }),
    cases: [
      { ...cases[0], given, input: { sale: "sales/2026-11-11" } },
      { ...cases[1], given, input: { sale: "sales/2026-11-13" } },
      { ...cases[2], given, input: { sale: "sales/2026-11-13" } },
    ],
  });
}
export const datedShop = (mode: "stops" | "wrong" | "among", clock: Clock = at => at): Composition<Shop> => ({
  ...shopProgram,
  registry: [
    { ...salesTool, acts: { ...salesTool.acts, date: mode === "among" ? choosingAct(clock) : dateAct(mode, clock) } },
    paymentsTool,
  ],
});
