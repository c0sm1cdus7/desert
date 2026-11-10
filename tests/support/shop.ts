// A product that lives in a house only in tests: a shop whose tools register sales and receive payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { effect, vocabulary, type Emission, type Event, type ProductFacts } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { Slices, State, Tool, ToolRegistry } from "../../src/tools/tool-contract.ts";
const name = Type.String({ minLength: 1 });
const amount = Type.Number({ minimum: 0 });
export const shopCatalog = {
  "sale-registered": object({ sale: name, total: amount }),
  "payment-received": object({ payment: name, amount, sale: Type.Optional(name) }),
};
export type ShopFact = ProductFacts<typeof shopCatalog>;
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
const entriesOf = (state: State<Shop>, tool: string) =>
  state.entries.filter(entry => entry.data.tool === tool).map(entry => entry.data.text);
export const salesTool: Tool<Shop> = {
  id: "sales",
  purpose: "Registers what the shop sells.",
  targets: state => [...state.tools.sales.keys()].map(sale => `sales/${sale}`),
  view: (state, _target, limits) => entriesOf(state, "sales").slice(-limits.recentLines).join("\n"),
  summary: state => String(state.tools.sales.size),
  acts: {
    register: toolAct(shopCatalog["sale-registered"], (input, { by, state }) =>
      state.tools.sales.has(input.sale)
        ? { status: "rejected", reason: "repeated" }
        : {
            status: "accepted",
            text: `Sale ${input.sale}`,
            target: `sales/${input.sale}`,
            effects: [shop.fact("sale-registered", input, by)],
          },
    ),
  },
};
export const paymentsTool: Tool<Shop> = {
  id: "payments",
  purpose: "Receives what the shop is paid.",
  targets: () => [],
  view: state => entriesOf(state, "payments").join("\n"),
  summary: state => String(state.tools.payments.unmatched.length),
  acts: {
    receive: toolAct(shopCatalog["payment-received"], (input, { by }) => ({
      status: "accepted",
      text: `Payment ${input.payment}`,
      effects: [shop.fact("payment-received", input, by)],
    })),
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
