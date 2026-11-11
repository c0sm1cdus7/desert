// The test shop with an act on one of its things, and screens that list those things deeper, or not at all.
import { object } from "../../src/catalogs/acts.ts";
import { anyToolScreen } from "../../src/surface/bridge/any-tool.ts";
import { section, type ProgramScreen, type Shown } from "../../src/surface/bridge/house-ports.ts";
import type { ViewRow } from "../../src/surface/shown-tool.ts";
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
export const stillOwing = "sales · settle · a sale that still owes keeps asking for attention when another is settled";
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
        needs: [],
      },
    },
    {
      promise: "a sale that still owes keeps asking for attention when another is settled",
      given: [registered, { act: "register", input: { sale: "s2", total: 90 } }],
      on: "sales/s1",
      input: {},
      then: {
        says: "Settled s1",
        facts: [{ kind: "payment-received", data: whole }],
        needs: [{ target: "sales/s2", why: "Debe $ 90" }],
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
/** Every sale that still owes needs someone to act, and says how much. */
const owing = (state: State<Shop>) =>
  [...state.tools.sales.keys()]
    .map(sale => `sales/${sale}`)
    .filter(target => owed(state, target) > 0)
    .map(target => ({ target, why: `Debe $ ${owed(state, target)}` }));
const needing = { ...salesTool, needs: owing, acts: { ...salesTool.acts, settle } };
export const settlingShop: Composition<Shop> = { ...shopProgram, registry: [needing, paymentsTool] };
/** The same shop, whose sales never say they need anyone: what its cases promise of that is not kept. */
export const carelessShop: Composition<Shop> = {
  ...shopProgram,
  registry: [{ ...needing, needs: () => [] }, paymentsTool],
};
export const every = "sales:every";
/** The sales one view further in: the tool's own view opens a row that lists them. */
const nested: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const plain = anyToolScreen(ports, tool, words, acts, start);
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
const hiding: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const plain = anyToolScreen(ports, tool, words, acts, start);
  return {
    ...plain,
    view: target => (target === undefined ? [section(words.listed, [], words.empty)] : plain.view(target)),
  };
};
export const nestedShown: Shown<Shop> = { ...shopShown, screens: { sales: nested } };
export const hidingShown: Shown<Shop> = { ...shopShown, screens: { sales: hiding } };
/** The same shop, whose settling says that the sale leaves the list it was opened from. */
export const leavingShop: Composition<Shop> = {
  ...shopProgram,
  registry: [{ ...needing, acts: { ...needing.acts, settle: { ...settle, leaves: true } } }, paymentsTool],
};
const settledOnes = "sales:settled";
/** The settled sales apart: the tool's own view lists what still owes, and one row opens the rest. */
const apart: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const plain = anyToolScreen(ports, tool, words, acts, start);
  const owing = (row: ViewRow): boolean => owed(ports.state(), row.opens ?? "") > 0;
  return {
    ...plain,
    titleOf: target => (target === settledOnes ? "Saldadas" : (plain.titleOf?.(target) ?? target)),
    view: target => {
      if (target !== undefined && target !== settledOnes) return plain.view(target);
      const rows = plain.view().flatMap(stack => stack.rows);
      const done = rows.filter(row => !owing(row));
      if (target === settledOnes) return [section("Saldadas", done)];
      const rest = done.length ? [section("Saldadas", [{ title: "Saldadas", opens: settledOnes }])] : [];
      return [section(words.listed, rows.filter(owing), words.empty), ...rest];
    },
  };
};
export const apartShown: Shown<Shop> = { ...shopShown, screens: { sales: apart } };
/** A screen that takes off its list what cannot be done now, instead of leaving it there saying why. */
const muted: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const quiet = Object.entries(acts.actsOn ?? {}).map(([name, act]) => {
    const listed = (target: string): boolean => (act.listed?.(target) ?? true) && act.off?.(target) === undefined;
    return [name, { ...act, listed, off: () => undefined }] as const;
  });
  return anyToolScreen(ports, tool, words, { ...acts, actsOn: Object.fromEntries(quiet) }, start);
};
export const mutedShown: Shown<Shop> = { ...shopShown, screens: { sales: muted } };
/** A screen that keeps on its list what cannot be done, whatever the person prefers to see. */
const stubborn: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const every = Object.entries(acts.actsOn ?? {}).map(([name, act]) => {
    const listed = (target: string): boolean => tool.targets(ports.state()).includes(target);
    return [name, { ...act, listed }] as const;
  });
  return anyToolScreen(ports, tool, words, { ...acts, actsOn: Object.fromEntries(every) }, start);
};
export const stubbornShown: Shown<Shop> = { ...shopShown, screens: { sales: stubborn } };
/** A screen that does not say how its things are found: nobody can look into its tool. */
const deaf: ProgramScreen<Shop> = (ports, tool, words, acts, start) => {
  const plain = anyToolScreen(ports, tool, words, acts, start);
  return {
    ...acts,
    id: plain.id,
    name: plain.name,
    place: plain.place,
    summary: () => plain.summary(),
    titleOf: target => plain.titleOf?.(target) ?? target,
    view: target => plain.view(target),
  };
};
export const deafShown: Shown<Shop> = { ...shopShown, screens: { sales: deaf } };
