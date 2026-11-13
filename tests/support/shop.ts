// A program that lives in a house only in tests: a shop whose tools register sales and receive payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { money, text } from "../../src/catalogs/fields.ts";
import { effect, vocabulary, type Emission, type Event, type ProgramFacts } from "../../src/journal/events.ts";
import { programAct, type Composition, type ProgramTool } from "../../src/tools/promises.ts";
import type { Shown, SurfaceWords } from "../../src/surface/bridge/house-ports.ts";
import type { Slices, State, ToolRegistry } from "../../src/tools/tool-contract.ts";
/** What the shop takes is declared with how it is asked: the question, and a mask or a placeholder. */
const sale = text("Venta", "Nombre de la venta");
export const shopCatalog = {
  "sale-registered": object({ sale, total: money("Total") }),
  "sale-corrected": object({ sale, total: money("Total"), paid: money("Cobrado") }),
  "payment-received": object({
    payment: text("Pago", "Nombre del pago"),
    amount: money("Monto"),
    sale: Type.Optional(sale),
  }),
};
export type ShopFact = ProgramFacts<typeof shopCatalog>;
export type ShopEvent = Event<ShopFact>;
export type ShopEmission = Emission<ShopFact>;
export const shop = vocabulary(shopCatalog);
/** What each tool of the shop keeps. */
export type Sales = ReadonlyMap<string, Readonly<{ total: number; paid: number; by: string }>>;
export type Payments = Readonly<{ received: number; unmatched: readonly string[] }>;
export type Shop = { fact: ShopFact; tools: { sales: Sales; payments: Payments } };
const salesStep = (kept: Sales, event: ShopEvent): Sales => {
  if (event.kind === "sale-registered")
    return new Map(kept).set(event.data.sale, { total: event.data.total, paid: 0, by: event.by });
  if (event.kind === "sale-corrected") {
    const { sale: name, total, paid } = event.data;
    const corrected = kept.get(name);
    return corrected ? new Map(kept).set(name, { ...corrected, total, paid }) : kept;
  }
  const sale = event.kind === "payment-received" ? kept.get(event.data.sale ?? "") : undefined;
  if (event.kind !== "payment-received" || !event.data.sale || !sale) return kept;
  return new Map(kept).set(event.data.sale, { ...sale, paid: sale.paid + event.data.amount });
};
/** A payment reads the sales as they were before it: one that names no known sale stays unmatched. */
const paymentsStep = (kept: Payments, event: ShopEvent, before: State<Shop>): Payments => {
  if (event.kind !== "payment-received") return kept;
  const matched = before.tools.sales.has(event.data.sale ?? "");
  return {
    received: kept.received + event.data.amount,
    unmatched: matched ? kept.unmatched : [...kept.unmatched, event.data.payment],
  };
};
export const shopSlices: Slices<Shop> = {
  initial: { sales: new Map(), payments: { received: 0, unmatched: [] } },
  step: { sales: salesStep, payments: paymentsStep },
};
const lines = (values: readonly unknown[]): string => values.map(value => JSON.stringify(value)).join("\n");
const pesos = (amount: number): string => `$ ${amount}`;
/** The list names each sale; one sale reads as its own facts. */
const salesView = (state: State<Shop>, target: string): string => {
  const one = state.tools.sales.get(target.replace("sales/", ""));
  if (one) return lines([{ total: pesos(one.total), paid: pesos(one.paid), by: one.by }]);
  const listed = [...state.tools.sales].map(([sale, { total }]) => ({
    id: `sales/${sale}`,
    text: sale,
    detail: pesos(total),
  }));
  return lines(listed);
};
const paymentsView = (state: State<Shop>): string => {
  const { received, unmatched } = state.tools.payments;
  return lines([{ received: pesos(received), unmatched }]);
};
const first = { sale: "s1", total: 1500 };
/** What registering a sale promises; a broken shop keeps these promises and breaks the act under them. */
export const registerCases = [
  {
    promise: "a sale is registered as it was told",
    input: first,
    then: {
      says: "Registrada · s1",
      facts: [{ kind: "sale-registered", data: first }],
      reads: { on: "sales/s1", lines: [{ total: "$ 1500", paid: "$ 0", by: "ana" }] },
    },
  },
  {
    promise: "a sale already registered is not registered again",
    given: [{ act: "register", input: first }],
    input: { sale: "s1", total: 90 },
    then: { refused: "repeated" },
  },
] as const;
/** How registering a sale is offered: a broken shop is offered the same way. */
export const registerOffer = {
  name: "registrar",
  enter: "registrar",
  undoable: true,
  purpose: "lo que el almacén vende",
  key: "r",
  on: "tool",
} as const;
export const salesTool: ProgramTool<Shop> = {
  id: "sales",
  purpose: "Registers what the shop sells.",
  targets: state => [...state.tools.sales.keys()].map(sale => `sales/${sale}`),
  view: salesView,
  /** A count says what it counts: beside its name a tool never says a bare number. */
  summary: state => (state.tools.sales.size === 1 ? "1 venta" : `${state.tools.sales.size} ventas`),
  acts: {
    register: programAct<Shop, (typeof shopCatalog)["sale-registered"]>({
      ...registerOffer,
      input: shopCatalog["sale-registered"],
      refuses: ["repeated"],
      stops: ({ sale }, state) => (typeof sale === "string" && state.tools.sales.has(sale) ? "repeated" : undefined),
      run: (input, { by }) => ({
        status: "accepted",
        text: `Registrada · ${input.sale}`,
        target: `sales/${input.sale}`,
        effects: [shop.fact("sale-registered", input, by)],
      }),
      cases: registerCases,
    }),
  },
};
const paid = { payment: "p1", amount: 1500, sale: "s1" };
export const paymentsTool: ProgramTool<Shop> = {
  id: "payments",
  purpose: "Receives what the shop is paid.",
  targets: () => [],
  view: paymentsView,
  summary: state => `${state.tools.payments.unmatched.length} sin venta`,
  acts: {
    receive: programAct<Shop, (typeof shopCatalog)["payment-received"]>({
      name: "recibir",
      enter: "recibir",
      undoable: true,
      purpose: "lo que le pagan al almacén",
      key: "r",
      on: "tool",
      input: shopCatalog["payment-received"],
      run: (input, { by }) => ({
        status: "accepted",
        text: `Recibido · ${input.payment}`,
        effects: [shop.fact("payment-received", input, by)],
      }),
      cases: [
        {
          promise: "a payment for a sale is received",
          given: [{ act: "register", on: "sales", input: first }],
          input: paid,
          then: { says: "Recibido · p1", facts: [{ kind: "payment-received", data: paid }] },
        },
        {
          promise: "a payment that names no sale is received all the same",
          input: { payment: "p2", amount: 100 },
          then: { says: "Recibido · p2", facts: [{ kind: "payment-received", data: { payment: "p2", amount: 100 } }] },
        },
      ],
    }),
  },
  /** A payment that matches no sale asks for attention, even from whoever received it. */
  effects: (state, event) => {
    if (event.kind !== "payment-received" || state.tools.sales.has(event.data.sale ?? "")) return [];
    const text = `Unmatched ${event.data.payment}`;
    const data = { tool: "payments", target: "payments", author: event.by, text, attention: true };
    return [effect("tool-entry", data, event.by, [event.id])];
  },
};
export const shopRegistry: ToolRegistry<Shop> = [salesTool, paymentsTool];
/** The shop, whole: what its promises are checked on. */
export const shopProgram: Composition<Shop> = { words: shop, registry: [salesTool, paymentsTool], slices: shopSlices };
/** What the shop calls its tools where a person reads them, and how its country writes money and days. */
export const shopWords: SurfaceWords = {
  sales: {
    name: "Ventas",
    key: "v",
    empty: "Sin ventas.",
    listed: "Registradas",
    reads: {},
    presents: [
      { title: "Venta", empty: "Sin datos.", reads: { total: "Total", paid: "Cobrado" } },
      { title: "Actividad", empty: "Sin actividad.", reads: { by: "Creó" } },
    ],
  },
  payments: {
    name: "Pagos",
    key: "p",
    empty: "Sin pagos.",
    listed: "Caja",
    reads: { received: "Recibido", unmatched: "Sin conciliar" },
    presents: [],
  },
};
export const shopShown: Shown<Shop> = {
  words: shopWords,
  locale: { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" },
};
