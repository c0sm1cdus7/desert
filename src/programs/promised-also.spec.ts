// An answer that picks a thing of another tool, and an act of one tool taken from the thing of another.
import { afterEach, describe, expect, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks } from "./promised.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import { stacksOf } from "../surface/lists.ts";
import { startRouter } from "../surface/router.ts";
import type { Intent, Screen } from "../surface/contract.ts";
import { chargingRegistry, chargingShop, makingRegistry, narrowRegistry } from "../../tests/support/charging-shop.ts";
import { narrowShop } from "../../tests/support/charging-shop.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopShown } from "../../tests/support/shop.ts";

const closing: { close?(): void; stop?(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => (open.stop ?? open.close)?.()));
const bar = { state: "connected", clock: "00:00", now: 0 } as const;
const named: Readonly<Record<string, Intent>> = { "\r": { kind: "confirm" }, "\x1b": { kind: "cancel" } };
const keyOf = (char: string): Intent => named[char] ?? { kind: "type", text: char };
/** A shop where ana holds both tools and beto only the sales; two sales registered by ana. */
const seat = (me: string, registry = chargingRegistry) => {
  const rig = shopRig({ registry, grants: { ana: ["sales", "payments"], beto: ["sales"] } });
  rig.attend("ana", "sales");
  for (const [sale, total] of [
    ["s1", 1500],
    ["s2", 90],
  ] as const)
    rig.act("ana", "register", { sale, total }, "sales", rig.state().through);
  const tools = houseTools(rig.ports(me), shopShown);
  const router = startRouter({ tools, bar: () => bar });
  closing.push(router, rig);
  const rowsOf = (body: Screen["body"]) => {
    if (body.kind === "thread") return body.options ?? [];
    return body.kind === "list" ? body.stacks.flatMap(stack => stack.rows) : [];
  };
  const read = ({ title, body }: Screen): string[] => {
    const said = body.kind === "thread" ? body.events.map(event => event.text.map(span => span.text).join("")) : [];
    const rows = rowsOf(body).map(row => [row.entry ? `› ${row.entry.typed}` : row.title, row.detail]);
    return [title, ...said, ...rows.map(row => row.filter(Boolean).join(" | "))];
  };
  const press = (keys: string): string[] => {
    for (const char of Array.from(keys)) router.send(keyOf(char));
    return read(router.screen({ rows: 40 }));
  };
  return { rig, tools, router, press };
};
const actionsOn = (tools: ReturnType<typeof seat>["tools"], target: string) =>
  stacksOf({ kind: "view", tool: "sales", target, at: 0 }, tools)
    .flatMap(stack => stack.rows)
    .filter(row => row.starts)
    .map(row => [row.key, row.title, row.detail, row.off === true]);

