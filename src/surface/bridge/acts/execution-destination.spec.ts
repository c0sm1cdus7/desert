// Walks production destination questions without injecting a destination into the host ports.
import { afterEach, expect, it } from "vitest";
import { genericTexts } from "../../../texts/generic-surface.texts.ts";
import { effect } from "../../../house/facts.ts";
import { houseRouter } from "../assembly/house-router.ts";
import { shopRig } from "../../../../tests/support/shop-rig.ts";
import { shopShown, shopRegistry } from "../../../../tests/support/shop.ts";
import { keysOf } from "../../../doors/terminal/input.ts";
import { paint } from "../../../doors/terminal/paint.ts";
import { textOf } from "../../../doors/terminal/cells.ts";
const cleanup: (() => void)[] = [];
afterEach(() => cleanup.splice(0).forEach(stop => stop()));
function fixture(at: "house" | "device" | "either", connected = true, irreversible = false) {
  const registry = shopRegistry.map(tool =>
    tool.id === "sales"
      ? {
          ...tool,
          acts: Object.fromEntries(
            Object.entries(tool.acts).map(([name, act]) => [
              name,
              name === "register"
                ? {
                    ...act,
                    ...(irreversible ? { undoable: false, confirms: () => "Confirmación original" } : {}),
                    execution: at === "house" ? { at } : { at, tool: "sales", version: "1" },
                  }
                : act,
            ]),
          ),
        }
      : tool,
  );
  const rig = shopRig({ registry });
  for (const id of ["mac", "vm", "old"]) {
    rig.bus.emit(effect("device-registered", { id, name: id, publicKey: "synthetic" }, "ana"));
    rig.bus.emit(effect("device-accepted", { device: id }, "ana"));
    if (connected)
      rig.bus.emit(
        effect(
          "device-connected",
          {
            device: id,
            connection: id,
            inventory: [{ tool: "sales", version: id === "old" ? "0" : "1", actions: ["register"] }],
          },
          "shop",
        ),
      );
  }
  const router = houseRouter(
    rig.ports("ana", () => 5000),
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
  const screen = () => textOf(paint(router.screen({ rows: 36 }), { cols: 120, rows: 40 })).join("\n");
  return { rig, press, screen };
}
it("offers the house and both compatible connected devices before execution", async () => {
  const f = fixture("either");
  await f.press("vrs1\r1500\r");
  expect(f.screen()).toContain("Dónde corre");
  expect(f.screen()).toContain("Casa");
  expect(f.screen()).toContain("mac");
  expect(f.screen()).toContain("vm");
  expect(f.screen()).not.toContain("old");
  expect(f.rig.state().tools.sales.size).toBe(0);
  await f.press("c");
  expect(f.screen()).toContain("Casa");
  await f.press("\r");
  expect(f.rig.state().tools.sales.size).toBe(1);
});
it("does not request a destination for a house-only action", async () => {
  const f = fixture("house");
  await f.press("vrs1\r1500\r");
  expect(f.rig.state().tools.sales.size).toBe(1);
});
it("explains when no compatible device is connected", async () => {
  const f = fixture("device", false);
  await f.press("vrs1\r1500\r");
  expect(f.screen()).toContain("No hay dispositivos conectados compatibles");
  expect(f.rig.state().tools.sales.size).toBe(0);
});

it("preserves the action's own confirmation and irreversible warning beside the destination", async () => {
  const f = fixture("either", true, true);
  await f.press("vrs1\r1500\r");
  await f.press("c");
  expect(f.screen()).toContain("Confirmación original");
  expect(f.screen()).toContain("Ejecutar en Casa");
  expect(f.screen()).toContain(genericTexts.irreversible.es);
  expect(f.rig.state().tools.sales.size).toBe(0);
});
