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
it("la consciencia recibe comunicación autorizada y apertura, sin trabajo ni controles ajenos", () => {
  const result = journeyMenu(scope, state(), "es");
  expect(result.map(item => item.act)).toEqual(["say", "open"]);
  expect(result.at(-1)).toMatchObject({ tool: "journey", target: actor, scope: "open" });
  expect(result.at(-1)?.purpose).toContain("Abrir");
  const answer = {
    scene: "Preparando",
    consulta: null,
    acts: [{ act: "open", target: actor, input: { goal: "Anotar", kit } }],
  };
  expect(Value.Check(answerSchema(result), answer)).toBe(true);
  expect(validateAnswer(answer, { menu: result, scope, active: true, consulted: false, allowed: () => true }).ok).toBe(
    true,
  );
});
it("el journey recibe trabajo del kit y controles propios compatibles con el esquema de respuesta", () => {
  const result = journeyMenu(journey, state(), "es");
  expect(result.map(item => item.act)).toEqual(["write", "say", "plan", "wait", "end", "desist"]);
  expect(result.find(item => item.act === "say")?.scope).toBe("work");
  const answer = {
    scene: "Preparando",
    consulta: null,
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
it("cruza kit actual, kit persistido y alcance del turno sin ampliar ninguno", () => {
  const current = { ...state(), kit: [{ tool: "notes", acts: ["write", "delete"] }] };
  expect(
    journeyMenu(journey, current, "es")
      .filter(item => item.scope === "work")
      .map(item => item.act),
  ).toEqual(["write"]);
  expect(journeyMenu({ ...journey, kit: [] }, current, "es").filter(item => item.scope === "work")).toEqual([]);
  expect(journeyMenu(scope, { ...current, communication: [] }, "es").map(item => item.act)).toEqual(["open"]);
});
it("oculta plan repetido y ofrece done solo si hay pasos pendientes", () => {
  const s = state();
  const plan = {
    ...effect("journey-plan-written", { steps: [{ id: "s", text: "Anotar" }] }, actor, [], "j1"),
    id: "e2",
    seq: 2,
    at: 1000,
  };
  const planned = { ...s, journeys: journeyStep(s.journeys, plan) };
  expect(journeyMenu(journey, planned, "es").map(item => item.act)).toEqual([
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
    journeyMenu(journey, { ...planned, journeys: journeyStep(planned.journeys, done) }, "es").some(
      item => item.act === "done",
    ),
  ).toBe(false);
});
it("no ofrece cierres mientras quedan actos del proceso en curso", () => {
  const s = { ...state(), pending: [{ by: actor, process: "j1" }] };
  expect(journeyMenu(journey, s, "es").map(item => item.act)).toEqual(["write", "say", "plan", "wait"]);
});
it("no ofrece nada para procesos cerrados, ausentes, ajenos o mentes deshabilitadas", () => {
  const s = state();
  const closed = {
    ...effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, actor, [], "j1"),
    id: "e2",
    seq: 2,
    at: 1000,
  };
  expect(journeyMenu(journey, { ...s, journeys: journeyStep(s.journeys, closed) }, "es")).toEqual([]);
  expect(journeyMenu({ ...journey, process: "absent" }, s, "es")).toEqual([]);
  expect(journeyMenu({ ...journey, actor: "mind:notes" }, s, "es")).toEqual([]);
  expect(journeyMenu(scope, { ...s, active: false }, "es")).toEqual([]);
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
      "es",
    ),
  ).toThrow("menu");
});