describe("a program whose acts reach across its tools", () => {
  for (const check of promisedChecks(chargingShop)) it(check.name, check.run);
  for (const check of walkedChecks(chargingShop, shopShown)) it(check.name, check.run);

  it("asks which thing with their list: a number takes its row, and space looks for one by what is typed", async () => {
    const { rig, router, press } = seat("ana");
    expect(press("pc")).toEqual(["Cobrar", "Venta", "s1 | $ 1500", "s2 | $ 90"]);
    expect(press(" ")).toEqual(["Cobrar", "Venta", "› ", "s1 | $ 1500", "s2 | $ 90"]);
    expect(press("2")).toEqual(["Cobrar", "Venta", "› 2", "s2 | $ 90"]);
    expect(press("x")).toEqual(["Cobrar", "Venta", "› 2x", "Sin resultados."]);
    /** Escape closes the search and the whole list is back; the number of a row takes it. */
    expect(press("\x1b")).toEqual(["Cobrar", "Venta", "s1 | $ 1500", "s2 | $ 90"]);
    expect(press("2")).toEqual(["Cobrar", "Venta s2", "Monto"]);
    press("90\r\r");
    await router.idle();
    expect(rig.state().tools.payments.received).toBe(90);
  });

  it("makes a new thing right where one is picked: what it makes is the answer, and the act goes on", async () => {
    const { rig, router, press } = seat("ana", makingRegistry);
    expect(press("pc")).toEqual(["Cobrar", "Venta", "s1 | $ 1500", "s2 | $ 90", "registrar | lo que el almacén vende"]);
    /** While looking for one, making a new one is not among what is found. */
    expect(press(" ")).toEqual(["Cobrar", "Venta", "› ", "s1 | $ 1500", "s2 | $ 90"]);
    press("\x1b");
    expect(press("r")).toEqual(["Registrar", "Venta"]);
    /** Leaving it at its first question goes back to the list, with nothing made. */
    expect(press("\x1b")).toEqual([
      "Cobrar",
      "Venta",
      "s1 | $ 1500",
      "s2 | $ 90",
      "registrar | lo que el almacén vende",
    ]);
    press("rs3\r700\r");
    await router.idle();
    expect(rig.state().tools.sales.has("s3")).toBe(true);
    expect(press("\x1b")).toEqual(["Cobrar", "Venta s3", "Monto"]);
    press("700\r\r");
    await router.idle();
    expect(rig.state().tools.payments.received).toBe(700);
  });

  it("says at the question why what was answered cannot go on, and goes on once it can", () => {
    const { router, press } = seat("ana");
    press("pc1");
    expect(press("9500\r")).toEqual(["Cobrar", "Venta s1", "Monto", "Error monto de más"]);
    for (let erased = 0; erased < 4; erased++) router.send({ kind: "erase" });
    expect(press("50\r")).toEqual(["Cobrar", "Venta s1", "Monto $ 0,50", "Propina · opcional"]);
  });

  it("says there is nothing to pick among where its tool has none, and takes nothing but leaving", () => {
    const rig = shopRig({ registry: chargingRegistry });
    const router = startRouter({ tools: houseTools(rig.ports("ana"), shopShown), bar: () => bar });
    closing.push(router, rig);
    for (const text of ["p", "c", " ", "1", "\r"]) router.send(keyOf(text));
    const { title, body, hints } = router.screen({ rows: 40 });
    expect([title, body.kind === "thread" ? body.options : []]).toEqual([
      "Cobrar",
      [{ title: "Sin ventas.", still: true, tone: "t3" }],
    ]);
    expect(hints.map(hint => hint.does)).toEqual(["cancelar"]);
  });

  it("offers on a thing what another tool does with it, starting with what the thing already says", async () => {
    const { rig, tools, router, press } = seat("ana");
    expect(actionsOn(tools, "sales/s1")).toEqual([["c", "cobrar", "un pago de una venta", false]]);
    expect(press("v1c")).toEqual(["Cobrar", "Venta s1", "Monto"]);
    expect(router.screen({ rows: 40 }).body).toMatchObject({ entry: { typed: "$ 15,00" } });
    press("\r\r");
    await router.idle();
    expect(rig.state().tools.sales.get("s1")?.paid).toBe(1500);
    router.send({ kind: "cancel" });
    expect(router.screen({ rows: 40 }).title).toBe("s1");
    expect(actionsOn(tools, "sales/s1")).toEqual([["c", "cobrar", "paid", true]]);
  });

  it("shows it off to who does not hold that other tool, and hides it if they prefer not to see such", () => {
    const { rig, tools } = seat("beto");
    expect(actionsOn(tools, "sales/s1")).toEqual([["c", "cobrar", "sin acceso", true]]);
    rig.act("beto", "prefer", { hide: "foreign", on: true });
    expect(actionsOn(tools, "sales/s1")).toEqual([]);
  });
});

describe("an act that takes only some things of another tool", () => {
  for (const check of promisedChecks(narrowShop)) it(check.name, check.run);
  for (const check of walkedChecks(narrowShop, shopShown)) it(check.name, check.run);

  it("offers only those where one is picked, also to who looks for one, and takes no other for an answer", () => {
    const { press } = seat("ana", narrowRegistry);
    expect(press("pc")).toEqual(["Cobrar", "Venta", "s1 | $ 1500"]);
    expect(press(" s")).toEqual(["Cobrar", "Venta", "› s", "s1 | $ 1500"]);
    expect(press("2")).toEqual(["Cobrar", "Venta", "› s2", "Sin resultados."]);
  });
});
