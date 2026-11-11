// A program's house walked by keys on the terminal, through the same router every renderer uses.
import { afterEach, describe, expect, it } from "vitest";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import type { Router } from "../../surface/router.ts";
import { textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";

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
    shopShown,
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
  it("shows on the Menu every tool of the program: the ones this identity does not hold, off, saying why", async () => {
    expect(shown(open("ana").router)).toEqual(expect.arrayContaining(["[v] ventas | 0", "[p] pagos | 0"]));
    const { router, press } = open("beto");
    expect(shown(router)).toEqual(
      expect.arrayContaining(["[v] ventas | 0", "[p] pagos | No está entre tus herramientas."]),
    );
    expect(shown(router)[0]).toContain(clock);
    expect((await press("p"))[0]).toContain("Menú");
    expect((await press("\r"))[0]).toContain("Ventas");
  });

  it("lets each person say what they prefer not to see, from Preferences on the Menu", async () => {
    const { rig, router, press } = open("beto");
    expect(shown(router)).toEqual(expect.arrayContaining(["Sistema", "[,] preferencias"]));
    expect(await press(",")).toEqual(
      expect.arrayContaining([
        "Qué ves",
        "[a] Acciones apagadas | Se muestran",
        "[h] Herramientas ajenas | Se muestran",
      ]),
    );
    const asked = await press("h");
    expect(asked).toEqual(
      expect.arrayContaining(["Las herramientas que no están entre las tuyas.", "[m] Mostrar", "[o] Ocultar"]),
    );
    expect(asked.at(-1)).toContain("enter guardar");
    expect(await press("o")).toContain(`Listo Herramientas ajenas · ocultas · ${clock}`);
    expect(await press(escape)).toContain("[h] Herramientas ajenas | Ocultas");
    await press("h");
    const { body } = router.screen({ rows: contentRows(size.rows) });
    expect(body.kind === "thread" && body.options?.find(option => option.selected)?.title).toBe("Ocultar");
    await press(escape);
    const menu = await press(escape);
    expect(menu.some(line => line.includes("pagos"))).toBe(false);
    expect(menu).toContain("[v] ventas | 0");
    expect(shown(open("ana").router)).toContain("[p] pagos | 0");
    rig.restart();
    expect(rig.state().house.hides.get("beto")).toEqual(["foreign"]);
  });

  it("offers each act with its key and its purpose, and asks it from its declaration", async () => {
    const { rig, press } = open();
    const list = await press("v");
    expect(list).toEqual(expect.arrayContaining(["Registradas", "Sin ventas.", "Acciones"]));
    expect(list).toContain("[r] Registrar | Registra lo que el almacén vende.");
    const asking = await press("r");
    expect(asking[0]).toContain("Registrar");
    expect(asking).toEqual(expect.arrayContaining(["Venta", "› | Nombre de la venta"]));
    const total = await press("s1\r");
    expect(total).toEqual(expect.arrayContaining(["Venta s1", "Total", "› | $ 0,00"]));
    expect(rig.state().tools.sales.size).toBe(0);
  });

  it("takes into a field with a format only the keys that fit it, and shows its shape as it fills", async () => {
    const { rig, press } = open();
    const letters = await press("vrs1\rabc,.-");
    expect(letters).toContain("› | $ 0,00");
    expect((await press("\r")).some(line => line.startsWith("Listo"))).toBe(false);
    expect(await press("15")).toContain("› $ 0,15");
    expect(await press("0000")).toContain("› $ 1.500,00");
    expect(await press("\x7f\x7f")).toContain("› $ 15,00");
    const done = await press("00\r");
    expect(done).toEqual(expect.arrayContaining(["Venta s1", "Total $ 1.500,00", `Listo Sale s1 · ${clock}`]));
    expect(rig.state().tools.sales.get("s1")).toEqual({ total: 150_000, paid: 0, by: "ana" });
    expect(await press(escape)).toContain("[1] s1 | $ 150000");
    const sale = await press("\r");
    expect(sale[0]).toContain("s1");
    expect(sale).toEqual(expect.arrayContaining(["Datos", "Total | $ 150000", "Cobrado | $ 0", "Registró | ana"]));
    expect(await press(`${escape}${escape}`)).toContain("[v] ventas | 1");
  });

  it("says a tool requires attention when someone else wrote in it, until it is opened", async () => {
    const { rig, router, press } = open();
    rig.attend("beto", "sales");
    rig.act("beto", "register", { sale: "s7", total: 70 }, "sales");
    expect(shown(router).some(line => line.includes("Requiere atención"))).toBe(true);
    expect(await press("v")).toContain("[2] s7 | $ 70");
    expect((await press(escape)).some(line => line.includes("Requiere atención"))).toBe(false);
  });

  it("opens every menu with what needs someone to act and what the others did, until each is opened", async () => {
    const { rig, router, press } = open();
    const lists = ["Atención", "Nada pide atención.", "Actividad", "Nada nuevo de los demás."];
    expect(shown(router)).toEqual(expect.arrayContaining(lists));
    rig.attend("beto", "sales");
    rig.act("beto", "register", { sale: "s7", total: 70 }, "sales");
    rig.act("ana", "register", { sale: "s8", total: 80 }, "sales", rig.state().through);
    expect(shown(router)).toEqual(expect.arrayContaining(["Actividad", "[1] Sale s7 | beto"]));
    expect(shown(router).some(line => line.includes("Sale s8"))).toBe(false);
    expect(await press("v")).toEqual(expect.arrayContaining(["Actividad", "[1] Sale s7 | beto", "[2] s7 | $ 70"]));
    expect((await press("1"))[0]).toContain("s7");
    const back = await press(escape);
    expect(back).toEqual(expect.arrayContaining(["Actividad", "Nada nuevo de los demás.", "[1] s7 | $ 70"]));
    expect(shown(open("beto").router)).toEqual(expect.arrayContaining(lists));
  });

  it("leaves when the person asks to, and not before", () => {
    const { router } = open();
    expect(keysOf("\r").every(key => router.send(key))).toBe(true);
    expect(keysOf("\x03").every(key => router.send(key))).toBe(false);
  });
});
