// Each tool keeps its own part of the state, moved by the program's facts; the house keeps only what is its own.
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";
import { effect } from "../house/facts.ts";
import { identityView } from "../house/members.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import type { Slices, State } from "./tool-contract.ts";
import { emptyHouseState, startState, toolsStep } from "../house/state.ts";
import { runner, shopRig } from "../../tests/support/shop-rig.ts";
import { shopSlices, type Sales, type Shop, type ShopEvent } from "../../tests/support/shop.ts";

const rigs: ReturnType<typeof shopRig>[] = [];
afterEach(() => rigs.splice(0).forEach(rig => rig.close()));
const open = (...args: Parameters<typeof shopRig>) => {
  const rig = shopRig(...args);
  rigs.push(rig);
  return rig;
};
const trade = async (rig: ReturnType<typeof shopRig>) => {
  rig.bus.emit(effect("kit-set", { holder: "mind:payments", tool: "payments", acts: ["notice"] }, "ana"));
  for (const target of ["sales", "payments"]) rig.attend("ana", target);
  rig.act("ana", "register", { sale: "s1", total: 1500 }, "sales");
  rig.act("ana", "receive", { payment: "p1", amount: 1500, sale: "s1" }, "payments");
  rig.act("ana", "receive", { payment: "p2", amount: 100 }, "payments");
  await rig.tools().recoverReactions();
};

describe("what each tool keeps", () => {
  it("moves with the program's facts, one tool reading another's part as it was before the fact", async () => {
    const rig = open();
    await trade(rig);
    expect(rig.state().tools.sales).toEqual(new Map([["s1", { total: 1500, paid: 1500, by: "ana" }]]));
    expect(rig.state().tools.payments).toEqual({ received: 1600, unmatched: ["p2"] });
    expect(
      rig
        .tools()
        .state()
        .entries.filter(entry => !entry.data.silent)
        .map(entry => entry.data.text),
    ).toEqual(["Registrada · s1", "Recibido · p1", "Recibido · p2", "Avisado · Pago sin venta · p2"]);
  });

  it("writes a program's facts as caused by the act that made them", async () => {
    const rig = open();
    await trade(rig);
    const act = rig.facts().find(event => event.kind === "act" && event.data.option === "register");
    const fact = rig.facts().find(event => event.kind === "sale-registered");
    expect(fact).toMatchObject({ layer: "program", by: "ana", cause: [act?.id], data: { sale: "s1", total: 1500 } });
  });

  it("lets a tool call for attention over a fact of its own, even from whoever caused it", async () => {
    const rig = open();
    await trade(rig);
    const called = rig.facts().filter(event => event.kind === "stimulus" && event.data.tool === "payments");
    expect(called.map(event => event.by)).toEqual(["beto", "beto", "ana", "beto"]);
    expect(identityView(rig.state(), "beto").attention.has("payments")).toBe(true);
    expect(identityView(rig.state(), "ana").attention.has("payments")).toBe(false);
  });

  it("is the same after a restart and after folding the whole journal again", async () => {
    const rig = open();
    await trade(rig);
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
        ...["by", "entries", "house", "processing", "through", "wakeOwners"],
      ].sort(),
    );
    expect(emptyHouseState.wakeOwners).toEqual(new Map());
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
    expect(rig.attend("beto", "payments")).toMatchObject({ status: "accepted" });
    const receive = rig.act("beto", "receive", { payment: "p1", amount: 1 }, "payments");
    expect(receive).toMatchObject({ status: "rejected", reason: { en: "outside the kit", es: "fuera del kit" } });
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
