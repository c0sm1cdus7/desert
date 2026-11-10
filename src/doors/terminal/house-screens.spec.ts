// A product's house walked by keys on the terminal: every screen comes from its tools, through the bridge.
import { afterEach, describe, expect, it } from "vitest";
import { identityView } from "../../house/house.ts";
import { houseTools } from "../../surface/bridge/house-tools.ts";
import type { Tool } from "../../surface/contract.ts";
import { resolve } from "../../surface/resolve.ts";
import { actOf, start, type Session } from "../../surface/screen.ts";
import { finished, step } from "../../surface/step.ts";
import { textOf } from "./cells.ts";
import { keysOf } from "./input.ts";
import { contentRows, paint } from "./paint.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopRegistry, shopWords } from "../../../tests/support/shop.ts";

const bar = { state: "connected", clock: "14:32", now: 5_000 } as const;
const size = { cols: 106, rows: 30 };
const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (me = "ana") => {
  const rig = shopRig({ grants: { ana: ["sales", "payments"], beto: ["sales"] } });
  rigs.push(rig);
  const tools = houseTools(
    {
      me,
      limits: { recentLines: 20 },
      registry: shopRegistry,
      state: () => identityView(rig.state(), me),
      act: (value, through) => rig.tools().act(value, through, me),
      now: () => bar.now,
    },
    shopWords,
  );
  return { rig, tools };
};
/** What a person reads: each painted line, trimmed, with its columns joined by a bar. */
const shown = (session: Session, tools: readonly Tool[]): readonly string[] =>
  textOf(paint(resolve(session, tools, bar, { rows: contentRows(size.rows) }), size))
    .map(line => line.trim().replace(/ {2,}/gu, " | "))
    .filter(Boolean);
async function press(session: Session, keys: string, tools: readonly Tool[]): Promise<Session> {
  let now = session;
  for (const key of keysOf(keys)) {
    const stepped = step(now, key, tools, bar.now);
    now = stepped.session;
    if (stepped.run)
      now = finished(now, stepped.run, await actOf(tools, stepped.run).run(stepped.run.answers), "14:33");
  }
  return now;
}
const escape = "\x1b";

describe("the terminal, on a product's house", () => {
  it("shows on the Menu only the tools this identity holds", () => {
    expect(shown(start, open("ana").tools)).toEqual(expect.arrayContaining(["[v] ventas | 0", "[p] pagos | 0"]));
    const beto = shown(start, open("beto").tools);
    expect(beto).toContain("[v] ventas | 0");
    expect(beto.some(line => line.includes("pagos"))).toBe(false);
  });

  it("registers a sale by keys and then lists it, opens it and counts it on the Menu", async () => {
    const { rig, tools } = open();
    const list = await press(start, "\r", tools);
    expect(shown(list, tools)).toEqual(expect.arrayContaining(["Registradas", "Sin ventas.", "Acciones", "Registrar"]));
    const asking = await press(list, "\r", tools);
    expect(shown(asking, tools)[0]).toContain("Registrar");
    expect(shown(asking, tools)).toContain("Venta");
    const wrong = await press(asking, "s1\rabc\r", tools);
    expect(shown(wrong, tools).some(line => line.includes("abc"))).toBe(true);
    expect(rig.state().tools.sales.size).toBe(0);
    const done = await press(wrong, "\x7f\x7f\x7f1500\r", tools);
    expect(shown(done, tools)).toEqual(expect.arrayContaining(["Venta s1", "Total 1500", "Listo Sale s1 · 14:33"]));
    expect(rig.state().tools.sales.get("s1")).toEqual({ total: 1500, paid: 0, by: "ana" });
    const listed = await press(done, escape, tools);
    expect(shown(listed, tools)).toContain("s1 | $ 1500");
    const sale = await press(listed, "\r", tools);
    expect(shown(sale, tools)[0]).toContain("s1");
    expect(shown(sale, tools)).toEqual(
      expect.arrayContaining(["Datos", "Total | $ 1500", "Cobrado | $ 0", "Registró | ana"]),
    );
    const menu = await press(sale, `${escape}${escape}`, tools);
    expect(shown(menu, tools)).toContain("[v] ventas | 1");
  });

  it("says a tool requires attention when someone else wrote in it, until it is opened", async () => {
    const { rig, tools } = open();
    rig.attend("beto", "sales");
    rig.act("beto", "register", { sale: "s7", total: 70 }, "sales");
    expect(shown(start, tools).some(line => line.includes("Requiere atención"))).toBe(true);
    const opened = await press(start, "\r", tools);
    expect(shown(opened, tools)).toContain("s7 | $ 70");
    const back = await press(opened, escape, tools);
    expect(shown(back, tools).some(line => line.includes("Requiere atención"))).toBe(false);
  });
});
