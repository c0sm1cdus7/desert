// Each tool keeps its own part of the state, moved by the program's facts; the house keeps only what is its own.
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { identityView } from "../house/house.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import type { Slices, State } from "./tool-contract.ts";
import { emptyHouseState, startState, toolsStep } from "./tools.ts";
import { runner, shopRig } from "../../tests/support/shop-rig.ts";
import { shopSlices, type Sales, type Shop, type ShopEvent } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (...args: Parameters<typeof shopRig>) => {
  const rig = shopRig(...args);
  rigs.push(rig);
  return rig;
};
const trade = (rig: ReturnType<typeof shopRig>) => {
  for (const target of ["sales", "payments"]) rig.attend("ana", target);
  rig.act("ana", "register", { sale: "s1", total: 1500 }, "sales");
  rig.act("ana", "receive", { payment: "p1", amount: 1500, sale: "s1" }, "payments");
  rig.act("ana", "receive", { payment: "p2", amount: 100 }, "payments");
};

describe("what each tool keeps", () => {
  it("moves with the program's facts, one tool reading another's part as it was before the fact", () => {
    const rig = open();
    trade(rig);
    expect(rig.state().tools.sales).toEqual(new Map([["s1", { total: 1500, paid: 1500, by: "ana" }]]));
    expect(rig.state().tools.payments).toEqual({ received: 1600, unmatched: ["p2"] });
    expect(
      rig
        .tools()
        .state()
        .entries.map(entry => entry.data.text),
    ).toEqual(["Registrada · s1", "Recibido · p1", "Unmatched p2", "Recibido · p2"]);
  });

  it("writes a program's facts as caused by the act that made them", () => {
    const rig = open();
    trade(rig);
    const act = rig.facts().find(event => event.kind === "act" && event.data.option === "register");
    const fact = rig.facts().find(event => event.kind === "sale-registered");
    expect(fact).toMatchObject({ layer: "program", by: "ana", cause: [act?.id], data: { sale: "s1", total: 1500 } });
  });

  it("lets a tool call for attention over a fact of its own, even from whoever caused it", () => {
    const rig = open();
    trade(rig);
    const called = rig.facts().filter(event => event.kind === "stimulus" && event.data.tool === "payments");
    expect(called.map(event => event.by)).toEqual(["beto", "ana", "beto", "beto"]);
    expect(identityView(rig.state(), "beto").attention.has("payments")).toBe(true);
    expect(identityView(rig.state(), "ana").attention.has("payments")).toBe(false);
  });

  it("is the same after a restart and after folding the whole journal again", () => {
    const rig = open();
    trade(rig);
    const before = rig.state();
    rig.restart();
    expect(rig.state()).toEqual(before);
    const replayed = rig.journal.replay<State<Shop>>(startState<Shop>(shopSlices, runner), (state, event) =>
      toolsStep<Shop>(state, event, shopSlices),
    );
    expect(replayed).toEqual(before);
    expect(before.acts.size).toBe(0);
    expect(before.through).toBe(rig.facts().length);
  });

  it("leaves the house's own state without any tool's part", () => {
    expect(Object.keys(emptyHouseState).sort()).toEqual(
      [
        ...["acts", "attendance", "attends", "attention", "attentionBy", "looked"],
        ...["by", "entries", "house", "processing", "through"],
      ].sort(),
    );
    expect(Object.keys(startState<Shop>(shopSlices, "ana").tools)).toEqual(["sales", "payments"]);
  });

  it("does not compile a program whose tool has no step of its own", () => {
    type Halved = { initial: Shop["tools"]; step: { sales: (kept: Sales, event: ShopEvent) => Sales } };
    expectTypeOf<Halved>().not.toExtend<Slices<Shop>>();
    expectTypeOf(shopSlices).toExtend<Slices<Shop>>();
  });
});

describe("whole tools are the only unit of assignment", () => {
  it("refuses a tool that is not the identity's, an unknown act, and acting without the target in view", () => {
    const rig = open({ grants: { ana: ["sales", "payments"], beto: ["sales"] } });
    expect(rig.attend("beto", "payments")).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
    const receive = rig.act("beto", "receive", { payment: "p1", amount: 1 }, "payments");
    expect(receive).toMatchObject({ status: "rejected", reason: toolTexts.unassigned });
    expect(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales").reason).toBe(toolTexts.unattended);
    rig.attend("ana", "sales");
    expect(rig.act("ana", "refund", {}, "sales").reason).toBe(toolTexts.unknown);
    expect(rig.act("ana", "register", { sale: "", total: 1 }, "sales").reason).toBe(toolTexts.invalid);
    expect(rig.act("carla", "attend", { target: "sales" }).reason).toBe(toolTexts.unassigned);
    expect(rig.state().tools.sales.size).toBe(0);
    expect(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales").status).toBe("accepted");
    expect(rig.act("ana", "register", { sale: "s1", total: 1 }, "sales").reason).toBe("repeated");
  });

  it("writes every act and its result, also the refused ones", () => {
    const rig = open({ grants: { ana: ["sales"], beto: [] } });
    rig.act("beto", "register", { sale: "s1", total: 1 }, "sales");
    const [act, result] = rig.facts().slice(-2);
    expect(act).toMatchObject({ kind: "act", by: "beto", data: { object: "sales", option: "register" } });
    expect(result).toMatchObject({ kind: "act-result", cause: [act?.id], data: { status: "rejected" } });
  });
});
