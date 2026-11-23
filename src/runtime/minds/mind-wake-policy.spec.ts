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
  name: "Nora",
  message: event =>
    event.layer === "program" && Value.Check(said, event.data) ? { ...event.data, by: event.by } : undefined,
  toolOf: target => target.split("/")[0],
  talks: false,
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
const group = ["ana", "assistant:franco", "beto"];
const inGroup = (named: WakePolicy, text: string) =>
  mindWakeDecision(named, message(text, 1, "mind:agenda", ["ana", named.scope.actor, "beto"]), [], 0);
it.each(["@Nora, anotá", "¿@NÓRA?", "@nora", "Hola, @No\u0301ra", "(@Nora)", "@Nora.", "@assistant:franco, mirá"])(
  "22/11: in a group a mind is named by @ and the name people see, or @ and its actor: %s",
  text => expect(inGroup(policy, text)).toBe(true),
);
it.each([
  "Nora, anotá",
  "le pregunté a Nora y nada",
  "assistant:franco, mirá",
  "identities/assistant:franco",
  "nora@example.com",
  "x@nora",
  "_@nora",
  "@Norah",
  "@Nora2",
  "@Nora_",
  "@ Nora",
  "@assistant:francoa",
  "anorada",
  "Buen día",
  "Mañana llevo bizcochitos",
])("22/11: a bare word, a bare actor or an @ inside a word names nobody: %s", text =>
  expect(inGroup(policy, text)).toBe(false),
);
it("22/11: a program's mind is named by its program's name, never by the bare word", () => {
  const notes = { ...policy, name: "Notas", scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  for (const text of ["@Notas, anotá esto", "@notas anotá esto", "@NOTAS: anotá esto", "@mind:notes anotá esto"])
    expect(inGroup(notes, text)).toBe(true);
  for (const text of ["Notas, anotá esto", "repasamos las notas compartidas", "mind:notes, anotá", "program:notes"])
    expect(inGroup(notes, text)).toBe(false);
});
it("23/11: a program's name said in both languages names its mind in either, and only when it says something", () => {
  const notes = {
    ...policy,
    name: { en: "Notes", es: "Notas" },
    scope: { kind: "consciousness" as const, actor: "mind:notes" as const },
  };
  for (const text of ["@Notas, anotá esto", "@Notes, add this", "@mind:notes add this"])
    expect(inGroup(notes, text)).toBe(true);
  for (const text of ["Notes, add this", "Notas, anotá esto"]) expect(inGroup(notes, text)).toBe(false);
  expect(() => inGroup({ ...notes, name: { en: " ", es: "Notas" } }, "@Notas")).toThrow("policy.name");
});
it("22/11: a name of several words matches any run of spaces, and only whole", () => {
  const named = { ...policy, name: "Asistente de Martín" };
  for (const text of ["@Asistente  de\nMartín, ¿podés?", "@asistente de martin", "(@Asistente\tde Martín)"])
    expect(inGroup(named, text)).toBe(true);
  for (const text of ["Martín, ¿podés?", "Asistente de Martín, ¿podés?", "@Asistente de Martíns", "@Asistente"])
    expect(inGroup(named, text)).toBe(false);
});
it("an identity wakes the other in a two-person thread; nobody wakes for their own or for others' things", () => {
  expect(mindWakeDecision(policy, message("Buen día", 1, "martin"), [], 0)).toBe(true);
  expect(mindWakeDecision(policy, message("@Nora", 1, "assistant:franco"), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("@Nora", 1, "martin", ["mind:notes"]), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("@Nora", 1, "martin", group), [], 0)).toBe(true);
});
it("22/11: in a group it wakes only whoever it names, also when a person writes", () => {
  expect(mindWakeDecision(policy, message("Buen día", 1, "martin", group), [], 0)).toBe(false);
  expect(mindWakeDecision(policy, message("Buen día, @Nora", 1, "martin", group), [], 0)).toBe(true);
  expect(mindWakeDecision(policy, message("@assistant:franco, mirá", 1, "martin", group), [], 0)).toBe(true);
});
it("22/11: in a two-person thread every message wakes the other, even one a mind writes without naming them", () => {
  expect(mindWakeDecision(policy, message("Listo", 1, "mind:agenda"), [], 0)).toBe(true);
  // A reader that lists the author among those it reads for still makes a thread of two.
  expect(mindWakeDecision(policy, message("Listo", 1, "mind:agenda", ["mind:agenda", "assistant:franco"]), [], 0)).toBe(
    true,
  );
});
it("22/11: a mind never wakes for its own message, even if the readers list includes it and it names itself", () => {
  const own = (to: string[]) => message("@Nora, listo", 1, "assistant:franco", to);
  for (const to of [["assistant:franco"], ["assistant:franco", "ana"], ["assistant:franco", "ana", "beto"]]) {
    expect(mindWakeDecision(policy, own(to), [], 0)).toBe(false);
    expect(addressed(policy, policy.message(own(to)))).toBe(false);
  }
});
it("native messages from before 20/11 stay in the journal and no longer wake anyone", () => {
  const legacy = [
    effect("mind-requested", { to: "assistant:franco", text: "Nora" }, "martin"),
    effect("mind-message", { turn: "t0", to: "assistant:franco", text: "Nora" }, "mind:notes"),
  ];
  for (const emission of legacy)
    expect(mindWakeDecision(policy, { ...emission, id: "e1", seq: 1, at: 0 }, [], 0)).toBe(false);
});
it("a journey does not wake for messages; its consciousness hears them", () => {
  const journey = { ...policy, scope: { kind: "journey" as const, actor: policy.scope.actor, process: "j1", kit: [] } };
  expect(mindWakeDecision(journey, message("Nora, listo", 1, "martin"), [], 0)).toBe(false);
  expect(mindWakeDecision(journey, { ...message("Nora, listo", 1, "martin"), process: "j1" }, [], 0)).toBe(false);
});
it("the tool that does not talk wakes for every act on it and its objects, except its own", () => {
  const tool = { ...policy, scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  const event = {
    ...effect("act", { object: "notes/n1", option: "edit", input: {} }, "franco"),
    id: "e1",
    seq: 1,
    at: 0,
  };
  expect(mindWakeDecision(tool, event, [], 0)).toBe(true);
  expect(mindWakeDecision(tool, { ...event, by: "mind:notes" }, [], 0)).toBe(false);
  expect(mindWakeDecision(tool, message("@Nora", 1, "franco"), [], 0)).toBe(false);
  expect(mindWakeDecision(tool, message("Anotá", 1, "franco", ["mind:notes"]), [], 0)).toBe(true);
});
it("22/11: the talking program does not wake its mind for every act: its messages wake it", () => {
  const mind = { kind: "consciousness" as const, actor: "mind:communicator" as const };
  const communicator = { ...policy, name: "Comunicador", scope: mind, talks: true };
  const act = (option: string) => ({
    ...effect("act", { object: "communicator/threads/1", option, input: {} }, "franco"),
    id: "e1",
    seq: 1,
    at: 0,
  });
  for (const option of ["threads/say", "threads/open", "threads/add"])
    expect(mindWakeDecision(communicator, act(option), [], 0)).toBe(false);
  expect(mindWakeDecision(communicator, message("Hola", 1, "franco", ["ana"]), [], 0)).toBe(false);
  expect(mindWakeDecision(communicator, message("Hola", 1, "franco", ["mind:communicator"]), [], 0)).toBe(true);
  expect(mindWakeDecision(communicator, message("Hola", 1, "franco", ["mind:communicator", "ana"]), [], 0)).toBe(false);
  const named = message("@Comunicador, mirá", 1, "franco", ["mind:communicator", "ana"]);
  expect(mindWakeDecision(communicator, named, [], 0)).toBe(true);
  const bare = message("Comunicador, mirá", 1, "franco", ["mind:communicator", "ana"]);
  expect(mindWakeDecision(communicator, bare, [], 0)).toBe(false);
  // The same mind of a program that does not talk still wakes for an act on its own object.
  expect(mindWakeDecision({ ...communicator, talks: false }, act("threads/say"), [], 0)).toBe(true);
});
it("its journey's end goes back to the consciousness without waking the closed journey", () => {
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
it("derives the end of the last wait and takes neither an earlier one nor a closed journey", () => {
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
it("an answer that resumes the journey ends the wait before it expires", () => {
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
it("opens the journey to work once and does not wake it for its own scenes, costs or acts", () => {
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
it("a compound name keeps its boundaries and does not interpret metacharacters", () => {
  const named = { ...policy, name: "Nora (Sur)" };
  expect(mindWakeDecision(named, message("Hola @Nora (Sur)!", 1, "mind:agenda", group), [], 0)).toBe(true);
  expect(mindWakeDecision(named, message("@Nora Sur", 1, "mind:agenda", group), [], 0)).toBe(false);
  expect(mindWakeDecision(named, message("@Nora (Sur", 1, "mind:agenda", group), [], 0)).toBe(false);
});
it("a missing argument names the missing field", () => {
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

it("a program message in a group wakes the consciousness it names without waking other minds", () => {
  const direct = message("@Notas, revisá la nota", 1, "mind:agenda", ["mind:notes", "ana"]);
  const notes = { ...policy, name: "Notas", scope: { kind: "consciousness" as const, actor: "mind:notes" as const } };
  expect(mindWakeDecision(notes, direct, [direct], 0)).toBe(true);
  expect(mindWakeDecision(policy, direct, [direct], 0)).toBe(false);
  expect(mindWakeDecision(notes, { ...direct, by: "mind:notes" }, [direct], 0)).toBe(false);
  expect(mindWakeDecision(notes, message("Revisá la nota", 1, "mind:agenda", ["mind:notes", "ana"]), [], 0)).toBe(
    false,
  );
  expect(mindWakeDecision(notes, message("Revisá la nota", 1, "mind:agenda", ["mind:notes"]), [], 0)).toBe(true);
});
