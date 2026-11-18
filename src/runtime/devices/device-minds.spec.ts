import { expect, it, vi } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { setup } from "../../../tests/support/device-house.ts";
import { effect } from "../../house/facts.ts";
import { defineMessage } from "../../fields/messages.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { answerSchema, validateAnswer } from "../../tools/minds/mind-answer.ts";
import type { MindDefinition, MindScope, TurnContext } from "../../tools/minds/mind-contract.ts";
import type { MindRuntimeHouse, MindRuntimeOptions } from "../minds/mind-runtime-options.ts";
import { runtimeView } from "../minds/mind-runtime-view.ts";
import { runtimeActions } from "../minds/mind-runtime-actions.ts";

it("preserves the journey's device choice in its menu, review and unknown result", async () => {
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
    texts: { es: "Usá tus acciones." },
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
  const dispatch = vi.fn(() => Promise.resolve({ status: "inconclusive" as const, reason: "Resultado desconocido" }));
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
  const switches = { asistentes: false, programas: ["agents"] };
  const menu = () => runtimeView(house, options, switches, scope, definition).menu;
  expect(menu().find(item => item.act === "run")?.destinations).toEqual([
    { kind: "device", device: "mac" },
    { kind: "device", device: "vm" },
  ]);
  const proposal = {
    act: "run",
    target: "agents",
    input: { command: "test" },
    destination: { kind: "device" as const, device: "vm" },
  };
  const answer = { scene: "Probando", consulta: null, acts: [proposal] };
  expect(Value.Check(answerSchema(menu()), answer)).toBe(true);
  expect(validateAnswer(answer, { menu: menu(), scope, active: true, consulted: false, allowed: () => true }).ok).toBe(
    true,
  );
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
  expect(await runtimeActions(house, options, switches)(proposal, { turn, review: { review } })).toMatchObject({
    status: "inconclusive",
  });
  expect(review.mock.calls[0]?.[0].acts[0]?.destination).toEqual({ kind: "device", device: "vm" });
  expect(dispatch.mock.calls).toHaveLength(1);
  expect(transport).not.toHaveBeenCalled();
  mac.connection.disconnect();
  expect(menu().find(item => item.act === "run")?.destinations).toEqual([{ kind: "device", device: "vm" }]);
});
