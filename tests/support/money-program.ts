// A local test shop: dollars belong to an existing sale; no provider or network is involved.
import { object } from "../../src/fields/visible-text.ts";
import { money, oneOf, option, thing } from "../../src/fields/fields.ts";
import { must } from "../../src/surface/session/window.ts";
import { programAct } from "../../src/tools/promises.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { formats } from "../../src/surface/formats/masks.ts";
import { salesTool, shop, shopShown, type Shop } from "./shop.ts";
import { shopWith } from "./shop-variants.ts";

export const symbol = (answered: Readonly<Record<string, unknown>>) => (answered.currency === "USD" ? "US$" : "$");
export const onSale = (answered: Readonly<Record<string, unknown>>, state: State<Shop>, target: string) => {
  if (typeof answered.sale !== "string" && !target.startsWith("sales/")) throw new Error("A sale target is required");
  const sale = (typeof answered.sale === "string" ? answered.sale : target).replace("sales/", "");
  return state.tools.sales.has(sale) && sale === "dollars" ? "US$" : "$";
};
const shown = (currency: string, amount: number) =>
  formats({ ...shopShown.locale, currency }).money.shown(String(amount));
export const input = object({
  currency: oneOf("Moneda", option("ARS", "Pesos", "p"), option("USD", "Dólares", "d")),
  amount: money("Precio", 1, symbol),
});
const given = [{ act: "seed", on: "sales", input: { sale: "dollars", total: 5000 } }];
const register = programAct<Shop, typeof input>({
  name: "registrar",
  enter: "registrar",
  undoable: true,
  purpose: "el precio de la venta",
  key: "r",
  on: "tool",
  input,
  cases: [
    {
      promise: "keeps the entered cents",
      input: { currency: "USD", amount: 1005 },
      then: {
        sure: "Precio · US$ 10,05",
        says: "Registrada · precio",
        facts: [{ kind: "sale-registered", data: { sale: "price", total: 1005 } }],
      },
    },
  ],
  confirms: value => `Precio · ${shown(symbol(value), value.amount)}`,
  run: (value, { by }) => ({
    status: "accepted",
    text: "Registrada · precio",
    effects: [shop.fact("sale-registered", { sale: "price", total: value.amount }, by)],
  }),
});
const edit = programAct<Shop, typeof input>({
  ...register,
  name: "cambiar",
  enter: "cambiar",
  key: "c",
  on: "thing",
  input,
  cases: [
    {
      promise: "changes the amount",
      given,
      on: "sales/dollars",
      input: { currency: "USD", amount: 1005 },
      then: { sure: "Precio · US$ 10,05", says: "Cambiado · precio", facts: [] },
    },
  ],
  today: () => ({ currency: "ARS", amount: 5000 }),
  confirms: value => `Precio · ${shown(symbol(value), value.amount)}`,
  run: () => ({ status: "accepted", text: "Cambiado · precio", effects: [] }),
});
const creditInput = object({ amount: money("Nota de crédito", 1, onSale) });
const credit = programAct<Shop, typeof creditInput>({
  name: "acreditar",
  enter: "acreditar",
  key: "a",
  on: "thing",
  undoable: true,
  purpose: "el importe de la nota",
  input: creditInput,
  cases: [
    {
      promise: "credits the amount",
      given,
      on: "sales/dollars",
      input: { amount: 1005 },
      then: { sure: "Nota · US$ 10,05", says: "Acreditada · nota", facts: [] },
    },
  ],
  confirms: (value, state, target) => `Nota · ${shown(onSale({}, state, target), value.amount)}`,
  run: () => ({ status: "accepted", text: "Acreditada · nota", effects: [] }),
});
const paymentInput = object({
  sale: thing("Venta", "sales", undefined, undefined, "sin ventas"),
  amount: money("Cobro", 1, onSale),
});
const receive = programAct<Shop, typeof paymentInput>({
  name: "recibir",
  enter: "recibir",
  key: "r",
  on: "tool",
  undoable: true,
  purpose: "el importe del cobro",
  input: paymentInput,
  cases: [
    {
      promise: "receives the amount",
      given,
      input: { sale: "sales/dollars", amount: 1005 },
      then: { sure: "Cobro · US$ 10,05", says: "Recibido · cobro", facts: [] },
    },
  ],
  also: { tool: "sales", with: (_, target) => ({ sale: target }) },
  confirms: (value, state, target) => `Cobro · ${shown(onSale(value, state, target), value.amount)}`,
  run: () => ({ status: "accepted", text: "Recibido · cobro", effects: [] }),
});
const seed = must(salesTool.acts.register);
const seeded = {
  ...seed,
  key: "s",
  cases: seed.cases.map(kase => ({
    ...kase,
    ...(kase.given ? { given: kase.given.map(step => ("act" in step ? { ...step, act: "seed" } : step)) } : {}),
  })),
};
/** Its sales and payments take money in another currency, in place of what the shop's own do. */
export const moneyRegistry = shopWith({
  sales: { acts: { seed: seeded, register, edit, credit }, only: true },
  payments: { acts: { receive }, only: true },
}).registry;
