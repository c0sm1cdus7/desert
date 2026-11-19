// La terminal real dibuja el freno y permite proponer reglas desde sus preguntas declaradas.
import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown, shopRegistry } from "../../../tests/support/shop.ts";
import { keysOf } from "./input.ts";
import { textOf } from "./cells.ts";
import { paint } from "./paint.ts";
import { rulesTool } from "../../tools/rules/rules.ts";
import { rulesTexts } from "../../texts/rules.texts.ts";
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(close => close()));
it("frena al admin después de confirmar por teclado sin registrar la venta", async () => {
  const rig = shopRig();
  const router = houseRouter(
    rig.ports("ana", () => 5000),
    shopShown,
  );
  cleanup.push(() => {
    router.stop();
    rig.close();
  });
  rig.bus.emit(
    effect(
      "rule-versioned",
      {
        version: 1,
        previous: null,
        definition: {
          id: "sales-limit",
          text: "Tope de ventas",
          action: { tool: "sales", act: "register" },
          condition: { operator: "gt", field: { source: "input", path: "total" }, value: 10 },
          effect: "block",
        },
      },
      "ana",
    ),
  );
  keysOf("vrs1\r1500\r").forEach(key => router.send(key));
  await router.idle();
  const screen = textOf(paint(router.screen({ rows: 30 }), { cols: 106, rows: 36 })).join("\n");
  expect(screen).toContain(rulesTexts.blocked);
  expect(rig.state().tools.sales.size).toBe(0);
  expect(rig.facts().findLast(event => event.kind === "act-result")?.data).toMatchObject({
    status: "rejected",
    reason: rulesTexts.blocked,
  });
});
it("Reglas se ofrece en el sistema y sus preguntas no dependen de palabras de la distro", async () => {
  const rig = shopRig({ registry: [...shopRegistry, rulesTool(shopRegistry)] });
  const router = houseRouter(
    rig.ports("beto", () => 5000),
    shopShown,
  );
  cleanup.push(() => {
    router.stop();
    rig.close();
  });
  const press = async (value: string) => {
    keysOf(value).forEach(key => router.send(key));
    await router.idle();
  };
  await press("rp");
  expect(textOf(paint(router.screen({ rows: 30 }), { cols: 106, rows: 36 })).join("\n")).toContain("Identificador");
  await press("terminal-rule\rTope\rsales\rregister\r");
  expect(textOf(paint(router.screen({ rows: 30 }), { cols: 106, rows: 36 })).join("\n")).toContain("Condición");
  await press("ai\rf");
  expect(rig.state().house.rules.versions.get("terminal-rule")?.[0]?.author).toBe("beto");
  expect(rig.state().house.rules.active.size).toBe(0);
});
