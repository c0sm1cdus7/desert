// Composition and derived checks catch missing contracts before the person can reach a defective question.
import { expect, expectTypeOf, it } from "vitest";
import { object } from "../../fields/visible-text.ts";
import { day } from "../../fields/fields.ts";
import type { ViewLimits } from "../../tools/tool-contract.ts";
import type { RouterSource } from "../../surface/router/router.ts";
import type { Execution } from "../../tools/execute.ts";
import { shopProgram, shopShown, type Shop } from "../../../tests/support/shop.ts";
import { chargingShop } from "../../../tests/support/charging-shop.ts";
import { unchangedShop } from "../../../tests/support/unchanged-shop.ts";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import { anyToolScreen } from "../../surface/bridge/views/any-tool.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { localPorts } from "../../runtime/house-runtime.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { seated, type, view } from "./promised-keys.ts";
import { choiceChecks } from "./choices/promised-choices.ts";
import { programChecks } from "../program-checks.ts";

it("requires a reading instant and a defect reporter, and has no execution refusal hook", () => {
  expectTypeOf<Omit<ViewLimits, "now">>().not.toExtend<ViewLimits>();
  expectTypeOf<Omit<RouterSource, "defect">>().not.toExtend<RouterSource>();
  expectTypeOf<"refuse">().not.toExtend<keyof Execution<Shop>>();
});
const closed = {
  ...chargingShop,
  registry: chargingShop.registry.map(tool =>
    tool.id === "sales" ? { ...tool, closed: (_state: unknown, target: string) => target === "sales/s1" } : tool,
  ),
};
for (const check of choiceChecks(closed, shopShown)) it(check.name, check.run);
it("omits closed things even when current, including in a search", () =>
  staged(closed, async ({ house }) => {
    await given(
      house(),
      "sales",
      ["s1", "s2"].map(sale => ({ act: "register", input: { sale, total: 100 } })),
    );
    const seat = seated(house(), cast.admin, shopShown);
    try {
      const charge = seat.tools.find(tool => tool.id === "payments")?.acts.charge;
      if (!charge) throw new Error("Missing charge");
      Reflect.set(charge, "today", () => ["sales/s1", "100"]);
      type(seat.router, "pc");
      const screen = JSON.stringify(seat.router.screen(view).body);
      expect(screen).not.toContain('"s1"');
      expect(screen).not.toContain("datos inválidos");
      type(seat.router, " s1");
      expect(JSON.stringify(seat.router.screen(view).body)).not.toContain('"title":"s1"');
      seat.router.send({ kind: "confirm" });
      expect(seat.requests).toEqual([]);
    } finally {
      seat.router.stop();
    }
  }));
it("fails the derived check when a custom screen offers a closed thing", async () => {
  const shown: Shown<Shop> = {
    ...shopShown,
    screens: {
      payments: (...args) => {
        const plain = anyToolScreen(...args);
        return {
          ...plain,
          acts: Object.fromEntries(
            Object.entries(plain.acts).map(([name, act]) => [
              name,
              {
                ...act,
                next: answers => {
                  const field = act.next(answers);
                  return field?.kind === "pick"
                    ? { ...field, found: query => [...field.found(query), { title: "s1", value: "sales/s1" }] }
                    : field;
                },
              },
            ]),
          ),
        };
      },
    },
  };
  const check = choiceChecks(closed, shown).find(check => check.name.includes("picked by its name"));
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toMatchObject({ actual: true, expected: false });
});
it("records an inconsistent unchanged option as a defect instead of labeling another value current", () => {
  const source = unchangedShop("one");
  const program = {
    ...source,
    registry: source.registry.map(tool =>
      tool.id !== "payments"
        ? tool
        : {
            ...tool,
            acts: Object.fromEntries(
              Object.entries(tool.acts).map(([name, act]) => [
                name,
                name === "adjust" ? { ...act, today: () => ({ item: "1", value: "new" }) } : act,
              ]),
            ),
          },
    ),
  };
  return staged(program, ({ house }) => {
    const seat = seated(house(), cast.admin, shopShown);
    try {
      type(seat.router, "pap");
      expect(JSON.stringify(seat.router.screen(view))).toContain("E-PROG-1");
      expect(JSON.stringify(house().tools.state().entries)).toContain("differs from the declared current");
      expect(seat.requests).toEqual([]);
      return Promise.resolve();
    } finally {
      seat.router.stop();
    }
  });
});
it("rejects a plain dated question at composition and through the derived gate", async () => {
  const program = {
    ...shopProgram,
    registry: shopProgram.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          {
            ...act,
            input: object({ on: day("Día") }),
          },
        ]),
      ),
    })),
  };
  await staged(program, ({ house }) => {
    expect(() => houseTools(localPorts(house(), cast.admin, { recentLines: 100 }), shopShown)).toThrow(
      "program does not say what day",
    );
    return Promise.resolve();
  });
  const check = programChecks(program, shopShown).find(check => check.name.endsWith(", by keys"));
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow(
    "sales register holds a day to today and the program does not say what day it is",
  );
});
it("checks also.off against declared causes while drawing, and fails the derived gate", async () => {
  const program = {
    ...chargingShop,
    registry: chargingShop.registry.map(tool => ({
      ...tool,
      acts: Object.fromEntries(
        Object.entries(tool.acts).map(([name, act]) => [
          name,
          act.also
            ? {
                ...act,
                also: { ...act.also, off: () => "motivo ajeno" },
              }
            : act,
        ]),
      ),
    })),
  };
  await staged(program, async ({ house }) => {
    await given(house(), "sales", [{ act: "register", input: { sale: "s1", total: 100 } }]);
    const seat = seated(house(), cast.admin, shopShown);
    try {
      type(seat.router, "v1");
      const screen = JSON.stringify(seat.router.screen(view));
      expect(screen).toContain("E-PROG-1");
      expect(screen).not.toContain("motivo ajeno");
      expect(JSON.stringify(house().tools.state().entries)).toContain("motivo ajeno");
      seat.router.send({ kind: "cancel" });
      expect(seat.router.screen(view).title).toBe("Ventas");
    } finally {
      seat.router.stop();
    }
  });
  const check = programChecks(program, shopShown).find(
    check =>
      check.name.startsWith("payments · charge") &&
      check.name.includes("from the sale itself") &&
      check.name.endsWith(", by keys"),
  );
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow("E-PROG-1 · Falló el programa · sales/sales");
});
