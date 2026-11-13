// Current values belong to an act, independently of the row or menu used to begin it.
import { describe, expect, it } from "vitest";
import { anyToolScreen } from "../surface/bridge/any-tool.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { begin } from "../surface/screen.ts";
import type { Composition } from "../tools/promises.ts";
import { correctingShop, registered } from "../../tests/support/correcting-shop.ts";
import { shopShown, type Shop } from "../../tests/support/shop.ts";
import { cast, given, staged } from "./promised-stage.ts";
import { seated } from "./promised-keys.ts";
import { walkedChecks } from "./promised-walk.ts";

const direct: Composition<Shop> = {
  ...correctingShop,
  registry: correctingShop.registry.map(tool => ({
    ...tool,
    menus: {},
    acts: Object.fromEntries(
      Object.entries(tool.acts).map(([name, act]) => {
        const { under: _under, ...plain } = act;
        return [name, plain];
      }),
    ),
  })),
};
/** A compiling surface sabotage: the act's current values are lost before the walk starts. */
const forgetful: Shown<Shop> = {
  ...shopShown,
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        actsOn: Object.fromEntries(
          Object.entries(plain.actsOn ?? {}).map(([name, act]) => {
            const { today: _today, ...forgotten } = act;
            return [name, forgotten];
          }),
        ),
      };
    },
  },
};

/** Another compiling sabotage: normalization says even identical complete data differ. */
const permissive: Shown<Shop> = {
  ...shopShown,
  screens: {
    sales: (ports, tool, words, acts, start) => {
      const plain = anyToolScreen(ports, tool, words, acts, start);
      return {
        ...plain,
        actsOn: Object.fromEntries(
          Object.entries(plain.actsOn ?? {}).map(([name, act]) => [name, { ...act, same: () => false }]),
        ),
      };
    },
  },
};

describe("current values through every entry", () => {
  for (const check of walkedChecks(direct, shopShown)) it(check.name, check.run);

  it("loads today's answers even when an action is begun without a row", () =>
    staged(direct, async ({ house }) => {
      await given(house(), "sales", [registered]);
      const seat = seated(house(), cast.admin, shopShown);
      try {
        expect(begin(seat.tools, "sales", "correct", "sales/s1")).toMatchObject({
          was: ["1500", "0"],
          answers: ["1500", "0"],
          typed: "1500",
          suggested: true,
        });
      } finally {
        seat.router.stop();
      }
    }));

  it("fails the derived guarantee when a compiling surface allows the current data to be sent", async () => {
    const checks = walkedChecks(direct, permissive).filter(
      check => check.name.startsWith("sales · correct ·") && check.name.endsWith(", by keys"),
    );
    expect(checks).toHaveLength(4);
    for (const check of checks) await expect(check.run()).rejects.toThrow("The current answer can be submitted");
  });

  it("fails the derived guarantee when a compiling surface drops the current values", async () => {
    const checks = walkedChecks(direct, forgetful).filter(
      check => check.name.startsWith("sales · correct ·") && check.name.endsWith(", by keys"),
    );
    expect(checks).toHaveLength(4);
    for (const check of checks) await expect(check.run()).rejects.toThrow("The question lost the current answers");
  });
});
