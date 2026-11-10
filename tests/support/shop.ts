// A program that lives in a house only in tests: a shop whose tools register sales and receive payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { effect, vocabulary, type Emission, type Event, type ProgramFacts } from "../../src/journal/events.ts";
import { programAct, type Composition, type ProgramTool } from "../../src/tools/promises.ts";
import type { SurfaceWords } from "../../src/surface/bridge/house-ports.ts";
import type { Slices, State, ToolRegistry } from "../../src/tools/tool-contract.ts";
const name = Type.String({ minLength: 1 });
const amount = Type.Number({ minimum: 0 });
export const shopCatalog = {
  "sale-registered": object({ sale: name, total: amount }),
  "payment-received": object({ payment: name, amount, sale: Type.Optional(name) }),
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
const money = (amount: number): string => `$ ${amount}`;
/** The list names each sale; one sale reads as its own facts. */
const salesView = (state: State<Shop>, target: string): string => {
  const one = state.tools.sales.get(target.replace("sales/", ""));
  if (one) return lines([{ total: money(one.total), paid: money(one.paid), by: one.by }]);
  const listed = [...state.tools.sales].map(([sale, { total }]) => ({
    id: `sales/${sale}`,
    text: sale,
    detail: money(total),
  }));
  return lines(listed);
};
const paymentsView = (state: State<Shop>): string => {
  const { received, unmatched } = state.tools.payments;
  return lines([{ received: money(received), unmatched }]);
};
const first = { sale: "s1", total: 1500 };
/** What registering a sale promises; a broken shop keeps these promises and breaks the act under them. */
export const registerCases = [
  {
    promise: "a sale is registered as it was told",
    input: first,
    then: {
      says: "Sale s1",
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
export const salesTool: ProgramTool<Shop> = {
  id: "sales",
  purpose: "Registers what the shop sells.",
  targets: state => [...state.tools.sales.keys()].map(sale => `sales/${sale}`),
  view: salesView,
  summary: state => String(state.tools.sales.size),
  acts: {
    register: programAct<Shop, (typeof shopCatalog)["sale-registered"]>({
      input: shopCatalog["sale-registered"],
      refuses: ["repeated"],
      run: (input, { by, state }) =>
        state.tools.sales.has(input.sale)
          ? { status: "rejected", reason: "repeated" }
          : {
              status: "accepted",
              text: `Sale ${input.sale}`,
              target: `sales/${input.sale}`,
              effects: [shop.fact("sale-registered", input, by)],
            },
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
  summary: state => String(state.tools.payments.unmatched.length),
  acts: {
    receive: programAct<Shop, (typeof shopCatalog)["payment-received"]>({
      input: shopCatalog["payment-received"],
      run: (input, { by }) => ({
        status: "accepted",
        text: `Payment ${input.payment}`,
        effects: [shop.fact("payment-received", input, by)],
      }),
      cases: [
        {
          promise: "a payment for a sale is received",
          given: [{ act: "register", on: "sales", input: first }],
          input: paid,
          then: { says: "Payment p1", facts: [{ kind: "payment-received", data: paid }] },
        },
        {
          promise: "a payment that names no sale is received all the same",
          input: { payment: "p2", amount: 100 },
          then: { says: "Payment p2", facts: [{ kind: "payment-received", data: { payment: "p2", amount: 100 } }] },
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
/** What the shop calls its tools, their acts and their fields where a person reads them. */
export const shopWords: SurfaceWords = {
  sales: {
    name: "Ventas",
    key: "v",
    empty: "Sin ventas.",
    listed: "Registradas",
    shown: "Datos",
    acts: { register: "Registrar" },
    done: {},
    fields: { sale: "Venta", total: "Total", paid: "Cobrado", by: "Registró" },
  },
  payments: {
    name: "Pagos",
    key: "p",
    empty: "Sin pagos.",
    listed: "Caja",
    shown: "Datos",
    acts: { receive: "Recibir" },
    done: { receive: "Recibido" },
    fields: { payment: "Pago", amount: "Monto", sale: "Venta", received: "Recibido", unmatched: "Sin conciliar" },
  },
};
