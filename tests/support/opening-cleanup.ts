import { object } from "../../src/catalogs/acts.ts";
import { money, thing } from "../../src/catalogs/fields.ts";
import type { ProgramAct } from "../../src/tools/promises.ts";
import { chargingShop } from "./charging-shop.ts";
import type { Shop } from "./shop.ts";

export const registered = { act: "register", on: "sales", input: { sale: "s1", total: 1500 } };
export const openingCase = {
  promise: "a sale offers a payment",
  given: [registered],
  input: { sale: "sales/s1", amount: 1 },
  then: { refused: "unknown" },
};
export function openingFixture(change: Partial<ProgramAct<Shop>> = {}) {
  const original = chargingShop.registry.find(tool => tool.id === "payments");
  const charge = original?.acts.charge;
  if (!original || !charge?.also) throw new Error("missing charge");
  const act = {
    ...charge,
    input: object({ sale: thing("Venta", "sales", undefined, undefined, "sin ventas"), amount: money("Monto", 1) }),
    cases: [openingCase],
    ...change,
  };
  const tool = { ...original, acts: { ...original.acts, charge: act } };
  const program = {
    ...chargingShop,
    registry: chargingShop.registry.map(item => (item.id === tool.id ? tool : item)),
  };
  return { program, aim: { tool, name: "charge", act }, also: charge.also };
}
