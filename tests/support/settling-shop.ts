// The test shop with an act on one of its things, and screens that list those things deeper, or not at all.
import { object } from "../../src/catalogs/acts.ts";
import { anyToolScreen } from "../../src/surface/bridge/any-tool.ts";
import { section, type ProgramScreen, type Shown } from "../../src/surface/bridge/house-ports.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import type { State } from "../../src/tools/tool-contract.ts";
import { paymentsTool, salesTool, shop, shopProgram, shopShown, type Shop } from "./shop.ts";

const taken = object({});
const nameOf = (target: string): string => target.replace("sales/", "");
/** What a sale still owes: nothing once it was paid whole. */
const owed = (state: State<Shop>, target: string): number => {
  const sale = state.tools.sales.get(nameOf(target));
  return sale ? sale.total - sale.paid : 0;
};
/** Why a sale is not settled as it stands: only a sale paid whole has a reason. */
const settled = (state: State<Shop>, target: string): string | undefined => {
  const sale = state.tools.sales.get(nameOf(target));
  return sale && sale.paid >= sale.total ? "settled" : undefined;
};
export const registered = { act: "register", input: { sale: "s1", total: 1500 } };
const whole = { payment: "full-s1", amount: 1500, sale: "s1" };
export const settles = "sales · settle · a sale is settled for what it still owes";
export const settledTwice = "sales · settle · a settled sale is not settled again";
/** Settling a sale receives, in one act on it, the payment for everything it still owes. */
const settle = programAct<Shop, typeof taken>({
  label: "Saldar",
  purpose: "Recibe de una vez lo que la venta todavía debe.",
  key: "s",
  on: "thing",
  input: taken,
  refuses: ["settled"],
  offered: settled,
  run: (_input, { by, state, target }) => {
    const amount = owed(state, target);
    if (amount <= 0) return { status: "rejected", reason: "settled" };
    const sale = nameOf(target);
    const fact = shop.fact("payment-received", { payment: `full-${sale}`, amount, sale }, by);
    return { status: "accepted", text: `Settled ${sale}`, effects: [fact] };
  },
  cases: [
    {
      promise: "a sale is settled for what it still owes",
      given: [registered],
      on: "sales/s1",
      input: {},
      then: {
        says: "Settled s1",
        facts: [{ kind: "payment-received", data: whole }],
        reads: { lines: [{ total: "$ 1500", paid: "$ 1500", by: "ana" }] },
      },
    },
    {
      promise: "a settled sale is not settled again",
      given: [registered, { act: "settle", on: "sales/s1", input: {} }],
      on: "sales/s1",
      input: {},
      then: { refused: "settled" },
    },
  ],
});
export const settlingShop: Composition<Shop> = {
  ...shopProgram,
  registry: [{ ...salesTool, acts: { ...salesTool.acts, settle } }, paymentsTool],
};
export const every = "sales:every";
/** The sales one view further in: the tool's own view opens a row that lists them. */
const nested: ProgramScreen<Shop> = (ports, tool, words, acts) => {
  const plain = anyToolScreen(ports, tool, words, acts);
  return {
    ...plain,
    titleOf: target => (target === every ? "Todas" : (plain.titleOf?.(target) ?? target)),
    view: target => {
      if (target === undefined) return [section(words.listed, [{ title: "Todas", opens: every }])];
      return plain.view(target === every ? undefined : target);
    },
  };
};
/** The sales on no view at all: each one still reads when asked for, and nothing leads a person to it. */
const hiding: ProgramScreen<Shop> = (ports, tool, words, acts) => {
  const plain = anyToolScreen(ports, tool, words, acts);
  return {
    ...plain,
    view: target => (target === undefined ? [section(words.listed, [], words.empty)] : plain.view(target)),
  };
};
export const nestedShown: Shown<Shop> = { ...shopShown, screens: { sales: nested } };
export const hidingShown: Shown<Shop> = { ...shopShown, screens: { sales: hiding } };
