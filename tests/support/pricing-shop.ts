// The test shop where what a sale says is changed where it is read: the row of its total opens the act that changes it.
import { object } from "../../src/catalogs/acts.ts";
import { money } from "../../src/catalogs/fields.ts";
import { programAct, type Composition, type Offered } from "../../src/tools/promises.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { paymentsTool, salesTool, shop, shopProgram, type Shop } from "./shop.ts";

const priced = object({ total: money("Total") });
const nameOf = (target: string): string => target.replace("sales/", "");
const saleAt = (state: State<Shop>, target: string) => state.tools.sales.get(nameOf(target));
/** Why the total of a sale stays as it is: a sale paid whole is closed. */
const closed = (state: State<Shop>, target: string): string | undefined => {
  const sale = saleAt(state, target);
  return sale && sale.paid >= sale.total ? "paid" : undefined;
};
export const registered = { act: "register", input: { sale: "s1", total: 1500 } };
export const paidWhole = { act: "receive", on: "payments", input: { payment: "p1", amount: 1500, sale: "s1" } };
export const repriced = "sales · price · the total of a sale is changed where it is read";
export const paidStays = "sales · price · a sale paid whole keeps its total";
const offer = {
  name: "total",
  enter: "cambiar",
  undoable: true,
  purpose: "el total de la venta",
  key: "t",
  on: "thing",
} as const;
/** Changing the total of a sale, declared as what it changes of what its tool reads, or not. */
const pricing = (how: Offered) =>
  programAct<Shop, typeof priced>({
    ...how,
    input: priced,
    today: (state, target) => {
      const sale = saleAt(state, target);
      return sale && { total: sale.total };
    },
    refuses: ["paid"],
    offered: closed,
    run: (input, { by, state, target }) => {
      const sale = saleAt(state, target);
      if (!sale || closed(state, target)) return { status: "rejected", reason: "paid" };
      const fact = shop.fact("sale-corrected", { sale: nameOf(target), total: input.total, paid: sale.paid }, by);
      return { status: "accepted", text: `Cambiado · ${nameOf(target)} · $ ${input.total}`, effects: [fact] };
    },
    cases: [
      {
        promise: "the total of a sale is changed where it is read",
        given: [registered],
        on: "sales/s1",
        input: { total: 1800 },
        then: {
          says: "Cambiado · s1 · $ 1800",
          facts: [{ kind: "sale-corrected", data: { sale: "s1", total: 1800, paid: 0 } }],
          reads: { lines: [{ total: "$ 1800", paid: "$ 0", by: "ana" }] },
        },
      },
      {
        promise: "a sale paid whole keeps its total",
        given: [registered, paidWhole],
        on: "sales/s1",
        input: { total: 1800 },
        then: { refused: "paid" },
      },
    ],
  });
const shopWith = (how: Offered): Composition<Shop> => ({
  ...shopProgram,
  registry: [{ ...salesTool, acts: { ...salesTool.acts, price: pricing(how) } }, paymentsTool],
});
export const pricingShop = shopWith({ ...offer, changes: "total" });
/** The same act, named as the datum and never saying it changes it: it would be read twice. */
export const looseShop = shopWith(offer);
/** The same act, saying it changes a datum its tool does not read. */
export const astrayShop = shopWith({ ...offer, changes: "price" });
