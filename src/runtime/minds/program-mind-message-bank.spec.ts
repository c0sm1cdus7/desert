// Runs three talk-line scenes through the offline bank; a live turn rejects invalid or unauthorized work.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  requestMindFixture,
  answer,
  openWork,
  finishWork,
  say,
  send,
} from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, respondToNotes } from "../../../tests/support/request-mind-responder.ts";
import { requestKit } from "../../../tests/support/request-program.ts";
import type { ProgramMindScene } from "../../tools/minds/program-mind-cases.ts";
const fixtures: ReturnType<typeof requestMindFixture>[] = [];
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
const bodies = ["Mañana tomamos mate con Martín", "Return the books on Saturday", "Water the basil on Sunday"];
function scene(index: number): ProgramMindScene {
  const body = bodies[index];
  if (!body) throw new Error("body");
  return {
    given: Array.from({ length: [0, 1, 40][index] ?? 0 }, () => ({
      layer: "program",
      kind: "notes/imported",
      data: { body: "Old unrelated note" },
      by: "bank",
      cause: [],
    })),
    kit: requestKit,
    when: say("mind:notes", body),
    check: events => {
      const facts = events.filter(e => e.layer === "program" && e.kind === "notes/stored");
      const opened = events.filter(e => e.layer === "house" && e.kind === "journey-opened");
      const closed = events.filter(e => e.layer === "house" && e.kind === "journey-closed");
      const acts = events.filter(e => e.layer === "house" && e.kind === "act" && e.by === "mind:notes");
      return (
        facts.length === 1 &&
        JSON.stringify(facts[0]?.data) === JSON.stringify({ body }) &&
        facts[0]?.by === "mind:notes" &&
        opened.length === 1 &&
        closed.length === 1 &&
        closed[0]?.data.outcome === "done" &&
        acts.length === 1 &&
        acts[0]?.process === opened[0]?.process &&
        facts[0].process === opened[0]?.process &&
        events.some(
          e =>
            e.layer === "house" &&
            e.kind === "act-result" &&
            e.data.act === acts[0]?.id &&
            e.data.status === "accepted",
        )
      );
    },
  };
}
it("passes three distinct talk-line contexts with text fields and isolated journeys", async () => {
  const f = requestMindFixture([scene(0), scene(1), scene(2)]);
  fixtures.push(f);
  const seen: string[] = [];
  f.respond(frame => {
    const body = bodies.find(body => frame.includes(body));
    if (!body) throw new Error("body");
    const journey = frame.match(/^Alcance:\nmind:notes \/ (journey:[a-f0-9-]+)/)?.[1];
    if (journey) {
      seen.push(body);
      return answer(finishWork(journey, body), "Working");
    }
    return answer(frame.includes("Escena:\nWorking") ? [] : [openWork(body)], "Working");
  });
  const house = await f.open(false);
  expect(f.transport).not.toHaveBeenCalled();
  await f.bank(house);
  expect(seen).toEqual(bodies);
  expect(f.transport).toHaveBeenCalledTimes(9);
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  expect(house.tools.state().house.journeys.size).toBe(0);
  const evidence = house.journal.replay<boolean[]>([], (values, event) =>
    event.kind === "mind-bank-tested" ? [...values, event.data.result.passed] : values,
  );
  expect(evidence).toEqual([true]);
  expect(house.tools.state().house.mindAssignments.get("mind:notes")).toMatchObject({
    card: "claude-haiku-5-5",
    version: "high",
  });
});
it.each([
  ["blank", { body: " " }],
  ["long", { body: "x".repeat(121) }],
  ["extra", { extra: true }],
  ["date", { date: "2026-02-30" }],
  ["precision", { amount: 1.2345 }],
])("the full action schema rejects %s even when provider constraints were reduced", async (_name, extra) => {
  const f = requestMindFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  f.respond(() => {
    const turn = currentTurn(house);
    return turn.process ? answer(finishWork(turn.process, "Remember", extra)) : respondToNotes(house);
  });
  expect(send(house, "mind:notes", "Remember").status).toBe("accepted");
  await (await house.minds)?.flush();
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  expect([...house.tools.state().house.minds.turns.values()].some(t => t.closed?.data.outcome === "failed")).toBe(true);
  expect(house.tools.state().house.journeys.size).toBe(1);
});
it("does not certify a card when one of its three talk-line scenes fails", async () => {
  const f = requestMindFixture([scene(0), { ...scene(1), check: () => false }, scene(2)]);
  fixtures.push(f);
  f.respond(frame => {
    const body = bodies.find(body => frame.includes(body));
    if (!body) throw new Error("body");
    const journey = frame.match(/^Alcance:\nmind:notes \/ (journey:[a-f0-9-]+)/)?.[1];
    return journey
      ? answer(finishWork(journey, body), "Working")
      : answer(frame.includes("Escena:\nWorking") ? [] : [openWork(body)], "Working");
  });
  const house = await f.open(false);
  await f.bank(house);
  expect(house.tools.state().house.mindAssignments.has("mind:notes")).toBe(false);
  expect(house.tools.state().tools.notes.notes).toEqual([]);
  const evidence = house.journal.replay<boolean[]>([], (values, event) =>
    event.kind === "mind-bank-tested" ? [...values, event.data.result.passed] : values,
  );
  expect(evidence.length).toBeGreaterThan(0);
  expect(evidence.every(passed => !passed)).toBe(true);
});
