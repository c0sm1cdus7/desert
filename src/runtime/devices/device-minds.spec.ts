import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { setup } from "../../../tests/support/device-house.ts";
import { effect } from "../../house/facts.ts";
import { defineMessage } from "../../fields/messages.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { answerSchema, validateAnswer, type ProposedAct } from "../../tools/minds/mind-answer.ts";
import type { MindDefinition, MindScope, TurnContext } from "../../tools/minds/mind-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "../minds/mind-runtime-options.ts";
import { runtimeView } from "../minds/mind-runtime-view.ts";
import { runtimeActions } from "../minds/mind-runtime-actions.ts";

type Dispatch = NonNullable<MindRuntimeHouse<Program>["execution"]["devices"]>;
/** A journey of the agents mind whose kit runs on two devices, acting through the given device dispatch. */
function journeyRig(dispatch: Dispatch) {
  const rig = setup({ at: "device", tool: "shell", version: "1" });
  const mac = rig.device("mac");
  rig.device("vm");
  const kit = { version: 2 as const, selections: [{ kind: "program" as const, program: "agents" }] };
  rig.house.bus.emit(effect("kit-set", { version: 2, holder: "mind:agents", kit }, "ana"));
  rig.house.bus.emit(effect("journey-opened", { version: 2, goal: "Probar", kit }, "mind:agents", [], "journey"));
  rig.house.bus.emit(effect("mind-turn-opened", { turn: "turn", wake: [] }, "mind:agents", [], "journey"));
  const scope: MindScope = {
    kind: "journey",
    actor: "mind:agents",
    process: "journey",
    kit: [{ tool: "agents", acts: ["run"] }],
  };
  const rules = defineMessage({
    id: "device-test.rules",
    kind: "mind",
    parameters: Type.Object({}),
    texts: { en: "Use your actions.", es: "Usá tus acciones." },
  });
  const definition: MindDefinition = { actor: "mind:agents", role: "program:agents", rules, communication: [] };
  const transport = vi.fn<typeof fetch>(() => {
    throw new Error("No transport expected");
  });
  const options: MindRuntimeOptions = {
    language: "es",
    definitions: [definition],
    catalog: [],
    providers: [],
    fingerprint: () => ({ cases: "1", skill: "1", frameTexts: "1" }),
    key: () => Promise.resolve(undefined),
    transport,
    account: "test",
    capNanoUsd: 0,
    maxInputTokens: 1000,
    message: () => undefined,
    textRules: [],
    rulesVersion: () => "1",
  };
  const house: MindRuntimeHouse<Program> = {
    home: rig.house.home,
    active: () => true,
    time: { now: () => 1000, wait: () => () => {} },
    failed: error => {
      throw error;
    },
    history: () =>
      rig.house.journal.replay<import("../../journal/vocabulary.ts").Event[]>([], (all, event) => [...all, event]),
    execution: {
      bus: rig.house.bus,
      registry: rig.house.registry,
      state: rig.house.tools.state,
      own: () => [],
      process: () => true,
      live: () => true,
      now: () => 1000,
      secrets: { capture: () => {}, scrub: value => value },
      devices: dispatch,
    },
  };
  const switches = { assistants: false, programs: ["agents"] };
  const menu = () => runtimeView(house, options, switches, scope, definition).menu;
  const turn: TurnContext = {
    id: "turn",
    scope,
    language: "es",
    wake: [],
    through: 0,
    limits: { calls: 12, corrections: 1, consultations: 1 },
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const review = vi.fn<import("../../tools/minds/mind-review.ts").ReviewPort["review"]>(request => ({
    proposal: request.id,
    through: request.through,
    rulesVersion: "1",
    outcome: "passed",
    text: "Permitido",
  }));
  const act = (proposal: ProposedAct) =>
    runtimeActions(house, options, switches)(proposal, { turn, review: { review } });
  return { mac, scope, menu, act, review, transport };
}
const proposal = {
  act: "run",
  target: "agents",
  input: { command: "test" },
  destination: { kind: "device" as const, device: "vm" },
};
it("preserves the journey's device choice in its menu and unknown result; the act waits for no review", async () => {
  const dispatch = vi.fn(() => Promise.resolve({ status: "inconclusive" as const, reason: "Resultado desconocido" }));
  const { mac, scope, menu, act, review, transport } = journeyRig(dispatch);
  expect(menu().find(item => item.act === "run")?.destinations).toEqual([
    { kind: "device", device: "mac" },
    { kind: "device", device: "vm" },
  ]);
  const answer = { scene: "Probando", consultation: null, acts: [proposal] };
  expect(Value.Check(answerSchema(menu()), answer)).toBe(true);
  expect(validateAnswer(answer, { menu: menu(), scope, active: true, consulted: false, allowed: () => true }).ok).toBe(
    true,
  );
  expect(await act(proposal)).toMatchObject({
    status: "inconclusive",
  });
  // A device act leaves the house, and nothing waits for the supervisor for that alone (21/11).
  expect(review).not.toHaveBeenCalled();
  expect(dispatch.mock.calls).toHaveLength(1);
  expect(transport).not.toHaveBeenCalled();
  mac.connection.disconnect();
  expect(menu().find(item => item.act === "run")?.destinations).toEqual([{ kind: "device", device: "vm" }]);
});
it("hands a journey the receipt of a device act, whether the device accepted or rejected it", async () => {
  const receipt = { exit: 1, out: "RECIBO" };
  const rejected = vi.fn(() => Promise.resolve({ status: "rejected" as const, reason: "exit 1", value: receipt }));
  expect(await journeyRig(rejected).act(proposal)).toMatchObject({
    status: "rejected",
    reason: "exit 1",
    value: receipt,
  });
  const accepted = vi.fn(() => Promise.resolve({ status: "accepted" as const, effects: [], value: receipt }));
  expect(await journeyRig(accepted).act(proposal)).toMatchObject({ status: "accepted", value: receipt });
});
