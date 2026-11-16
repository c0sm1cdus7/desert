import { Type, type TSchema } from "@sinclair/typebox";
import { expect, it, vi } from "vitest";
import { object } from "../catalogs/acts.ts";
import { money, thing, when } from "../catalogs/fields.ts";
import { openingFixture, openingCase } from "../../tests/support/opening-cleanup.ts";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import { programChecks } from "./program-checks.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { openingChecks } from "./coverage/opening-checks.ts";
import { actRow, seated } from "./promised-keys.ts";
import { cast, given, staged } from "./promised-stage.ts";

function fixture(
  available: boolean,
  opens = vi.fn(() => ({ amount: 0 })),
  extra: TSchema = thing("Otra venta", "sales", undefined, undefined, "sin opciones"),
) {
  const { also } = openingFixture();
  return {
    ...openingFixture({
      input: object({
        sale: thing("Venta", "sales", undefined, undefined, "sin ventas"),
        other: extra,
        amount: money("Monto", 1),
      }),
      refuses: ["unknown", "monto de más", "paid", "no elegible"],
      among: answered => ({ sales: () => (answered.sale === "sales/s1" && !available ? "no elegible" : undefined) }),
      also: { ...also, opens },
    }),
    opens,
  };
}
it("skips an invalid suggestion when the actual row has no eligible options", async () => {
  const { program, aim, opens } = fixture(false);
  await staged(program, async ({ house }) => {
    await given(house(), "payments", openingCase.given);
    const seat = seated(house(), cast.admin, shopShown);
    try {
      const found = actRow(seat, aim, "payments", () => true, { tool: "sales", target: "sales/s1" });
      expect(found?.row.off).toBe(true);
      expect(opens).not.toHaveBeenCalled();
    } finally {
      seat.router.stop();
    }
  });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
});
it("does not call a throwing suggestion behind the same disabled row", async () => {
  const { program, aim } = fixture(
    false,
    vi.fn(() => {
      throw new Error("not offered");
    }),
  );
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
});
it("checks the same shop with choices, naming the invalid field and value", async () => {
  const { program, aim, opens } = fixture(true);
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
  expect(opens).toHaveBeenCalled();
});
it("checks a valid suggestion with choices", async () => {
  const { program, aim, opens } = fixture(
    true,
    vi.fn(() => ({ amount: 1 })),
  );
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).toHaveBeenCalledTimes(1);
});
it.each([
  Type.Optional(thing("Otra venta", "sales", "Ninguna", undefined, "sin opciones")),
  thing("Otra venta", "sales", undefined, "register", "sin opciones"),
  when(thing("Otra venta", "sales", "Ninguna", undefined, "sin opciones"), () => false),
])("keeps none, an available maker and an unasked choice open", async extra => {
  const { program, aim } = fixture(false, undefined, extra);
  await expect(openingChecks(program, aim, shopShown)).rejects.toThrow(/amount.*0/u);
});
it("uses the program's actual finder, not all declared targets as choices", async () => {
  const { program, aim, opens } = fixture(true);
  const shown = {
    ...shopShown,
    screens: {
      sales: (...args: Parameters<typeof anyToolScreen<Shop>>) => ({
        ...anyToolScreen(...args),
        find: () => [],
      }),
    },
  };
  await expect(openingChecks(program, aim, shown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
  const derived = programChecks(program, shown).find(check => check.name.startsWith("payments · charge · promises"));
  expect(derived).toBeDefined();
  // The suggestion check runs before coverage checks the case promises.
  await expect(derived?.run()).rejects.toThrow("no case promises what the act does");
  expect(opens).not.toHaveBeenCalled();
});
it("excludes closed things from the first question", async () => {
  const { program, aim, opens } = fixture(true);
  const closed = {
    ...program,
    registry: program.registry.map(tool =>
      tool.id === "sales"
        ? {
            ...tool,
            closed: () => true,
          }
        : tool,
    ),
  };
  await expect(openingChecks(closed, aim, shopShown)).resolves.toBeUndefined();
  expect(opens).not.toHaveBeenCalled();
});
it("resolves the fixed answers before availability, in the same order as the row", async () => {
  const { also } = openingFixture();
  const asked = vi.fn(() => false);
  const opens = vi.fn(() => ({ amount: 0 }));
  const offered = vi.fn(() => {
    expect(asked).toHaveBeenCalled();
    return "paid";
  });
  const { program, aim } = openingFixture({
    input: object({
      sale: thing("Venta", "sales", undefined, undefined, "sin ventas"),
      other: when(thing("Otra venta", "sales", "Ninguna", undefined, "sin opciones"), asked),
      amount: money("Monto", 1),
    }),
    offered,
    also: { ...also, opens },
  });
  await expect(openingChecks(program, aim, shopShown)).resolves.toBeUndefined();
  expect(offered).toHaveBeenCalled();
  expect(opens).not.toHaveBeenCalled();
});
