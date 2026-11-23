import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { journeyStep } from "../../house/minds/journey-state.ts";
import { answerSchema, validateAnswer, type MindMenu } from "./mind-answer.ts";
import type { MindScope } from "./mind-contract.ts";
import { journeyMenu, type JourneyMenuState } from "./journey-menu.ts";
const actor = "assistant:beto";
const kit = [
  { tool: "notes", acts: ["write"] },
  { tool: "chat", acts: ["say"] },
];
const menu: MindMenu = [
  { tool: "notes", act: "write", target: "notes", input: Type.Object({ text: Type.String() }), scope: "work" },
  { tool: "notes", act: "delete", target: "notes", input: Type.Object({}), scope: "work" },
  { tool: "chat", act: "say", target: "chat", input: Type.Object({ text: Type.String() }), scope: "communication" },
  { tool: "fake", act: "end", target: actor, input: Type.Object({}), scope: "control" },
];
const scope: MindScope = { kind: "consciousness", actor };
const journey: MindScope = { kind: "journey", actor, process: "j1", kit };
function state(): JourneyMenuState {
  const opened = { ...effect("journey-opened", { goal: "Anotar", kit }, actor, [], "j1"), id: "e1", seq: 1, at: 1000 };
  return {
    journeys: journeyStep(new Map(), opened),
    kit,
    menu,
    communication: [{ tool: "chat", act: "say" }],
    active: true,
    pending: [],
  };
}
it("consciousness receives authorized communication and opening, with no work or foreign controls", () => {
  const result = journeyMenu(scope, state(), "en");
  expect(result.map(item => item.act)).toEqual(["say", "open", "resume", "desist"]);
  expect(result.find(item => item.act === "open")).toMatchObject({ tool: "journey", target: actor, scope: "open" });
  expect(result.find(item => item.act === "open")?.purpose).toContain("Open");
  // Over its own open journey the consciousness can go back to it or desist from it, by the journey's id.
  expect(result.slice(2)).toMatchObject([
    { tool: "journey", target: "j1", scope: "control" },
    { tool: "journey", target: "j1", scope: "control" },
  ]);
  const answer = {
    scene: "Preparando",
    consultation: null,
    acts: [{ act: "open", target: actor, input: { goal: "Anotar", kit } }],
  };
  expect(Value.Check(answerSchema(result), answer)).toBe(true);
  expect(validateAnswer(answer, { menu: result, scope, active: true, consulted: false, allowed: () => true }).ok).toBe(
    true,
  );
});
it("the journey receives kit work and its own controls compatible with the answer schema", () => {
  const result = journeyMenu(journey, state(), "en");
  expect(result.map(item => item.act)).toEqual(["write", "say", "plan", "wait", "end", "desist"]);
  expect(result.find(item => item.act === "say")?.scope).toBe("work");
  const answer = {
    scene: "Preparando",
    consultation: null,
    acts: [{ act: "end", target: "j1", input: { summary: "Listo", references: [] } }],
  };
  expect(Value.Check(answerSchema(result), answer)).toBe(true);
  expect(
    Value.Check(answerSchema(result), {
      ...answer,
      acts: [{ ...answer.acts[0], input: { summary: "Listo", references: [], by: "ana" } }],
    }),
  ).toBe(false);
});
it("crosses the current kit, the persisted kit and the turn's scope without widening any", () => {
  const current = { ...state(), kit: [{ tool: "notes", acts: ["write", "delete"] }] };
  expect(
    journeyMenu(journey, current, "en")
      .filter(item => item.scope === "work")
      .map(item => item.act),
  ).toEqual(["write"]);
  expect(journeyMenu({ ...journey, kit: [] }, current, "en").filter(item => item.scope === "work")).toEqual([]);
  expect(journeyMenu(scope, { ...current, communication: [] }, "en").map(item => item.act)).toEqual([
    "open",
    "resume",
    "desist",
  ]);
});
it("hides a repeated plan and offers done only if steps are pending", () => {
  const s = state();
  const plan = {
    ...effect("journey-plan-written", { steps: [{ id: "s", text: "Anotar" }] }, actor, [], "j1"),
    id: "e2",
    seq: 2,
    at: 1000,
  };
  const planned = { ...s, journeys: journeyStep(s.journeys, plan) };
  expect(journeyMenu(journey, planned, "en").map(item => item.act)).toEqual([
    "write",
    "say",
    "done",
    "wait",
    "end",
    "desist",
  ]);
  const done = {
    ...effect("journey-step-done", { step: "s", note: "Listo" }, actor, [], "j1"),
    id: "e3",
    seq: 3,
    at: 1000,
  };
  expect(
    journeyMenu(journey, { ...planned, journeys: journeyStep(planned.journeys, done) }, "en").some(
      item => item.act === "done",
    ),
  ).toBe(false);
});
it("offers no closures while the process still has acts in progress", () => {
  const s = { ...state(), pending: [{ by: actor, process: "j1" }] };
  expect(journeyMenu(journey, s, "en").map(item => item.act)).toEqual(["write", "say", "plan", "wait"]);
});
it("offers nothing for closed, missing or foreign processes or disabled minds", () => {
  const s = state();
  const closed = {
    ...effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, actor, [], "j1"),
    id: "e2",
    seq: 2,
    at: 1000,
  };
  expect(journeyMenu(journey, { ...s, journeys: journeyStep(s.journeys, closed) }, "en")).toEqual([]);
  expect(journeyMenu({ ...journey, process: "absent" }, s, "en")).toEqual([]);
  expect(journeyMenu({ ...journey, actor: "mind:notes" }, s, "en")).toEqual([]);
  expect(journeyMenu(scope, { ...s, active: false }, "en")).toEqual([]);
});
it("rechaza destinos ambiguos entre trabajo y controles", () => {
  const collision: MindMenu = [{ tool: "notes", act: "end", target: "j1", scope: "work", input: Type.Object({}) }];
  const s = state();
  const opened = {
    ...effect("journey-opened", { goal: "Anotar", kit: [{ tool: "notes", acts: ["end"] }] }, actor, [], "j2"),
    id: "e2",
    seq: 2,
    at: 1000,
  };
  const scope: MindScope = { kind: "journey", actor, process: "j2", kit: [{ tool: "notes", acts: ["end"] }] };
  expect(() =>
    journeyMenu(
      scope,
      {
        ...s,
        journeys: journeyStep(s.journeys, opened),
        kit: scope.kit,
        menu: collision.map(item => ({ ...item, target: "j2" })),
      },
      "en",
    ),
  ).toThrow("menu");
});
