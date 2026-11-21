// The supervisor wakes for a consciousness turn that failed and reads which mind failed and why, in words.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { history, say, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  framesOf,
  moments,
  supervisedFixture,
  supervising,
  supervisor,
  think,
} from "../../../tests/support/supervisor-responder.ts";
import type { WakePolicy } from "./mind-wake-policy.ts";
import { supervisorWakes } from "./supervisor-wakes.ts";
const fixtures: ReturnType<typeof supervisedFixture>[] = [];
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  fixtures.splice(0).forEach(f => f.cleanup());
  vi.unstubAllGlobals();
});
type Closing = HouseEmission<"mind-turn-closed">["data"];
/** The closing of a consciousness turn: it carries no process. */
const closed = (data: Partial<Closing>, by = "mind:notes", seq = 5): Event => ({
  ...effect("mind-turn-closed", { turn: "t", outcome: "failed", calls: 1, applied: [], ...data }, by, []),
  id: `e${seq}`,
  seq,
  at: 0,
});
it("wakes for a consciousness turn that closed otherwise than done, for a reason that is no restart", () => {
  const policy: WakePolicy = {
    scope: { kind: "consciousness", actor: "mind:supervisor" },
    name: "supervisor",
    message: () => undefined,
    toolOf: () => undefined,
  };
  const wakes = (event: Event) => supervisorWakes(policy, 2, event, []);
  expect(wakes(closed({ reason: "invalid" }))).toBe(true);
  expect(wakes(closed({ reason: "internal" }, "assistant:ana"))).toBe(true);
  expect(wakes(closed({ outcome: "interrupted", reason: "uncertain" }))).toBe(true);
  expect(wakes(closed({ outcome: "interrupted", reason: "interrupted" }))).toBe(false);
  expect(wakes(closed({ outcome: "done" }))).toBe(false);
  expect(wakes(closed({ outcome: "done", reason: "invalid" }))).toBe(false);
  // A closure without a reason comes from before 21/11: nothing historical wakes it.
  expect(wakes(closed({}))).toBe(false);
  expect(wakes(closed({ outcome: "interrupted" }))).toBe(false);
  // Its own turns never wake it, and nothing at or before its frontier does.
  expect(wakes(closed({ reason: "invalid" }, "mind:supervisor"))).toBe(false);
  expect(wakes(closed({ reason: "invalid" }, "mind:notes", 2))).toBe(false);
});
it("reads which mind's turn failed and why when a consciousness never gives a valid answer", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  f.respond(frame => (supervising(frame) ? judge(frame) : { nothing: "valid" }));
  await think(house, "Mate el jueves");
  const closings = history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-closed" ? [[event.by, event.data.outcome]] : [],
  );
  expect(closings).toEqual([
    ["mind:notes", "failed"],
    ["mind:supervisor", "done"],
  ]);
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(framesOf(f).find(supervising)).toContain(
    "Falló un turno de la consciencia de mind:notes: " +
      "La respuesta siguió siendo inválida después de la única corrección.",
  );
}, 60000);
const closings = (house: RequestHouse) =>
  history(house).flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-closed" ? [`${event.by} ${event.data.outcome}`] : [],
  );
/** Who wrote the facts that woke each turn of the notes consciousness, in order. */
function wokenBy(house: RequestHouse) {
  const events = history(house);
  return events.flatMap(event =>
    event.layer === "house" && event.kind === "mind-turn-opened" && event.by === "mind:notes"
      ? [events.filter(each => event.data.wake.includes(each.id)).map(each => each.by)]
      : [],
  );
}
const scold = say("mind:notes", "mind:notes, tu turno falló: ¿qué pasó?");
/** A house whose notes mind never answers validly and whose supervisor speaks to it when it wakes, in its first six
 * turns so a loop between the two ends; in each of its own turns it first does `during`, as something else happening
 * in the house meanwhile. */
