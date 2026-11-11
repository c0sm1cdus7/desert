// An answer that picks a thing of another tool, and an act of one tool taken from the thing of another.
import { afterEach, describe, expect, it } from "vitest";
import { walkedChecks } from "./promised-walk.ts";
import { promisedChecks } from "./promised.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import { stacksOf } from "../surface/lists.ts";
import { startRouter } from "../surface/router.ts";
import type { Screen } from "../surface/contract.ts";
import { chargingRegistry, chargingShop } from "../../tests/support/charging-shop.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopShown } from "../../tests/support/shop.ts";

const closing: { close?(): void; stop?(): void }[] = [];
afterEach(() => closing.splice(0).forEach(open => (open.stop ?? open.close)?.()));
/** A shop where ana holds both tools and beto only the sales; two sales registered by ana. */
const seat = (me: string) => {
  const rig = shopRig({ registry: chargingRegistry, grants: { ana: ["sales", "payments"], beto: ["sales"] } });
  rig.attend("ana", "sales");
  for (const [sale, total] of [
    ["s1", 1500],
    ["s2", 90],
  ] as const)
    rig.act("ana", "register", { sale, total }, "sales", rig.state().through);
  const tools = houseTools(rig.ports(me), shopShown);
  const bar = { state: "connected", clock: "00:00", now: 0 } as const;
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
    for (const char of Array.from(keys))
      router.send(char === "\r" ? { kind: "confirm" } : { kind: "type", text: char });
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

  it("asks which thing by looking for it: what is typed narrows, and enter takes the chosen one", async () => {
    const { rig, router, press } = seat("ana");
    expect(press("pc")).toEqual(["Cobrar", "Venta", "› ", "s1 | $ 1500", "s2 | $ 90"]);
    expect(press("2")).toEqual(["Cobrar", "Venta", "› 2", "s2 | $ 90"]);
    expect(press("\r")).toEqual(["Cobrar", "Venta s2", "Monto"]);
    press("90\r\r");
    await router.idle();
    expect(rig.state().tools.payments.received).toBe(90);
  });

  it("offers on a thing what another tool does with it, starting with what the thing already says", async () => {
    const { rig, tools, router, press } = seat("ana");
    expect(actionsOn(tools, "sales/s1")).toEqual([["c", "cobrar", undefined, false]]);
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
    expect(actionsOn(tools, "sales/s1")).toEqual([["c", "cobrar", "No está entre tus herramientas.", true]]);
    rig.act("beto", "prefer", { hide: "foreign", on: true });
    expect(actionsOn(tools, "sales/s1")).toEqual([]);
  });
});
