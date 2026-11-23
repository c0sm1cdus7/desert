import { afterEach, describe, expect, it } from "vitest";
import { moneyRegistry } from "../../../tests/support/money-program.ts";
import { shopRig } from "../../../tests/support/shop-rig.ts";
import { shopShown } from "../../../tests/support/shop.ts";
import { houseTools } from "../bridge/assembly/house-tools.ts";
import { begin, type Session } from "./screen.ts";
import { step } from "../router/step.ts";
import { resolve } from "../router/resolve.ts";
import type { Intent } from "../contract/contract.ts";
import { must } from "./window.ts";

const opened: ReturnType<typeof shopRig>[] = [];
afterEach(() => opened.splice(0).forEach(rig => rig.close()));
function seat() {
  const rig = shopRig({ registry: moneyRegistry });
  opened.push(rig);
  rig.attend("ana", "sales");
  expect(rig.act("ana", "seed", { sale: "dollars", total: 5000 }, "sales")).toMatchObject({ status: "accepted" });
  const tools = houseTools(
    rig.ports("ana", () => 17),
    shopShown,
    "es",
  );
  let session: Session = [];
  const start = (...args: Parameters<typeof begin> extends [unknown, ...infer Rest] ? Rest : never) => {
    session = [begin(tools, ...args)];
  };
  const send = (intent: Intent) => {
    session = step(session, intent, tools, 17, "es").session;
  };
  const body = () =>
    resolve(session, tools, { language: "es", state: "connected", clock: "00:00", now: 17 }, { rows: 30 }).body;
  const text = () => {
    const shown = body();
    return shown.kind === "thread" ? shown.events.flatMap(event => event.text.map(span => span.text)).join("") : "";
  };
  return {
    rig,
    tools,
    start,
    send,
    body,
    text,
    session: () => session,
    resume: (saved: Session) => {
      session = saved;
    },
  };
}

describe("the currency throughout an action", () => {
  it("shows dollars while writing, in the answer and confirmation, and stores cents", async () => {
    const hands = seat();
    hands.start("sales", "register");
    hands.send({ kind: "type", text: "d" });
    expect(hands.body()).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    hands.send({ kind: "type", text: "1005" });
    expect(hands.body()).toMatchObject({ entry: { typed: "US$ 10,05" } });
    hands.send({ kind: "confirm" });
    expect(hands.text()).toContain("Precio US$ 10,05");
    expect(hands.text()).toContain("Precio · US$ 10,05");
    hands.send({ kind: "confirm" });
    const walk = hands.session().at(-1);
    expect(walk).toMatchObject({ phase: "running" });
    if (walk?.kind !== "act") throw new Error("No action");
    await must(hands.tools.find(tool => tool.id === "sales")?.acts.register).run(walk.answers);
    expect(hands.rig.state().tools.sales.get("price")?.total).toBe(1005);
  });
  it("keeps the same numeric limits through the direct action door", () => {
    const hands = seat();
    for (const amount of [-1, 0, 1.5, 10_000_000_000_000]) {
      expect(hands.rig.act("ana", "register", { currency: "USD", amount }, "sales")).toMatchObject({
        status: "rejected",
      });
    }
    expect(hands.rig.state().tools.sales.has("price")).toBe(false);
    expect(hands.rig.act("ana", "register", { currency: "USD", amount: 1005 }, "sales")).toMatchObject({
      status: "accepted",
    });
    expect(hands.rig.state().tools.sales.get("price")?.total).toBe(1005);
  });
  it("resolves the target with state for a credit, and the sale chosen for a payment", () => {
    const hands = seat();
    hands.start("sales", "credit", "sales/dollars");
    expect(hands.body()).toMatchObject({ entry: { placeholder: "US$ 0,00" } });
    hands.send({ kind: "type", text: "250" });
    hands.send({ kind: "confirm" });
    expect(hands.text()).toContain("Nota · US$ 2,50");
    hands.start("payments", "receive");
    hands.send({ kind: "type", text: "1" });
    expect(hands.body()).toMatchObject({ entry: { placeholder: "US$ 0,00" } });
  });
  it("uses the same currency entering through another tool's also row", () => {
    const hands = seat();
    const row = must(hands.tools.find(tool => tool.id === "sales")?.alsoOn?.("sales/dollars")[0]);
    hands.start("payments", "receive", undefined, row.with);
    expect(hands.body()).toMatchObject({ entry: { placeholder: "US$ 0,00" } });
    hands.send({ kind: "paste", text: "250" });
    hands.send({ kind: "confirm" });
    expect(hands.text()).toContain("Cobro US$ 2,50");
    expect(hands.text()).toContain("Cobro · US$ 2,50");
  });
  it("reopens a partial action, restarts the house and keeps its currency and typed cents", () => {
    const hands = seat();
    hands.start("sales", "register");
    hands.send({ kind: "type", text: "d" });
    hands.send({ kind: "type", text: "105" });
    const saved = structuredClone(hands.session());
    hands.start("sales", "register");
    hands.rig.restart();
    hands.resume(saved);
    expect(hands.body()).toMatchObject({ entry: { typed: "US$ 1,05" } });
    hands.send({ kind: "confirm" });
    expect(hands.text()).toContain("Precio · US$ 1,05");
  });
  it("opens empty after changing currency, including an edit with carried data", () => {
    const hands = seat();
    hands.start("sales", "edit", "sales/dollars");
    hands.send({ kind: "confirm" });
    expect(hands.body()).toMatchObject({ entry: { typed: "$ 50,00" } });
    hands.send({ kind: "cancel" });
    hands.send({ kind: "type", text: "d" });
    expect(hands.body()).toMatchObject({ entry: { typed: "", placeholder: "US$ 0,00" } });
    expect(hands.text()).not.toContain("US$ 50,00");
    hands.send({ kind: "type", text: "1005" });
    hands.send({ kind: "confirm" });
    expect(hands.text()).toContain("Precio · US$ 10,05");
    hands.send({ kind: "cancel" });
    expect(hands.body()).toMatchObject({ entry: { typed: "US$ 10,05" } });
    hands.send({ kind: "cancel" });
    hands.send({ kind: "type", text: "p" });
    expect(hands.body()).toMatchObject({ entry: { typed: "", placeholder: "$ 0,00" } });
  });
});
