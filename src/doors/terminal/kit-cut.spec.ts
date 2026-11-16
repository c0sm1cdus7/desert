import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { keysOf } from "./input.ts";
import { textOf } from "./cells.ts";
import { paint } from "./paint.ts";

const closers: (() => void)[] = [];
afterEach(() => closers.splice(0).forEach(close => close()));
it("apaga la fila abierta; rechaza al confirmar la pregunta pendiente y deja leer", async () => {
  const rig = shopRig();
  const router = houseRouter(
    rig.ports("beto", () => 5000),
    shopShown,
  );
  const other = houseRouter(
    rig.ports("beto", () => 5000),
    shopShown,
  );
  closers.push(() => {
    router.stop();
    other.stop();
    rig.close();
  });
  const press = async (keys: string) => {
    keysOf(keys).forEach(key => router.send(key));
    await router.idle();
  };
  keysOf("v").forEach(key => other.send(key));
  await other.idle();
  await press("vrs1\r1500");
  rig.bus.emit(effect("kit-set", { holder: "beto", tool: "sales", acts: [] }, "ana"));
  const rows = other.screen({ rows: 30 }).body;
  expect(
    rows.kind === "list" && rows.stacks.flatMap(stack => stack.rows).find(act => act.key === "r")?.off,
  ).toBeTruthy();
  await press("\r");
  const screen = textOf(paint(router.screen({ rows: 30 }), { cols: 106, rows: 36 })).join("\n");
  expect(screen).toContain("fuera del kit");
  expect(rig.state().tools.sales.size).toBe(0);
  expect(rig.facts().findLast(event => event.kind === "act-result")?.data).toMatchObject({
    status: "rejected",
    reason: "fuera del kit",
  });
  rig.attend("ana", "sales");
  rig.act("ana", "register", { sale: "s2", total: 2500 }, "sales");
  await press("\x1b");
  const read = textOf(paint(router.screen({ rows: 30 }), { cols: 106, rows: 36 })).join("\n");
  expect(read).toContain("s2");
});
