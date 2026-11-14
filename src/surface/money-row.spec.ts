import { expect, it } from "vitest";
import { moneyRegistry } from "../../tests/support/money-program.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopShown } from "../../tests/support/shop.ts";
import { houseTools } from "./bridge/house-tools.ts";
import { anyToolScreen } from "./bridge/any-tool.ts";
import type { Start } from "./bridge/house-ports.ts";

it("the current amount in a row uses its sale's currency, not the tool's", () => {
  const rig = shopRig({ registry: moneyRegistry });
  try {
    rig.attend("ana", "sales");
    rig.act("ana", "seed", { sale: "dollars", total: 5000 }, "sales");
    let start: Start | undefined;
    houseTools(
      rig.ports("ana", () => 17),
      {
        ...shopShown,
        screens: {
          sales: (ports, tool, words, acts, starter) => {
            start = starter;
            return anyToolScreen(ports, tool, words, acts, starter);
          },
        },
      },
    );
    expect(start?.("credit", "sales/dollars", { today: { amount: 1005 } }).detail).toBe("US$ 10,05");
    expect(start?.("credit", "sales/pesos", { today: { amount: 1005 } }).detail).toBe("$ 10,05");
  } finally {
    rig.close();
  }
});
