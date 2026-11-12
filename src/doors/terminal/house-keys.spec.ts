// What a key does where it could have done nothing: enter on what a datum already is, a key with no room left, the
// Menu looking for a tool by its name, and what is said read back from its options.
import { afterEach, describe, expect, it } from "vitest";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import type { Screen } from "../../surface/contract.ts";
import type { Router } from "../../surface/router.ts";
import { textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";

const size = { cols: 106, rows: 30 };
const closing: { close?(): void; stop?(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => (open.stop ?? open.close)?.()));
const lines = (screen: Screen, at = size): readonly string[] =>
  textOf(paint(screen, at))
    .map(line => line.trim().replace(/ {2,}/gu, " | "))
    .filter(Boolean);
const open = () => {
  const rig = shopRig({ grants: { ana: ["sales", "payments"] } });
  const router: Router = houseRouter(
    rig.ports("ana", () => 5_000),
    shopShown,
  );
  closing.push(router, rig);
  const press = async (keys: string): Promise<readonly string[]> => {
    for (const key of keysOf(keys)) router.send(key);
    await router.idle();
    return lines(router.screen({ rows: contentRows(size.rows) }));
  };
  return { router, press };
};

describe("a key that could have done nothing", () => {
  it("opens a choice on what the datum already is, and enter on it says nothing would change", async () => {
    const { press } = open();
    expect(await press(",a")).toEqual(expect.arrayContaining(["[m] Mostrar | actual", "[o] Ocultar"]));
    expect(await press("\r")).toEqual(expect.arrayContaining(["Error sin cambios", "[m] Mostrar | actual"]));
  });

  it("says a field has no room for more of what it does take, apart from a key it never takes", async () => {
    const { press } = open();
    expect(await press(`vrs1\r${"9".repeat(17)}`)).toEqual(
      expect.arrayContaining(["Error no entra más", "› $ 99.999.999.999,99"]),
    );
  });

  it("finds a tool by its name from the Menu, before what each tool finds", async () => {
    const { press } = open();
    expect(await press(" ven")).toEqual(expect.arrayContaining(["› ven", "Herramientas", "ventas | 0 ventas"]));
    expect((await press("\r"))[0]).toContain("Ventas");
  });
});

describe("what is said, when it does not fit above its options", () => {
  const said = Array.from({ length: 12 }, (_, i) => `renglón ${i + 1}`).join("\n");
  const options = [
    { title: "volver", key: "v", selected: true },
    { title: "emitir", key: "e" },
  ];
  const screen = (read?: number): Screen => ({
    title: "Nueva factura",
    state: "connected",
    clock: "12:00",
    hints: [],
    menu: false,
    body: { kind: "thread", events: [{ text: [{ text: said, tone: "t1" }] }], options, ...(read ? { read } : {}) },
  });
  const small = { cols: 80, rows: 16 };

  it("shows its end by the options, and read back shows what was cut, saying what is left below", () => {
    const end = lines(screen(), small);
    expect(end).toEqual(expect.arrayContaining(["renglón 12", "[v] volver", "[e] emitir"]));
    expect(end).not.toContain("renglón 1");
    expect(end.some(line => line.startsWith("↑"))).toBe(true);
    /** One window back: what is above and what is below are both said. */
    const middle = lines(screen(1), small);
    expect(middle).toEqual(expect.arrayContaining(["↑ 1 más", "renglón 2", "↓ 6 más", "[v] volver", "[e] emitir"]));
    /** As far back as it goes: its first line, and nothing more above. */
    const top = lines(screen(2), small);
    expect(top).toEqual(expect.arrayContaining(["renglón 1", "[v] volver", "[e] emitir"]));
    expect(top).not.toContain("renglón 12");
    expect(top.some(line => line.startsWith("↑"))).toBe(false);
    expect(lines(screen(9), small)).toEqual(top);
  });

  it("is read back with the key that goes up from the first option, and any way down returns", async () => {
    const { router, press } = open();
    await press(",a");
    const read = (): number | undefined => {
      const { body } = router.screen({ rows: 20 });
      return body.kind === "thread" ? body.read : undefined;
    };
    router.send({ kind: "up" });
    router.send({ kind: "up" });
    expect(read()).toBe(2);
    router.send({ kind: "down" });
    expect(read()).toBeUndefined();
  });
});
