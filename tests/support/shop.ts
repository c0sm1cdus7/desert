// A program that lives in a house only in tests: a shop whose tools register sales and receive payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { effect, vocabulary, type Emission, type Event, type ProgramFacts } from "../../src/journal/events.ts";
import { toolAct } from "../../src/tools/act-definition.ts";
import type { SurfaceWords } from "../../src/surface/bridge/house-ports.ts";
import type { Slices, State, Tool, ToolRegistry } from "../../src/tools/tool-contract.ts";
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
export const salesTool: Tool<Shop> = {
  id: "sales",
  purpose: "Registers what the shop sells.",
  targets: state => [...state.tools.sales.keys()].map(sale => `sales/${sale}`),
  view: salesView,
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
  view: paymentsView,
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
