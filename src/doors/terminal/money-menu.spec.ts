import { expect, it } from "vitest";
import { moneyRegistry } from "../../../tests/support/money-program.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { paint } from "./paint.ts";
import { textOf } from "./cells.ts";
it("R1: Menu, sale, also payment, confirmation and changed price all show the sale currency", async () => {
  const rig = shopRig({ registry: moneyRegistry });
  rig.attend("ana", "sales");
  rig.act("ana", "seed", { sale: "dollars", total: 5000 }, "sales");
  rig.act("ana", "seed", { sale: "ars", total: 5000 }, "sales");
  const router = houseRouter(
    rig.ports("ana", () => 17),
    shopShown,
  );
  const shown = () => textOf(paint(router.screen({ rows: 30 }), { cols: 80, rows: 30 })).join("\n");
  const keys = async (text: string) => {
    for (const char of text) {
      if (char === "\r") router.send({ kind: "confirm" });
      else if (char === "\x1b") router.send({ kind: "cancel" });
      else router.send({ kind: "type", text: char });
    }
    await router.idle();
  };
  try {
    await keys("v1r");
    expect(shown()).toContain("US$ 0,00");
    await keys("1005");
    expect(shown()).toContain("US$ 10,05");
    await keys("\r");
    expect(shown()).toContain("Cobro · US$ 10,05");
    await keys("\x1b\x1b");
    await keys("a1005\r");
    expect(shown()).toContain("Nota · US$ 10,05");
    await keys("\x1b\x1b");
    await keys("cd");
    expect(shown()).toContain("US$ 0,00");
    expect(shown()).not.toContain("50,00");
    await keys("\x1bp");
    expect(shown()).toContain("$ 0,00");
    expect(shown()).not.toContain("US$");
  } finally {
    router.stop();
    rig.close();
  }
});
