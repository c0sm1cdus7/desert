import { expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
const policy: WakePolicy = {
  scope: { kind: "consciousness", actor: "assistant:franco" },
  name: "Nóra",
  message: event => (event.layer === "program" && typeof event.data === "string" ? { text: event.data } : undefined),
  toolOf: target => target.split("/")[0],
};
const message = (text: string, seq = 1, by = "martin"): Event => ({
  layer: "program",
  kind: "said",
  data: text,
  by,
  cause: [],
  id: `e${seq}`,
  seq,
  at: 0,
});
it.each(["Nora, anotá", "¿NÓRA?", "nora", "Hola, No\u0301ra", "(Nora)"])("nombra como palabra entera: %s", text => {
  expect(mindWakeDecision(policy, message(text), [], 0)).toBe(true);
});
it.each(["anorada", "Noralí", "noradrenalina", "Buen día", "Llegué", "Gracias", "Mañana llevo bizcochitos"])(
  "no nombra: %s",
  text => expect(mindWakeDecision(policy, message(text), [], 0)).toBe(false),
);
it("acepta mensajes directos de cualquier identidad y excluye los propios", () => {
  const direct = { ...policy, message: () => ({ text: "Hola", to: "assistant:franco" }) };
  expect(mindWakeDecision(direct, message("Hola"), [], 0)).toBe(true);
  expect(mindWakeDecision(direct, message("Nora", 1, "assistant:franco"), [], 0)).toBe(false);
});
it("la herramienta despierta por cada acto en ella y en sus objetos, salvo los propios", () => {
  const tool = { ...policy, scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  const event = {
    ...effect("act", { object: "notes/n1", option: "edit", input: {} }, "franco"),
    id: "e1",
    seq: 1,
    at: 0,
  };
  expect(mindWakeDecision(tool, event, [], 0)).toBe(true);
  expect(mindWakeDecision(tool, { ...event, by: "mind:notes" }, [], 0)).toBe(false);
  expect(mindWakeDecision(tool, message("Nora"), [], 0)).toBe(false);
});
it("el final de su journey vuelve a la consciencia sin despertar al journey cerrado", () => {
  const event = {
    ...effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, "assistant:franco", [], "j1"),
    id: "e1",
    seq: 1,
    at: 0,
  };
  expect(mindWakeDecision(policy, event, [event], 0)).toBe(true);
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  expect(mindWakeDecision(journey, event, [event], 0)).toBe(false);
});
it("correlaciona una respuesta de herramienta con el pedido de la mente y su proceso", () => {
  const request = {
    ...effect("mind-message", { turn: "t0", to: "mind:notes", text: "Anotá" }, "assistant:franco", [], "j1"),
    id: "request",
    seq: 1,
    at: 0,
  };
  const response = {
    ...effect("mind-message", { turn: "t2", to: "assistant:franco", text: "Listo" }, "mind:notes", [request.id]),
    id: "response",
    seq: 2,
    at: 0,
  };
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  expect(mindWakeDecision(journey, response, [request, response], 0)).toBe(true);
  expect(mindWakeDecision(policy, response, [request, response], 0)).toBe(false);
  expect(mindWakeDecision(journey, { ...response, cause: [] }, [request], 0)).toBe(false);
});
it("deriva el fin de la última espera y no toma una anterior ni un journey cerrado", () => {
  const waiting = {
    ...effect("journey-waiting", { what: "Respuesta", until: 10 }, "assistant:franco", [], "j1"),
    id: "e1",
    seq: 1,
    at: 0,
  };
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  expect(mindWakeDecision(journey, waiting, [waiting], 9)).toBe(false);
  expect(mindWakeDecision(journey, waiting, [waiting], 10)).toBe(true);
  const next = { ...waiting, id: "e2", seq: 2, data: { what: "Otra respuesta", until: 20 } };
  expect(mindWakeDecision(journey, waiting, [waiting, next], 10)).toBe(false);
});
it("una respuesta que reanuda el journey termina la espera antes de su vencimiento", () => {
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  const waiting = {
    ...effect("journey-waiting", { what: "Respuesta", until: 10 }, policy.scope.actor, [], "j1"),
    id: "waiting",
    seq: 1,
    at: 0,
  };
  const resumed = {
    ...effect("mind-turn-opened", { turn: "t2", wake: ["reply"] }, policy.scope.actor, [], "j1"),
    id: "resumed",
    seq: 3,
    at: 5,
  };
  expect(mindWakeDecision(journey, waiting, [waiting, resumed], 10)).toBe(false);
});
it("abre el journey para trabajar una vez y no lo despierta por sus escenas, costos o actos propios", () => {
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  const opening = {
    ...effect("journey-opened", { goal: "Anotar", kit: [] }, policy.scope.actor, [], "j1"),
    id: "opening",
    seq: 1,
    at: 0,
  };
  expect(mindWakeDecision(journey, opening, [opening], 0)).toBe(true);
  const own = [
    effect("mind-scene", { turn: "t1", text: "Nora" }, policy.scope.actor, [], "j1"),
    effect("act", { object: "notes", option: "write", input: {} }, policy.scope.actor, [], "j1"),
    effect("model-call-started", { call: "c1" }, policy.scope.actor, [], "j1"),
  ];
  for (const emission of own)
    expect(mindWakeDecision(journey, { ...emission, id: "e2", seq: 2, at: 0 }, [opening], 0)).toBe(false);
});
it("un nombre compuesto conserva sus límites y no interpreta metacaracteres", () => {
  const named = { ...policy, name: "Nora (Sur)" };
  expect(mindWakeDecision(named, message("Hola Nora (Sur)!"), [], 0)).toBe(true);
  expect(mindWakeDecision(named, message("Nora Sur"), [], 0)).toBe(false);
});
it("un argumento ausente nombra el campo que falta", () => {
  expect(() => {
    Reflect.apply(mindWakeDecision, undefined, []);
  }).toThrow("policy");
  expect(() => {
    Reflect.apply(mindWakeDecision, undefined, [policy]);
  }).toThrow("event");
  expect(() => {
    Reflect.apply(mindWakeDecision, undefined, [policy, message("Nora")]);
  }).toThrow("history");
});

it("un mensaje directo despierta la consciencia de programa sin despertar otras mentes", () => {
  const direct = {
    ...effect("mind-message", { turn: "t1", to: "mind:notes", text: "Revisá la nota" }, "mind:agenda"),
    id: "direct",
    seq: 1,
    at: 0,
  };
  const notes = { ...policy, scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  expect(mindWakeDecision(notes, direct, [direct], 0)).toBe(true);
  expect(mindWakeDecision(policy, direct, [direct], 0)).toBe(false);
  expect(mindWakeDecision(notes, { ...direct, by: "mind:notes" }, [direct], 0)).toBe(false);
});
