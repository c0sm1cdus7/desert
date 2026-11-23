// Every route to an existing thing survives its departure from the recent list.
import { afterEach, describe, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { windowShop } from "../../../tests/support/window-shop.ts";
import { begin, start } from "./screen.ts";
import { resolve } from "../router/resolve.ts";
import { stacksOf } from "../menus/lists.ts";
import { must } from "./window.ts";

const seats: ReturnType<typeof windowShop>[] = [];
const seat = (count = 41, recent = 40, needs = 1) => {
  const next = windowShop(count, recent, needs);
  seats.push(next);
  return next;
};
afterEach(() => seats.splice(0).forEach(each => each.close()));
const old = { kind: "view", tool: "sales", target: "sales/s1", at: 0 } as const;
const bar = { language: "es", state: "connected", clock: "00:00", now: 1 } as const;
const room = { rows: 36 };

describe("things outside the recent window", () => {
  it.each([
    [40, 40, 1],
    [41, 40, 1],
    [41, 41, 1],
    [41, 40, 0],
  ])("opens the Menu with %i things, %i recent rows and %i notices", (count, recent, needs) => {
    const hands = seat(count, recent, needs);
    expect(hands.screen().title).toBe("Menú");
    if (needs) expect(JSON.stringify(hands.screen())).toContain('"title":"s1"');
  });
  it("opens Attention on the old thing", () => {
    const hands = seat();
    hands.router.send({ kind: "confirm" });
    expect(hands.screen().title).toBe("s1");
  });
  it("keeps Activity and opens its old destination", () => {
    const hands = seat(41, 40, 0);
    hands.rig.bus.emit(
      effect(
        "tool-entry",
        {
          tool: "sales",
          target: "sales/s1",
          author: "beto",
          text: "Revisada",
          attention: false,
        },
        "beto",
      ),
    );
    expect(JSON.stringify(hands.screen())).toContain("Revisada");
    hands.router.send({ kind: "confirm" });
    expect(hands.screen().title).toBe("s1");
  });
  it("follows a reference owned by another tool", () => {
    const hands = seat(41, 40, 0);
    const rows = stacksOf({ kind: "view", tool: "payments", at: 0 }, hands.tools, "es").flatMap(stack => stack.rows);
    expect(rows.find(row => row.opens === "sales/s1")?.open).toEqual(old);
    hands.type("p1");
    expect(hands.screen().title).toBe("s1");
  });
  it("titles a directly opened thing and its action menu", () => {
    const hands = seat(41, 40, 0);
    expect(resolve([...start, old], hands.tools, bar, room).title).toBe("s1");
    expect(hands.sale.titleOf?.("sales/s1#edit")).toBe("Editar");
    expect(hands.sale.view("sales/s1#edit")[0]?.rows[0]?.on?.target).toBe("sales/s1");
  });
  it("names the thing of an action already in progress", () => {
    const hands = seat(41, 40, 0);
    const action = begin(hands.tools, "sales", "correct", "sales/s1");
    expect(resolve([...start, old, action], hands.tools, bar, room).title).toBe("Corregir · s1");
  });
  it("finds an old thing by its words and opens it", () => {
    const hands = seat(41, 40, 0);
    expect(hands.sale.find?.("s1").some(row => row.opens === "sales/s1")).toBe(true);
    hands.type(" antigua");
    hands.router.send({ kind: "confirm" });
    expect(hands.screen().title).toBe("s1");
  });
  it("reads a chosen old reference as its name", () => {
    const hands = seat(41, 40, 0);
    hands.type("pc");
    const pick = must(hands.tools.find(tool => tool.id === "payments")?.acts.pay?.next([]));
    expect(pick.kind).toBe("pick");
    if (pick.kind !== "pick") throw new Error("expected a picker");
    expect(pick.valid?.("sales/s1")).toBe(true);
    expect(pick.shown("sales/s1")).toBe("s1");
  });
  it("names the answer of a nested action that picks an old thing", async () => {
    const hands = seat(41, 40, 0);
    hands.type("pce");
    expect(hands.screen().title).toBe("Elegir");
    hands.type(" antigua");
    hands.router.send({ kind: "confirm" });
    await hands.router.idle();
    expect(hands.rig.state().entries.some(entry => entry.data.text === "Elegida · s1")).toBe(true);
    expect(JSON.stringify(hands.screen())).toContain("s1");
    expect(JSON.stringify(hands.screen())).not.toContain("E-BASE-1");
    hands.router.send({ kind: "cancel" });
    expect(JSON.stringify(hands.screen())).not.toContain("E-BASE-1");
  });
  it("returns to the old object after changing it", async () => {
    const hands = seat(40);
    hands.router.send({ kind: "confirm" });
    hands.type("ec");
    for (let i = 0; i < 4; i++) hands.router.send({ kind: "erase" });
    hands.type("2000");
    hands.router.send({ kind: "confirm" });
    hands.router.send({ kind: "confirm" });
    await hands.router.idle();
    expect(hands.rig.state().tools.sales.get("s1")?.total).toBe(2000);
    hands.add(41);
    hands.router.send({ kind: "cancel" });
    hands.router.send({ kind: "cancel" });
    expect(hands.screen().title).toBe("s1");
  });
  it("keeps an open object when newer objects push it out", () => {
    const hands = seat(40);
    hands.router.send({ kind: "confirm" });
    expect(hands.screen().title).toBe("s1");
    hands.add(41);
    expect(hands.screen().title).toBe("s1");
  });
  it("lists only recent rows, without invented names for older things", () => {
    const hands = seat();
    const rows = hands.sale.view().flatMap(stack => stack.rows);
    expect(rows).toHaveLength(40);
    expect(rows.some(row => row.opens === "sales/s1")).toBe(false);
    expect(hands.sale.titleOf?.("sales/s1")).toBe("s1");
  });
});
