// Looking for things on the terminal: what a person reads from the moment space is pressed on a menu.
import { afterEach, describe, expect, it } from "vitest";
import { houseRouter } from "../../surface/bridge/house-router.ts";
import type { Router } from "../../surface/router.ts";
import { textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";

const now = 5_000;
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

describe("the terminal, looking for things", () => {
  it("looks for things from a menu: space starts, what is typed narrows, enter opens, escape closes", async () => {
    const { rig, press } = open();
    rig.attend("ana", "sales");
    for (const [sale, total] of [
      ["café molido", 10],
      ["Cafe en grano", 20],
      ["té", 30],
    ] as const)
      rig.act("ana", "register", { sale, total }, "sales", rig.state().through);
    expect((await press("v")).at(-1)).toContain("espacio buscar");
    const started = await press(" ");
    expect(started).toEqual(expect.arrayContaining(["Buscar", "›", "Encontrados", "Escribí para buscar."]));
    expect(started.some(line => line.includes("Registrar"))).toBe(false);
    expect(started.at(-1)).toContain("esc cerrar");
    const narrowed = await press("CAFÉ");
    expect(narrowed).toEqual(expect.arrayContaining(["› CAFÉ", "café molido | $ 10", "Cafe en grano | $ 20"]));
    expect(narrowed.some(line => line.includes("té |"))).toBe(false);
    expect(await press(" x")).toContain("Nada coincide.");
    expect(await press("\x7f\x7f grano")).toEqual(expect.arrayContaining(["› CAFÉ grano", "Cafe en grano | $ 20"]));
    expect((await press("\r"))[0]).toContain("Cafe en grano");
    const closed = await press(escape);
    expect(closed).toEqual(expect.arrayContaining(["Registradas", "Acciones"]));
    expect(closed.some(line => line === "Buscar")).toBe(false);
    expect((await press(` té${escape}`)).some(line => line === "Buscar")).toBe(false);
  });

  it("looks into every tool a person holds from the Menu, each under its name", async () => {
    const { rig, press } = open();
    rig.attend("ana", "sales");
    rig.act("ana", "register", { sale: "s1", total: 10 }, "sales", rig.state().through);
    const found = await press(" s1");
    expect(found).toEqual(expect.arrayContaining(["Buscar", "› s1", "Ventas", "s1 | $ 10"]));
    expect(found.some(line => line.includes("pagos"))).toBe(false);
    expect((await press("\r"))[0]).toContain("s1");
    expect((await press(escape))[0]).toContain("Menú");
  });
});
