import { shopShown } from "../../tests/support/shop.ts";
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { object } from "../catalogs/acts.ts";
import { day, money, quantity, thing } from "../catalogs/fields.ts";
import { chargingShop } from "../../tests/support/charging-shop.ts";
import { openingChecks } from "./coverage/opening-checks.ts";

const tool = chargingShop.registry.find(item => item.id === "payments");
if (!tool) throw new Error("missing tool");
const charge = tool.acts.charge;
if (!charge) throw new Error("missing act");
const sale = (state: Parameters<NonNullable<typeof charge.also>["with"]>[0], target: string) =>
  state.tools.sales.get(target.replace("sales/", "")) ??
  (() => {
    throw new Error("missing sale");
  })();
const input = object({
  sale: thing("Venta", "sales", undefined, undefined, "sin ventas para cobrar"),
  amount: money("Monto", 1),
  tip: Type.Optional(money("Propina")),
});
const check = (also: NonNullable<typeof charge.also>) =>
  openingChecks(chargingShop, { tool, name: "charge", act: { ...charge, input, also } }, shopShown);
const base = charge.also;
if (!base) throw new Error("missing offer");
it("checks only offered rows, allowing absent suggestions", async () => {
  await expect(
    check({ ...base, opens: (s, t) => ({ amount: sale(s, t).total - sale(s, t).paid }) }),
  ).resolves.toBeUndefined();
  await expect(check({ ...base, opens: () => ({ amount: undefined }) })).resolves.toBeUndefined();
  await expect(
    check({
      ...base,
      with: (s, t) => (sale(s, t).total < 1000 ? undefined : { sale: t }),
      opens: (s, t) => {
        if (sale(s, t).total < 1000) throw new Error("outside");
        return { amount: sale(s, t).total };
      },
    }),
  ).resolves.toBeUndefined();
});
it("reports an invalid suggestion on an enabled row", async () => {
  await expect(check({ ...base, opens: () => ({ amount: 0 }) })).rejects.toThrow(/amount.*0/u);
});

it("checks precision and calendar validity in calculated suggestions", async () => {
  const quantityInput = object({ sale: thing("Venta", "sales"), amount: quantity("Cantidad") });
  const dateInput = object({ sale: thing("Venta", "sales"), amount: day("Día") });
  await expect(
    openingChecks(
      chargingShop,
      {
        tool,
        name: "charge",
        act: { ...charge, input: quantityInput, also: { ...base, opens: () => ({ amount: 1.2345 }) } },
      },
      shopShown,
    ),
  ).rejects.toThrow(/amount.*1.2345/u);
  await expect(
    openingChecks(
      chargingShop,
      {
        tool,
        name: "charge",
        act: { ...charge, input: dateInput, also: { ...base, opens: () => ({ amount: "2025-02-30" }) } },
      },
      shopShown,
    ),
  ).rejects.toThrow(/amount.*2025-02-30/u);
});
