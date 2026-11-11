// Shops that break a promise, each in one way: the derived checks have to catch exactly what each one broke.
import { emptyHouse } from "../../src/house/house.ts";
import { programAct, type Composition } from "../../src/tools/promises.ts";
import type { ActContext, ActResult } from "../../src/tools/tool-contract.ts";
import { paymentsTool, registerCases, registerOffer, salesTool, shop, shopCatalog } from "./shop.ts";
import { shopProgram, shopSlices } from "./shop.ts";
import type { Sales, Shop } from "./shop.ts";

type Told = { sale: string; total: number };
type Run = (input: Told, context: ActContext<Shop>) => ActResult<Shop>;
const honest: Run = (input, { by, state }) =>
  state.tools.sales.has(input.sale)
    ? { status: "rejected", reason: "repeated" }
    : { status: "accepted", text: `Sale ${input.sale}`, effects: [shop.fact("sale-registered", input, by)] };
/** The shop with another way of registering a sale, under the same promises. */
const registering = (run: Run, refuses: readonly string[] = ["repeated"]): Composition<Shop> => {
  const input = shopCatalog["sale-registered"];
  const register = programAct<Shop, typeof input>({ ...registerOffer, input, refuses, run, cases: registerCases });
  return { ...shopProgram, registry: [{ ...salesTool, acts: { register } }, paymentsTool] };
};
/** It keeps every sale at twice what it was told: the fact is right, what is read of it is not. */
const doubling = (kept: Sales, event: Parameters<typeof shopSlices.step.sales>[1]): Sales => {
  const next = shopSlices.step.sales(kept, event, { ...emptyState, tools: { sales: kept, payments: nothing } });
  if (event.kind !== "sale-registered") return next;
  return new Map(next).set(event.data.sale, { total: event.data.total * 2, paid: 0, by: event.by });
};
let opened = 0;
/** What it keeps depends on how many times it was folded, not on the journal alone. */
const forgetful = (kept: Sales, event: Parameters<typeof shopSlices.step.sales>[1]): Sales => {
  const next = shopSlices.step.sales(kept, event, { ...emptyState, tools: { sales: kept, payments: nothing } });
  if (event.kind !== "sale-registered") return next;
  opened += 1;
  return new Map(next).set(event.data.sale, { total: event.data.total, paid: opened, by: event.by });
};
const nothing = shopSlices.initial.payments;
const emptyState = {
  by: "",
  house: emptyHouse,
  entries: [],
  attends: [],
  attendance: new Map<string, readonly string[]>(),
  looked: new Map<string, ReadonlyMap<string, number>>(),
  attention: new Map<string, { delay: number; wake: string }>(),
  attentionBy: new Map<string, ReadonlyMap<string, { delay: number; wake: string }>>(),
  processing: new Map<string, never>(),
  acts: new Map<string, never>(),
  through: 0,
};
const told = "sales · register · a sale is registered as it was told";
const again = "sales · register · a sale already registered is not registered again";
const covered = "sales · register · promises a case for what it does and for each cause it refuses with";
const paid = "payments · receive · a payment for a sale is received";
/** The same check walked by keys: a promise broken in the act is broken on every door. */
const keys = (check: string): string => `${check}, by keys`;
export const brokenShops: readonly Readonly<{ name: string; program: Composition<Shop>; fails: readonly string[] }>[] =
  [
    {
      name: "a shop that writes another total than the one it was told",
      program: registering((input, context) => honest({ ...input, total: input.total + 1 }, context)),
      fails: [told, keys(told)],
    },
    {
      name: "a shop that registers the same sale twice",
      program: registering((input, context) =>
        honest(input, { ...context, state: { ...context.state, tools: shopSlices.initial } }),
      ),
      fails: [again, keys(again)],
    },
    {
      name: "a shop that refuses with a cause it never declared",
      program: registering(honest, []),
      fails: [covered, again],
    },
    {
      name: "a shop that declares a refusal and promises no case for it",
      program: registering(honest, ["repeated", "closed"]),
      fails: [covered],
    },
    {
      name: "a shop that says something else than it promised",
      program: registering((input, context) => {
        const done = honest(input, context);
        return done.status === "accepted" ? { ...done, text: "Done" } : done;
      }),
      fails: [told, keys(told)],
    },
    {
      name: "a shop that tells of a sale only who registered it",
      program: registering((input, context) => {
        const done = honest(input, context);
        return done.status === "accepted" ? { ...done, recipient: context.by } : done;
      }),
      fails: [told],
    },
    {
      name: "a shop that keeps another total than the one its sale reads",
      program: { ...shopProgram, slices: { ...shopSlices, step: { ...shopSlices.step, sales: doubling } } },
      fails: [told],
    },
    {
      name: "a shop whose sales cannot be rebuilt from the journal alone",
      program: { ...shopProgram, slices: { ...shopSlices, step: { ...shopSlices.step, sales: forgetful } } },
      fails: [told, again, paid],
    },
  ];
