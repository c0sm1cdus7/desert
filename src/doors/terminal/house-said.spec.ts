// What the terminal says of a key a field does not take, and of the act of another thing that made a thing.
import { afterEach, describe, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { houseRouter } from "../../surface/bridge/assembly/house-router.ts";
import type { Router } from "../../surface/router/router.ts";
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

describe("a key a field does not take", () => {
  it("explains the ignored key, keeps the question and accepts the next key that fits", async () => {
    const { press } = open();
    const before = await press("vrs1\r");
    const ignored = await press("x");
    expect(ignored.filter(line => line === "solo números")).toHaveLength(1);
    expect(ignored.filter(line => line !== "solo números")).toEqual(before);
    const fixed = await press("15");
    expect(fixed.some(line => line.startsWith("Error"))).toBe(false);
    expect(fixed).not.toContain("solo números");
    expect(fixed).toEqual(expect.arrayContaining(["› $ 0,15"]));
  });
});

describe("the record of a thing another thing's act made", () => {
  it("reads in a thing's record the act of another thing that made it, told by its first line", async () => {
    const { rig, router, press } = open();
    await press("vrs1\r1500\r");
    await press(escape);
    const brought = {
      tool: "sales",
      target: "sales",
      author: "beto",
      text: "Traídas · 1\nde otro lado",
      made: ["sales/s1"],
    };
    rig.bus.emit(effect("tool-entry", brought, "beto"));
    /** The unread act appears in Attention and Activity; reading its destination clears both. */
    expect(await press("")).toEqual(
      expect.arrayContaining([
        "Atención",
        "[1] Traídas · 1 | beto",
        "Actividad",
        "[2] Traídas · 1 | beto",
        "[3] s1 | $ 15,00",
      ]),
    );
    /** Its destination is this menu, already rendered: the sale is the first row again. */
    expect(await press("")).toEqual(expect.arrayContaining(["Sin pendientes.", "Sin novedades.", "[1] s1 | $ 15,00"]));
    await press("1");
    const record = router.screen({ rows: 30 }).body;
    const done = record.kind === "list" ? record.stacks.at(-1)?.rows.map(row => row.title) : [];
    expect(done).toEqual(["Traídas · 1", "Registrada · s1"]);
  });
});
