// The test shop whose payments tool charges a sale: the sale is picked by its name, or the act is taken from the sale.
import { Type } from "@sinclair/typebox";
import { object } from "../../src/catalogs/acts.ts";
import { money, thing } from "../../src/catalogs/fields.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import { paymentsTool, salesTool, shop, shopProgram, type Shop } from "./shop.ts";

const charged = object({ sale: thing("Venta", "sales"), amount: money("Monto"), tip: Type.Optional(money("Propina")) });
const nameOf = (target: string): string => target.replace("sales/", "");
const registered = { act: "register", on: "sales", input: { sale: "s1", total: 1500 } };
const also = { act: "register", on: "sales", input: { sale: "s2", total: 90 } };
const paid = (amount: number) => ({
  says: "Charged s1",
  facts: [{ kind: "payment-received" as const, data: { payment: "for-s1", amount, sale: "s1" } }],
});
export const chargedFromSale =
  "payments · charge · a sale is charged from the sale itself, which says which sale it is";
export const chargedByName = "payments · charge · a sale is charged from payments, picked by its name";
/** Charging a sale receives a payment for it: the sale is one of the things of the sales tool. */
const charge = programAct<Shop, typeof charged>({
  label: "Cobrar",
  purpose: "Recibe un pago de una venta.",
  key: "c",
  on: "tool",
  input: charged,
  also: {
    tool: "sales",
    with: (_state, target) => ({ sale: target }),
    off: (state, target) => ((state.tools.sales.get(nameOf(target))?.paid ?? 0) >= 1500 ? "paid" : undefined),
    opens: (state, target) => ({ amount: state.tools.sales.get(nameOf(target))?.total ?? 0 }),
  },
  refuses: ["unknown"],
  run: ({ sale, amount }, { by, state }) => {
    if (!state.tools.sales.has(nameOf(sale))) return { status: "rejected", reason: "unknown" };
    const fact = shop.fact("payment-received", { payment: `for-${nameOf(sale)}`, amount, sale: nameOf(sale) }, by);
    return { status: "accepted", text: `Charged ${nameOf(sale)}`, effects: [fact] };
  },
  cases: [
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
  ],
});
const payments = { ...paymentsTool, acts: { ...paymentsTool.acts, charge } };
export const chargingShop: Composition<Shop> = { ...shopProgram, registry: [salesTool, payments] };
export const chargingRegistry = [salesTool, payments];
