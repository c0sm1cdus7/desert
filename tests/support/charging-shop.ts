// The test shop whose payments tool charges a sale: the sale is picked by its name, or the act is taken from the sale.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { money, thing } from "../../src/catalogs/fields.ts";
import { toolTexts } from "../../src/texts/tools.texts.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, salesTool, shop, shopProgram, type Shop } from "./shop.ts";

/** What charging takes. `makes` is the act of the sales tool that registers a new sale right where one is picked. */
const chargedWith = (makes?: string) =>
  object({
    sale: thing("Venta", "sales", undefined, makes),
    amount: money("Monto"),
    tip: Type.Optional(money("Propina")),
  });
type Charged = ReturnType<typeof chargedWith>;
const nameOf = (target: string): string => target.replace("sales/", "");
const registered = { act: "register", on: "sales", input: { sale: "s1", total: 1500 } };
const also = { act: "register", on: "sales", input: { sale: "s2", total: 90 } };
const paid = (amount: number) => ({
  says: "Cobrada · s1\nRecibo de prueba",
  facts: [{ kind: "payment-received" as const, data: { payment: "for-s1", amount, sale: "s1" } }],
});
export const chargedFromSale =
  "payments · charge · a sale is charged from the sale itself, which says which sale it is";
export const chargedByName = "payments · charge · a sale is charged from payments, picked by its name";
/** What charging promises, however the sale is picked. */
const chargeCases = [
  {
    promise: "a sale is charged from payments, picked by its name",
    given: [registered, also],
    input: { sale: "sales/s1", amount: 500 },
    then: paid(500),
  },
  {
    promise: "a sale is charged from the sale itself, which says which sale it is",
    given: [registered, also],
    from: "sales/s1",
    input: { sale: "sales/s1", amount: 700, tip: 50 },
    then: paid(700),
  },
  {
    promise: "a sale nobody registered is not charged",
    given: [registered],
    input: { sale: "sales/zz", amount: 1 },
    then: { refused: "unknown" },
  },
  {
    promise: "more than ninety pesos is not charged, and it is said at the amount: the tip is never asked",
    given: [registered],
    input: { sale: "sales/s1", amount: 9500, tip: 50 },
    then: { refused: "monto de más" },
  },
] as const;
/** Charging a sale receives a payment for it: the sale is one of the things of the sales tool. */
const chargeWith = (input: Charged) =>
  programAct<Shop, Charged>({
    name: "cobrar",
    enter: "cobrar",
    undoable: true,
    purpose: "un pago de una venta",
    key: "c",
    on: "tool",
    input,
    also: {
      tool: "sales",
      with: (_state, target) => ({ sale: target }),
      off: (state, target) => ((state.tools.sales.get(nameOf(target))?.paid ?? 0) >= 1500 ? "paid" : undefined),
      opens: (state, target) => ({ amount: state.tools.sales.get(nameOf(target))?.total ?? 0 }),
    },
    refuses: ["unknown", "monto de más"],
    /** More than ninety pesos is said at the amount, before anything else is asked. */
    stops: ({ amount }) => (typeof amount === "number" && amount > 9000 ? "monto de más" : undefined),
    run: ({ sale, amount }, { by, state }) => {
      if (!state.tools.sales.has(nameOf(sale))) return { status: "rejected", reason: "unknown" };
      if (amount > 9000) return { status: "rejected", reason: "monto de más" };
      const fact = shop.fact("payment-received", { payment: `for-${nameOf(sale)}`, amount, sale: nameOf(sale) }, by);
      /** What it answers has two lines: what it did, and what it shows. Every derived check reads it so. */
      return { status: "accepted", text: `Cobrada · ${nameOf(sale)}\nRecibo de prueba`, effects: [fact] };
    },
    cases: chargeCases,
  });
const paymentsWith = (makes?: string) => ({
  ...paymentsTool,
  acts: { ...paymentsTool.acts, charge: chargeWith(chargedWith(makes)) },
});
export const chargingRegistry = [salesTool, paymentsWith()];
export const chargingShop: Composition<Shop> = { ...shopProgram, registry: chargingRegistry };
/** The same shop, where the sale to charge can be registered right where it is picked. */
export const makingRegistry = [salesTool, paymentsWith("register")];
/** The same act, which takes only the sales of a thousand or more: the others are not on the list it picks from,
 * and the base refuses one through any door. The act says it once, in what it takes. */
type Sales = Parameters<NonNullable<ReturnType<typeof chargeWith>["offered"]>>[0];
const large = (state: Sales, sale: string): boolean => (state.tools.sales.get(nameOf(sale))?.total ?? 0) >= 1000;
const narrowCharge = () => {
  const whole = chargeWith(chargedWith());
  return programAct<Shop, Charged>({
    name: whole.name,
    enter: whole.enter,
    undoable: true,
    purpose: whole.purpose,
    key: whole.key,
    on: "tool",
    input: chargedWith(),
    /** A sale nobody registered is not a large one either: the act has no cause of its own left. */
    refuses: [],
    among: (_answered, state) => ({ sales: sale => large(state, sale) }),
    run: (input, context) => whole.run(input, context),
    cases: [
      {
        promise: "a large sale is charged, picked from a list that has only the large ones",
        given: [registered, also],
        input: { sale: "sales/s1", amount: 500 },
        then: paid(500),
      },
      {
        promise: "a small sale is not charged through any door, and is not on the list to pick it from",
        given: [registered, also],
        input: { sale: "sales/s2", amount: 50 },
        then: { refused: toolTexts.notAmong },
      },
    ],
  });
};
export const narrowRegistry = [salesTool, { ...paymentsTool, acts: { ...paymentsTool.acts, charge: narrowCharge() } }];
export const narrowShop: Composition<Shop> = { ...shopProgram, registry: narrowRegistry };
