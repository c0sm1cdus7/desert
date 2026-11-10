// A program's house walked by keys on the terminal, through the same router every renderer uses.
import { afterEach, describe, expect, it } from "vitest";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import type { Router } from "../../surface/router.ts";
import { textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopWords } from "../../../tests/support/shop.ts";

const now = 5_000;
const clock = new Date(now).toTimeString().slice(0, 5);
const size = { cols: 106, rows: 30 };
const closing: { close?(): void; stop?(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => (open.stop ?? open.close)?.()));
/** What a person reads: each painted line, trimmed, with its columns joined by a bar. */
const shown = (router: Router): readonly string[] =>
  textOf(paint(router.screen({ rows: contentRows(size.rows) }), size))
    .map(line => line.trim().replace(/ {2,}/gu, " | "))
    .filter(Boolean);
const open = (me = "ana") => {
  const rig = shopRig({ grants: { ana: ["sales", "payments"], beto: ["sales"] } });
  const router = houseRouter(
    rig.ports(me, () => now),
    shopWords,
  );
  closing.push(router, rig);
  const press = async (keys: string): Promise<readonly string[]> => {
    for (const key of keysOf(keys)) router.send(key);
    await router.idle();
    return shown(router);
  };
  return { rig, router, press };
};
const escape = "\x1b";

describe("the terminal, on a program's house", () => {
  it("shows on the Menu only the tools this identity holds", () => {
    expect(shown(open("ana").router)).toEqual(expect.arrayContaining(["[v] ventas | 0", "[p] pagos | 0"]));
    const beto = shown(open("beto").router);
    expect(beto).toContain("[v] ventas | 0");
    expect(beto.some(line => line.includes("pagos"))).toBe(false);
    expect(beto[0]).toContain(clock);
  });

  it("registers a sale by keys and then lists it, opens it and counts it on the Menu", async () => {
    const { rig, press } = open();
    expect(await press("\r")).toEqual(expect.arrayContaining(["Registradas", "Sin ventas.", "Acciones", "Registrar"]));
    const asking = await press("\r");
    expect(asking[0]).toContain("Registrar");
    expect(asking).toContain("Venta");
    expect((await press("s1\rabc\r")).some(line => line.includes("abc"))).toBe(true);
    expect(rig.state().tools.sales.size).toBe(0);
    const done = await press("\x7f\x7f\x7f1500\r");
    expect(done).toEqual(expect.arrayContaining(["Venta s1", "Total 1500", `Listo Sale s1 · ${clock}`]));
    expect(rig.state().tools.sales.get("s1")).toEqual({ total: 1500, paid: 0, by: "ana" });
    expect(await press(escape)).toContain("s1 | $ 1500");
    const sale = await press("\r");
    expect(sale[0]).toContain("s1");
    expect(sale).toEqual(expect.arrayContaining(["Datos", "Total | $ 1500", "Cobrado | $ 0", "Registró | ana"]));
    expect(await press(`${escape}${escape}`)).toContain("[v] ventas | 1");
  });

  it("says a tool requires attention when someone else wrote in it, until it is opened", async () => {
    const { rig, router, press } = open();
    rig.attend("beto", "sales");
    rig.act("beto", "register", { sale: "s7", total: 70 }, "sales");
    expect(shown(router).some(line => line.includes("Requiere atención"))).toBe(true);
    expect(await press("\r")).toContain("s7 | $ 70");
    expect((await press(escape)).some(line => line.includes("Requiere atención"))).toBe(false);
  });

  it("leaves when the person asks to, and not before", () => {
    const { router } = open();
    expect(keysOf("\r").every(key => router.send(key))).toBe(true);
    expect(keysOf("\x03").every(key => router.send(key))).toBe(false);
  });
});