async function scolded(during: (house: RequestHouse, turn: number) => void = () => {}) {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  const judge = supervisor(
    () => ({ outcome: "passed", text: "Sí" }),
    (_, turn) => {
      during(house, turn);
      return turn > 6 ? [] : [scold];
    },
  );
  f.respond(frame => (supervising(frame) ? judge(frame) : { nothing: "valid" }));
  const before = f.transport.mock.calls.length;
  return { f, house, calls: () => f.transport.mock.calls.length - before };
}
const round = ["mind:notes failed", "mind:supervisor done", "mind:notes failed"];
it("does not wake for the failed turn of a consciousness only its own line woke: one round ends it", async () => {
  const { f, house, calls } = await scolded();
  await think(house, "Mate el jueves");
  expect(closings(house)).toEqual(round);
  expect(wokenBy(house)).toEqual([["ana"], ["mind:supervisor"]]);
  // Two calls for each failed turn of the notes mind, the answer and its only correction, and one of the supervisor.
  expect(moments(framesOf(f))).toEqual(["turn"]);
  expect(calls()).toBe(5);
}, 60000);
it("still wakes for a consciousness a person woke that fails, after the round its own line ended", async () => {
  const { f, house } = await scolded();
  await think(house, "Mate el jueves");
  await think(house, "Facturas el viernes");
  expect(closings(house)).toEqual([...round, "mind:notes failed", "mind:supervisor done", "mind:notes failed"]);
  expect(wokenBy(house)).toEqual([["ana"], ["mind:supervisor"], ["ana"], ["mind:supervisor"]]);
  expect(moments(framesOf(f))).toEqual(["turn", "turn"]);
}, 60000);
it("still wakes for a consciousness that its line and a person's woke at once and that fails", async () => {
  const { f, house } = await scolded((house, turn) => {
    if (turn === 1) expect(send(house, "mind:notes", "Facturas el viernes").status).toBe("accepted");
  });
  await think(house, "Mate el jueves");
  expect(wokenBy(house)).toEqual([["ana"], ["ana", "mind:supervisor"], ["mind:supervisor"]]);
  expect(closings(house)).toEqual([...round, "mind:supervisor done", "mind:notes failed"]);
  expect(moments(framesOf(f))).toEqual(["turn", "turn"]);
}, 60000);
const opening = (wake: string[], by = "mind:notes", turn = "t", process?: string): Event => ({
  ...effect("mind-turn-opened", { turn, wake }, by, wake, process),
  id: "e4",
  seq: 4,
  at: 0,
});
it("reads who wrote the facts that woke the failed turn: only when all are its own does it stay asleep", () => {
  const policy: WakePolicy = {
    scope: { kind: "consciousness", actor: "mind:supervisor" },
    name: "supervisor",
    message: () => undefined,
    toolOf: () => undefined,
  };
  const failed = closed({ reason: "invalid" });
  const own = { ...closed({}, "mind:supervisor", 1), id: "e1" };
  const other = { ...closed({}, "ana", 3), id: "e3" };
  const wakes = (...history: Event[]) => supervisorWakes(policy, 2, failed, [...history, failed]);
  expect(wakes(own, opening(["e1"]))).toBe(false);
  expect(wakes(other, opening(["e3"]))).toBe(true);
  expect(wakes(own, other, opening(["e1", "e3"]))).toBe(true);
  // A fact the journal does not hold was not written by the supervisor, and a turn nothing woke is not its doing.
  expect(wakes(opening(["e1"]))).toBe(true);
  expect(wakes(own, opening([]))).toBe(true);
  // Only its lines are its doing: a journey it stopped is not, alone or beside a line of its own.
  const stop = { ...effect("journey-interrupted", { reason: "Sin visto" }, "mind:supervisor", [], "journey:j") };
  const stopped: Event = { ...stop, id: "e0", seq: 0, at: 0 };
  expect(wakes(stopped, opening(["e0"]))).toBe(true);
  expect(wakes(stopped, own, opening(["e0", "e1"]))).toBe(true);
  // Only the opening of that very turn counts, and a journey's cut turn wakes it whoever woke the journey.
  expect(wakes(own, opening(["e1"], "mind:notes", "other"))).toBe(true);
  const journey = { ...failed, process: "journey:j" };
  expect(supervisorWakes(policy, 2, journey, [own, opening(["e1"], "mind:notes", "t", "journey:j"), journey])).toBe(
    true,
  );
});
