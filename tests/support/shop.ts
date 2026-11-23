import { salesStep, paymentsStep } from "./shop-folds.ts";
// A program that lives in a house only in tests: a shop whose tools register sales and receive payments.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/fields/visible-text.ts";
import { money, shownMoney, text } from "../../src/fields/fields.ts";
import { vocabulary, type Emission, type Event, type ProgramFacts } from "../../src/journal/vocabulary.ts";
import { programAct, type ProgramTool } from "../../src/tools/promises.ts";
import type { Shown, SurfaceWords } from "../../src/surface/bridge/ports/house-ports.ts";
import type { Slices, State, ToolRegistry } from "../../src/tools/tool-contract.ts";
/** What the shop takes is declared with how it is asked: the question, and a mask or a placeholder. */
const sale = text({ en: "Sale", es: "Venta" }, { en: "Name of the sale", es: "Nombre de la venta" });
const total = money({ en: "Total", es: "Total" });
const amount = money({ en: "Amount", es: "Monto" });
export const shopCatalog = {
  "sale-registered": object({ sale, total }),
  "slow-written": object({ sale, total }),
  "batch-sale-registered": object({ sale, total }),
  /** What a zero mind of the tests notes when it wakes; it folds as a sale (zero-mind.ts). */
  "mind-noted": object({ sale, total }),
  "sale-settled": object({ sale, amount }),
  "sale-corrected": object({ sale, total, paid: money({ en: "Collected", es: "Cobrado" }) }),
  "payment-received": object({
    payment: text({ en: "Payment", es: "Pago" }, { en: "Name of the payment", es: "Nombre del pago" }),
    amount,
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
export type Shop = { fact: ShopFact; tools: { sales: Sales; payments: Payments; desk?: ReadonlyMap<string, string> } };
export const shopSlices: Slices<Shop> = {
  initial: { sales: new Map(), payments: { received: 0, unmatched: [] } },
  step: { sales: salesStep, payments: paymentsStep },
};
const lines = (values: readonly unknown[]): string => values.map(value => JSON.stringify(value)).join("\n");
export const shopLocale = { currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" };
export const ars = (amount: number): string => shownMoney(String(amount), shopLocale);
/** The list names each sale; one sale reads as its own facts. */
const salesView = (state: State<Shop>, target: string): string => {
  const one = state.tools.sales.get(target.replace("sales/", ""));
  if (one) return lines([{ total: ars(one.total), paid: ars(one.paid), by: one.by }]);
  const listed = [...state.tools.sales].map(([sale, { total }]) => ({
    id: `sales/${sale}`,
    text: sale,
    detail: ars(total),
  }));
  return lines(listed);
};
const paymentsView = (state: State<Shop>): string => {
  const { received, unmatched } = state.tools.payments;
  return lines([{ received: ars(received), unmatched }]);
};
const first = { sale: "s1", total: 1500 };
/** Why a sale is not registered twice. */
export const repeated = { en: "repeated", es: "repetida" };
/** What registering a sale promises; a broken shop keeps these promises and breaks the act under them. */
export const registerCases = [
  {
    promise: "a sale is registered as it was told",
    input: first,
    then: {
      says: { en: "Registered · s1", es: "Registrada · s1" },
      facts: [{ kind: "sale-registered", data: first }],
      reads: { on: "sales/s1", lines: [{ total: "$ 15,00", paid: "$ 0,00", by: "ana" }] },
    },
  },
  {
    promise: "a sale already registered is not registered again",
    given: [{ act: "register", input: first }],
    input: { sale: "s1", total: 90 },
    then: { refused: repeated },
  },
] as const;
/** How registering a sale is offered: a broken shop is offered the same way. */
export const registerOffer = {
  name: { en: "register", es: "registrar" },
  enter: { en: "register", es: "registrar" },
  undoable: true,
  purpose: { en: "what the shop sells", es: "lo que el almacén vende" },
  key: "r",
  on: "tool",
} as const;
export const salesTool: ProgramTool<Shop> = {
  id: "sales",
  facts: ["sale-registered", "sale-corrected", "sale-settled"],
  purpose: { en: "Registers what the shop sells.", es: "Registra lo que vende el almacén." },
  targets: state => [...state.tools.sales.keys()].map(sale => `sales/${sale}`),
  view: salesView,
  /** A count says what it counts: beside its name a tool never says a bare number. */
  summary: state =>
    state.tools.sales.size === 1
      ? { en: "1 sale", es: "1 venta" }
      : { en: `${state.tools.sales.size} sales`, es: `${state.tools.sales.size} ventas` },
  acts: {
    register: programAct<Shop, (typeof shopCatalog)["sale-registered"]>({
      ...registerOffer,
      input: shopCatalog["sale-registered"],
      refuses: [repeated],
      stops: ({ sale }, state) => (typeof sale === "string" && state.tools.sales.has(sale) ? repeated : undefined),
      run: (input, { by }) => ({
        status: "accepted",
        text: { en: `Registered · ${input.sale}`, es: `Registrada · ${input.sale}` },
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
  facts: ["payment-received"],
  purpose: { en: "Receives what the shop is paid.", es: "Recibe lo que le pagan al almacén." },
  targets: () => [],
  view: paymentsView,
  summary: state => {
    const count = state.tools.payments.unmatched.length;
    return { en: `${count} without a sale`, es: `${count} sin venta` };
  },
  acts: {
    receive: programAct<Shop, (typeof shopCatalog)["payment-received"]>({
      name: { en: "receive", es: "recibir" },
      enter: { en: "receive", es: "recibir" },
      undoable: true,
      purpose: { en: "what the shop is paid", es: "lo que le pagan al almacén" },
      key: "r",
      on: "tool",
      input: shopCatalog["payment-received"],
      run: (input, { by }) => ({
        status: "accepted",
        text: { en: `Received · ${input.payment}`, es: `Recibido · ${input.payment}` },
        effects: [shop.fact("payment-received", input, by)],
      }),
      cases: [
        {
          promise: "a payment for a sale is received",
          given: [{ act: "register", on: "sales", input: first }],
          input: paid,
          then: {
            says: { en: "Received · p1", es: "Recibido · p1" },
            facts: [{ kind: "payment-received", data: paid }],
          },
        },
        {
          promise: "a payment that names no sale is received all the same",
          input: { payment: "p2", amount: 100 },
          then: {
            says: { en: "Received · p2", es: "Recibido · p2" },
            facts: [{ kind: "payment-received", data: { payment: "p2", amount: 100 } }],
          },
        },
      ],
    }),
    notice: programAct<Shop, (typeof shopCatalog)["payment-received"]>({
      name: { en: "notify", es: "avisar" },
      enter: { en: "notify", es: "avisar" },
      undoable: true,
      purpose: { en: "notify payments without a sale", es: "avisar pagos sin venta" },
      key: "u",
      on: "tool",
      input: shopCatalog["payment-received"],
      run: (input, { state }) =>
        state.tools.sales.has(input.sale ?? "")
          ? { status: "accepted", silent: true }
          : {
              status: "accepted",
              text: {
                en: `Notified · Payment without a sale · ${input.payment}`,
                es: `Avisado · Pago sin venta · ${input.payment}`,
              },
              attention: true,
            },
      cases: [
        {
          promise: "a payment with no sale asks for attention",
          input: { payment: "p2", amount: 100 },
          then: {
            says: { en: "Notified · Payment without a sale · p2", es: "Avisado · Pago sin venta · p2" },
            facts: [],
          },
        },
      ],
    }),
  },
  reactions: { unmatched: { when: "payment-received", act: "notice" } },
};
export const shopRegistry: ToolRegistry<Shop> = [salesTool, paymentsTool];
/** The shop, whole: what its promises are checked on. */
export const shopProgram = {
  projectionVersion: "shop/1",
  words: shop,
  registry: [salesTool, paymentsTool],
  slices: shopSlices,
};
/** What the shop calls its tools where a person reads them, and how its country writes money and days. */
export const shopWords: SurfaceWords = {
  sales: {
    name: { en: "Sales", es: "Ventas" },
    key: "v",
    empty: { en: "No sales.", es: "Sin ventas." },
    listed: { en: "Registered", es: "Registradas" },
    reads: {},
    presents: [
      {
        title: { en: "Sale", es: "Venta" },
        empty: { en: "No data.", es: "Sin datos." },
        reads: { total: { en: "Total", es: "Total" }, paid: { en: "Collected", es: "Cobrado" } },
      },
      {
        title: { en: "Activity", es: "Actividad" },
        empty: { en: "No activity.", es: "Sin actividad." },
        reads: { by: { en: "Created", es: "Creó" } },
      },
    ],
  },
  payments: {
    name: { en: "Payments", es: "Pagos" },
    key: "p",
    empty: { en: "No payments.", es: "Sin pagos." },
    listed: { en: "Till", es: "Caja" },
    reads: {
      received: { en: "Received", es: "Recibido" },
      unmatched: { en: "Unmatched", es: "Sin conciliar" },
    },
    presents: [],
  },
};
export const shopShown: Shown<Shop> = {
  words: shopWords,
  locale: shopLocale,
};
