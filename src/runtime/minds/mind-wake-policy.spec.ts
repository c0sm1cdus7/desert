// Proves who a program message wakes: the other one of a thread of two, only the named in a group, never a journey.
import { expect, it } from "vitest";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { effect } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { addressed, mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
const said = Type.Object({ text: Type.String(), to: Type.Array(Type.String()) });
const policy: WakePolicy = {
  scope: { kind: "consciousness", actor: "assistant:franco" },
  name: "Nóra",
  message: event =>
    event.layer === "program" && Value.Check(said, event.data) ? { ...event.data, by: event.by } : undefined,
  toolOf: target => target.split("/")[0],
};
const message = (text: string, seq = 1, by = "mind:agenda", to = ["assistant:franco"]): Event => ({
  layer: "program",
  kind: "said",
  data: { text, to },
  by,
  cause: [],
  id: `e${seq}`,
  seq,
  at: 0,
});
const group = ["ana", "assistant:franco"];
it.each(["Nora, anotá", "¿NÓRA?", "nora", "Hola, No\u0301ra", "(Nora)", "assistant:franco, mirá"])(
  "en un grupo una mente despierta a otra solo nombrándola como palabra entera: %s",
  text => {
    expect(mindWakeDecision(policy, message(text, 1, "mind:agenda", group), [], 0)).toBe(true);
  },
);
it.each(["anorada", "Noralí", "noradrenalina", "Buen día", "Llegué", "Gracias", "Mañana llevo bizcochitos"])(
  "en un grupo un mensaje que no la nombra no la despierta: %s",
  text => expect(mindWakeDecision(policy, message(text, 1, "mind:agenda", group), [], 0)).toBe(false),
);
it("una identidad despierta al otro en un hilo de dos; nadie despierta por lo propio ni por lo ajeno", () => {
  expect(mindWakeDecision(policy, message("Buen día", 1, "martin"), [], 0)).toBe(true);
  expect(mindWakeDecision(policy, message("Nora", 1, "assistant:franco"), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("Nora", 1, "martin", ["mind:notes"]), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("Nora", 1, "martin", group), [], 0)).toBe(true);
});
it("22/11: en un grupo despierta solo a quien nombra, también si escribe una persona", () => {
  expect(mindWakeDecision(policy, message("Buen día", 1, "martin", group), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("Buen día, Nora", 1, "martin", group), [], 0)).toBe(true);
  expect(mindWakeDecision(policy, message("assistant:franco, mirá", 1, "martin", group), [], 0)).toBe(true);
});
it("22/11: en un hilo de dos todo mensaje despierta al otro, también si lo escribe una mente sin nombrarlo", () => {
  expect(mindWakeDecision(policy, message("Listo", 1, "mind:agenda"), [], 0)).toBe(true);
  // A reader that lists the author among those it reads for still makes a thread of two.
  expect(mindWakeDecision(policy, message("Listo", 1, "mind:agenda", ["mind:agenda", "assistant:franco"]), [], 0)).toBe(
    true,
  );
});
it("22/11: una mente nunca despierta por su propio mensaje, aunque la lista de lectores la incluya y se nombre", () => {
  const own = (to: string[]) => message("Nora, listo", 1, "assistant:franco", to);
  for (const to of [["assistant:franco"], ["assistant:franco", "ana"], ["assistant:franco", "ana", "beto"]]) {
    expect(mindWakeDecision(policy, own(to), [], 0)).toBe(false);
    expect(addressed(policy, policy.message(own(to)))).toBe(false);
  }
});
it("los mensajes nativos de antes del 20/11 quedan en el diario y ya no despiertan a nadie", () => {
  const legacy = [
    effect("mind-requested", { to: "assistant:franco", text: "Nora" }, "martin"),
    effect("mind-message", { turn: "t0", to: "assistant:franco", text: "Nora" }, "mind:notes"),
  ];
  for (const emission of legacy)
    expect(mindWakeDecision(policy, { ...emission, id: "e1", seq: 1, at: 0 }, [], 0)).toBe(false);
});
it("un journey no despierta por mensajes; los oye su consciencia", () => {
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  expect(mindWakeDecision(journey, message("Nora, listo", 1, "martin"), [], 0)).toBe(false);
  expect(mindWakeDecision(journey, { ...message("Nora, listo", 1, "martin"), process: "j1" }, [], 0)).toBe(false);
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
  expect(mindWakeDecision(tool, message("Nora", 1, "franco"), [], 0)).toBe(false);
  expect(mindWakeDecision(tool, message("Anotá", 1, "franco", ["mind:notes"]), [], 0)).toBe(true);
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
  expect(mindWakeDecision(named, message("Hola Nora (Sur)!", 1, "mind:agenda", group), [], 0)).toBe(true);
  expect(mindWakeDecision(named, message("Nora Sur", 1, "mind:agenda", group), [], 0)).toBe(false);
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

it("un mensaje de programa en un grupo despierta a la consciencia que nombra sin despertar otras mentes", () => {
  const direct = message("Notas, revisá la nota", 1, "mind:agenda", ["mind:notes", "ana"]);
  const notes = { ...policy, name: "Notas", scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  expect(mindWakeDecision(notes, direct, [direct], 0)).toBe(true);
  expect(mindWakeDecision(policy, direct, [direct], 0)).toBe(false);
  expect(mindWakeDecision(notes, { ...direct, by: "mind:notes" }, [direct], 0)).toBe(false);
  expect(mindWakeDecision(notes, message("Revisá la nota", 1, "mind:agenda", ["mind:notes", "ana"]), [], 0)).toBe(
    false,
  );
  expect(mindWakeDecision(notes, message("Revisá la nota", 1, "mind:agenda", ["mind:notes"]), [], 0)).toBe(true);
});
it("22/11, sin firmar: dos mentes que siempre contestan en un hilo de dos se despiertan una a otra sin fin", () => {
  // On record, not a guard: no code stops them, only each mind's judgement (the owner forbids timers and limits).
  const agenda = {
    ...policy,
    name: "Agenda",
    scope: { kind: "consciousness" as const, actor: "mind:agenda" as const },
  };
  const minds = [policy, agenda];
  let line = message("Hola", 1, "mind:agenda");
  const woken: string[] = [];
  for (let seq = 2; seq <= 21; seq++) {
    const awake = minds.filter(each => mindWakeDecision(each, line, [line], 0));
    expect(awake.map(each => each.scope.actor)).toEqual([
      line.by === "mind:agenda" ? "assistant:franco" : "mind:agenda",
    ]);
    const answering = awake[0]?.scope.actor ?? "";
    woken.push(answering);
    line = message("Listo", seq, answering, [answering === "mind:agenda" ? "assistant:franco" : "mind:agenda"]);
  }
  expect(woken).toHaveLength(20);
  expect(new Set(woken)).toEqual(new Set(["assistant:franco", "mind:agenda"]));
});
