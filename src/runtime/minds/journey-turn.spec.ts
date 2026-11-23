// A journey's turn hears a tool's refusal among its results, skips what came after it, and goes on in the same turn.
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { runMindTurn } from "./mind-turn.ts";
import type { ModelOutcome, TurnPorts, TurnWake } from "./mind-ports.ts";
import { fixture, ok } from "../../../tests/support/mind-turn-fixture.ts";
import { JourneyKitRefused, JourneyWaitRefused } from "../../tools/minds/journey-controls.ts";
import { journeyInputs } from "../../tools/minds/journey-menu.ts";
import type { MindMenu } from "../../tools/minds/mind-answer.ts";
const wake: TurnWake = {
  id: "t1",
  scope: { kind: "journey", actor: "assistant:franco", process: "j1", kit: [{ tool: "chat", acts: ["say"] }] },
  wake: ["e1"],
  through: 1,
};
const menu = [
  { tool: "chat", act: "say", target: "chat", input: Type.Object({ text: Type.String() }), scope: "work" as const },
  {
    tool: "journey",
    act: "wait",
    target: "j1",
    input: Type.Object({ what: Type.String(), until: Type.Number() }),
    scope: "control" as const,
  },
];
const say = { act: "say", target: "chat", input: { text: "Hola" } };
const wait = { act: "wait", target: "j1", input: { what: "Espero", until: 2 } };
const answer = (acts: readonly unknown[]) => ok({ scene: "Sigo", consultation: null, acts });
it("a tool's refusal is a result, not a correction: the rest waits and the mind answers again", async () => {
  const f = fixture([answer([say, wait]), answer([say, wait])]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    return ++count === 1
      ? { status: "rejected", id: "a1", reason: "Muy largo" }
      : { status: "accepted", id: `a${count}` };
  };
  const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
  const outcome = await runMindTurn({ ...f.ports, execute, read }, wake);
  expect(outcome).toMatchObject({ outcome: "done", calls: 2, applied: ["a2", "a3"] });
  expect(f.events.some(event => event.kind === "mind-answer-invalid")).toBe(false);
  const [first, second] = f.model.mock.calls.map(call => call[0]);
  expect(second?.frame).toBe(first?.frame);
  expect(first?.exchanges).toEqual([]);
  const told = second?.exchanges?.[0]?.told ?? "";
  expect(told).toContain("1. say → chat: rejected: Muy largo");
  expect(told).toContain("2. wait → j1: not applied, because an earlier act was rejected.");
  expect(told).toContain("Now: 5");
  expect(second?.exchanges?.[0]?.answer).toBe(JSON.stringify({ scene: "Sigo", consultation: null, acts: [say, wait] }));
});
it("corrections in a row go on: only the twelve calls end a journey turn (21/11)", async () => {
  const invalid = ok({ scene: "Sigo", consultation: null, acts: [] });
  const f = fixture([invalid, invalid, invalid, answer([wait])]);
  const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
  expect(await runMindTurn({ ...f.ports, read }, wake)).toMatchObject({ outcome: "done", calls: 4 });
  const faults = f.events.flatMap(event => (event.kind === "mind-answer-invalid" ? [event.data.faults] : []));
  expect(faults).toHaveLength(3);
});
it("a journey that never says how it goes on stops at the call limit, not at a count of corrections", async () => {
  const invalid = ok({ scene: "Sigo", consultation: null, acts: [] });
  const broken: ModelOutcome = { kind: "invalid", reason: "json" };
  const f = fixture([...Array.from({ length: 6 }, () => invalid), ...Array.from({ length: 6 }, () => broken)]);
  const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
  expect(await runMindTurn({ ...f.ports, read }, wake)).toMatchObject({ outcome: "failed", reason: "call-limit" });
  expect(f.model).toHaveBeenCalledTimes(12);
  expect(f.state().turns.get("t1")?.closed?.data).toMatchObject({ reason: "call-limit", calls: 12 });
});
const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
/** Accepts every act but a wait that ends before the house clock, which the journey control refuses. */
function refusingPastWaits(): TurnPorts["execute"] {
  let count = 0;
  return async act => {
    await Promise.resolve();
    const input: unknown = act.input;
    if (act.act === "wait" && typeof input === "object" && input && "until" in input && input.until === 2)
      throw new JourneyWaitRefused(5);
    return { status: "accepted", id: `a${++count}` };
  };
}
it("acts applied before a refused wait reach the mind with the correction, in one message", async () => {
  const later = { ...wait, input: { what: "Espero", until: 9 } };
  const f = fixture([answer([say, wait]), answer([later])]);
  const outcome = await runMindTurn({ ...f.ports, execute: refusingPastWaits(), read }, wake);
  expect(outcome).toMatchObject({ outcome: "done", calls: 2, applied: ["a1", "a2"] });
  const second = f.model.mock.calls[1]?.[0];
  expect(second?.exchanges).toHaveLength(1);
  const told = second?.exchanges?.[0]?.told ?? "";
  expect(told).toContain("1. say → chat: accepted.");
  expect(told).toContain("2. wait → j1: rejected: The wait ends after Now: until in milliseconds, greater than");
  expect(f.events.flatMap(event => (event.kind === "mind-answer-invalid" ? [event.data.faults] : []))).toEqual([
    [{ code: "wait", path: "/acts" }],
  ]);
});
it("a refused wait after applied acts gets its own correction, even when the last one was spent", async () => {
  const later = { ...wait, input: { what: "Espero", until: 9 } };
  const empty = ok({ scene: "Sigo", consultation: null, acts: [] });
  const f = fixture([empty, answer([say, wait]), answer([later])]);
  const outcome = await runMindTurn({ ...f.ports, execute: refusingPastWaits(), read }, wake);
  expect(outcome).toMatchObject({ outcome: "done", calls: 3, applied: ["a1", "a2"] });
  expect(f.model.mock.calls[2]?.[0].exchanges?.at(-1)?.told).toContain("1. say → chat: accepted.");
});
it("a rejected act tells what it returned, a device's receipt among them", async () => {
  const f = fixture([answer([say, wait]), answer([wait])]);
  let count = 0;
  const execute: TurnPorts["execute"] = async () => {
    await Promise.resolve();
    return ++count === 1
      ? { status: "rejected", id: "a1", reason: "exit 1", value: { exit: 1, out: "RECIBO" } }
      : { status: "accepted", id: `a${count}` };
  };
  await runMindTurn({ ...f.ports, execute, read }, wake);
  const told = f.model.mock.calls[1]?.[0].exchanges?.[0]?.told ?? "";
  expect(told).toContain('1. say → chat: rejected: exit 1\n   Returned: {"exit":1,"out":"RECIBO"}');
});
it("every call of a turn asks with the same schema, so a menu that changes keeps the cached prefix", async () => {
  const control = (act: "plan" | "done" | "wait" | "end" | "desist") => ({
    tool: "journey",
    act,
    target: "j1",
    input: journeyInputs[act],
    scope: "control" as const,
  });
  const [chat] = menu;
  if (!chat) throw new Error("menu");
  let planned = false;
  const changing: TurnPorts["read"] = () => ({
    ...read(wake.scope),
    menu: [chat, control(planned ? "done" : "plan"), control("wait"), control("end"), control("desist")],
  });
  const execute: TurnPorts["execute"] = async act => {
    await Promise.resolve();
    planned ||= act.act === "plan";
    return { status: "accepted", id: `a-${act.act}` };
  };
  const plan = { act: "plan", target: "j1", input: { steps: [{ id: "one", text: "Anotar" }] } };
  const done = { act: "done", target: "j1", input: { step: "one", note: "Anotado" } };
  const f = fixture([answer([plan]), answer([done, { ...wait, input: { what: "Espero", until: 9 } }])]);
  expect(await runMindTurn({ ...f.ports, execute, read: changing }, wake)).toMatchObject({ outcome: "done", calls: 2 });
  const [first, second] = f.model.mock.calls.map(call => JSON.stringify(call[0].schema));
  expect(second).toBe(first);
  expect(first).toContain('"const":"done"');
  expect(f.model.mock.calls[1]?.[0].exchanges?.[0]?.told).toContain("Appeared on the menu:");
});
it("an act that left the menu is corrected against the current menu, though the schema names it", async () => {
  const [chat] = menu;
  if (!chat) throw new Error("menu");
  const control = (act: "plan" | "wait") => ({
    tool: "journey",
    act,
    target: "j1",
    input: journeyInputs[act],
    scope: "control" as const,
  });
  let plans = 0;
  const changing: TurnPorts["read"] = () => ({
    ...read(wake.scope),
    menu: [chat, ...(plans ? [] : [control("plan")]), control("wait")],
  });
  const execute: TurnPorts["execute"] = async act => {
    await Promise.resolve();
    if (act.act === "plan") plans++;
    return { status: "accepted", id: `a-${act.act}-${plans}` };
  };
  const plan = { act: "plan", target: "j1", input: { steps: [{ id: "one", text: "Anotar" }] } };
  const later = { ...wait, input: { what: "Espero", until: 9 } };
  const f = fixture([answer([plan]), answer([plan]), answer([later])]);
  expect(await runMindTurn({ ...f.ports, execute, read: changing }, wake)).toMatchObject({ outcome: "done", calls: 3 });
  expect(plans).toBe(1);
  expect(f.events.flatMap(event => (event.kind === "mind-answer-invalid" ? [event.data.faults] : []))).toEqual([
    [{ code: "menu", path: "/acts/0" }],
  ]);
});
it("a consciousness hears its applied acts with a refused kit, without the journey's closing words", async () => {
  const consciousness: TurnWake = { ...wake, scope: { kind: "consciousness", actor: "assistant:franco" } };
  const open = { act: "open", target: "assistant:franco", input: { goal: "Anotar", kit: [] } };
  const f = fixture([answer([say, open]), answer([say])]);
  let count = 0;
  const execute: TurnPorts["execute"] = async act => {
    await Promise.resolve();
    if (act.act === "open") throw new JourneyKitRefused([{ tool: "notes", acts: ["personal/add"] }]);
    return { status: "accepted", id: `a${++count}` };
  };
  const talk: MindMenu[number] = {
    tool: "chat",
    act: "say",
    target: "chat",
    input: Type.Object({ text: Type.String() }),
    scope: "communication",
  };
  const opening: MindMenu[number] = {
    tool: "journey",
    act: "open",
    target: "assistant:franco",
    input: Type.Object({
      goal: Type.String(),
      kit: Type.Array(Type.Object({ tool: Type.String(), acts: Type.Array(Type.String()) })),
    }),
    scope: "open",
  };
  const reading: TurnPorts["read"] = () => ({ ...read(wake.scope), menu: [talk, opening] });
  expect(await runMindTurn({ ...f.ports, execute, read: reading }, consciousness)).toMatchObject({
    outcome: "done",
    calls: 2,
  });
  const told = f.model.mock.calls[1]?.[0].exchanges?.[0]?.told ?? "";
  expect(told).toContain("1. say → chat: accepted.");
  expect(told).toContain("2. open → assistant:franco: rejected: The journey's kit comes out of your kit");
  expect(told).not.toContain("The turn goes on");
});
