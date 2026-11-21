// A journey's turn hears a tool's refusal among its results, skips what came after it, and goes on in the same turn.
import { Type } from "@sinclair/typebox";
import { expect, it } from "vitest";
import { runMindTurn } from "./mind-turn.ts";
import type { TurnPorts, TurnWake } from "./mind-ports.ts";
import { fixture, ok } from "../../../tests/support/mind-turn-fixture.ts";
const wake: TurnWake = {
  id: "t1",
  scope: { kind: "journey", actor: "assistant:franco", process: "j1", kit: [{ tool: "chat", acts: ["say"] }] },
  language: "es",
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
const answer = (acts: readonly unknown[]) => ok({ scene: "Sigo", consulta: null, acts });
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
  expect(told).toContain("1. say → chat: rechazado: Muy largo");
  expect(told).toContain("2. wait → j1: no se aplicó");
  expect(told).toContain("Ahora: 5");
  expect(second?.exchanges?.[0]?.answer).toBe(JSON.stringify({ scene: "Sigo", consulta: null, acts: [say, wait] }));
});
it("each applied answer gives the next its own correction, all within the call limit", async () => {
  const invalid = ok({ scene: "Sigo", consulta: null, acts: [] });
  const f = fixture([answer([say]), invalid, answer([say]), invalid, answer([wait])]);
  const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
  const outcome = await runMindTurn({ ...f.ports, read }, wake);
  expect(outcome).toMatchObject({ outcome: "done", calls: 5 });
  const faults = f.events.flatMap(event => (event.kind === "mind-answer-invalid" ? [event.data.faults] : []));
  expect(faults).toEqual([[{ code: "continuation", path: "/acts" }], [{ code: "continuation", path: "/acts" }]]);
});
it("two corrections in a row end the turn as invalid", async () => {
  const invalid = ok({ scene: "Sigo", consulta: null, acts: [] });
  const f = fixture([invalid, invalid]);
  const read: TurnPorts["read"] = () => ({ active: true, through: 1, rulesVersion: "v1", menu, now: 5 });
  expect(await runMindTurn({ ...f.ports, read }, wake)).toMatchObject({ outcome: "failed", reason: "invalid" });
  expect(f.state().turns.get("t1")?.closed?.data.reason).toBe("invalid");
});
