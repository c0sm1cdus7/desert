// Reproduces authority-dependent rule wording with the production keyboard, forms and renderer.
import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown, shopRegistry } from "../../../tests/support/shop.ts";
import { rulesTool } from "../../tools/rules/rules.ts";
import { keysOf } from "./input.ts";
import { textOf } from "./cells.ts";
import { paint } from "./paint.ts";
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(stop => stop()));
function fixture(by: string) {
  const rig = shopRig({ registry: [...shopRegistry, rulesTool(shopRegistry)] });
  const router = houseRouter(
    rig.ports(by, () => 5000),
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
  const screen = () => textOf(paint(router.screen({ rows: 36 }), { cols: 140, rows: 40 })).join("\n");
  return { rig, router, press, screen };
}
it("tells the admin before the last answer that saving activates the rule", async () => {
  const f = fixture("ana");
  await f.press("r");
  expect(f.screen()).not.toContain("[p] proponer");
  await f.press("gterminal-rule\rTope\rsales\rregister\rai\r");
  expect(f.screen()).toContain("Al guardar, la regla queda vigente");
  await f.press("f");
  expect(f.rig.state().house.rules.active.get("terminal-rule")).toBe(1);
});
it("tells a member the proposal awaits approval and preserves the active version", async () => {
  const f = fixture("beto");
  f.rig.bus.emit(
    effect(
      "rule-versioned",
      {
        previous: null,
        version: 1,
        definition: {
          id: "terminal-rule",
          text: "Tope anterior",
          action: { tool: "sales", act: "register" },
          condition: { operator: "actor", kind: "identity" },
          effect: "frena",
        },
      },
      "ana",
    ),
  );
  await f.press("rpterminal-rule\rTope nuevo\rsales\rregister\rai\r");
  expect(f.screen()).toContain("La propuesta espera aprobación; sigue vigente la versión anterior");
  await f.press("f");
  expect(f.rig.state().house.rules.active.get("terminal-rule")).toBe(1);
  expect(f.rig.state().house.rules.versions.get("terminal-rule")).toHaveLength(2);
  expect(f.screen()).toContain("Borrador guardado; espera aprobación");
});
it("updates the effect and verb when a member becomes admin during the form", async () => {
  const f = fixture("beto");
  await f.press("rpterminal-rule\rTope\rsales\rregister\rai\r");
  f.rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  expect(f.screen()).toContain("Al guardar, la regla queda vigente");
  expect(f.screen()).toContain("guardar");
  expect(f.screen()).not.toContain("enter proponer");
  await f.press("f");
  expect(f.rig.state().house.rules.active.get("terminal-rule")).toBe(1);
});
it("warns a former admin and prevents a stale save from changing the active rule", async () => {
  const f = fixture("ana");
  await f.press("rgterminal-rule\rTope\rsales\rregister\rai\r");
  f.rig.bus.emit(effect("handed", { to: "beto" }, "ana"));
  expect(f.screen()).toContain("Cambió quién administra; volvé a Reglas para proponer el cambio");
  await f.press("f");
  expect(f.rig.state().house.rules.versions.has("terminal-rule")).toBe(false);
});
