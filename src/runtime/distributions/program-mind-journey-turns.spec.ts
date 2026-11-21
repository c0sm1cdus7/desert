// A journey turn goes on until its last act says how; a cut wakes its consciousness, which resumes or desists.
import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { programMindFixture } from "../../../tests/support/program-mind-fixture.ts";
import {
  addAct,
  journeyOf,
  messagesOf,
  openAct,
  script,
  turnsOf,
  waitAct,
  type Seen,
} from "../../../tests/support/journey-turn-script.ts";
const fixtures: ReturnType<typeof programMindFixture>[] = [];
afterEach(() => fixtures.splice(0).forEach(f => f.cleanup()));
async function run(answers: Parameters<typeof script>[2]) {
  const f = programMindFixture();
  fixtures.push(f);
  const house = await f.open();
  const seen = script(f, house, answers);
  f.wake(house);
  await (await house.minds)?.flush();
  return { house, seen, journey: journeyOf(house) };
}
const opensOnce = ({ call }: Seen) => (call === 1 ? [openAct] : []);
it("several acts in one answer that ends with a continuation close the turn in one call", async () => {
  const { house, seen, journey } = await run({
    consciousness: opensOnce,
    journey: ({ journey }) => [addAct, addAct, waitAct(journey ?? "")],
  });
  expect(seen.filter(each => each.journey)).toHaveLength(1);
  expect(house.tools.state().tools.notas.count).toBe(3);
  expect(turnsOf(house, journey?.id).map(turn => turn.closed?.data)).toMatchObject([
    { outcome: "done", calls: 1, applied: [expect.any(String), expect.any(String), expect.any(String)] },
  ]);
  expect(turnsOf(house, journey?.id)[0]?.closed?.data.reason).toBeUndefined();
});
it("the call limit ends the turn failed, says so, and wakes the consciousness once", async () => {
  const { house, seen, journey } = await run({ consciousness: opensOnce, journey: () => [addAct] });
  expect(seen.filter(each => each.journey)).toHaveLength(12);
  expect(house.tools.state().tools.notas.count).toBe(13);
  expect(turnsOf(house, journey?.id).map(turn => turn.closed?.data)).toMatchObject([
    { outcome: "failed", calls: 12, reason: "call-limit" },
  ]);
  const woke = seen.filter(each => !each.journey);
  expect(woke).toHaveLength(2);
  expect(woke[1]?.changing).toContain(
    "Se cortó un turno del journey «Anotar»: El turno llegó al límite de doce llamadas sin decir cómo sigue.",
  );
  expect(journey?.closed).toBeUndefined();
});
it("an answer with no act, no continuation and no consultation goes back as «decí cómo seguís»", async () => {
  const { house, seen, journey } = await run({
    consciousness: opensOnce,
    journey: ({ call, journey }) => (call === 1 ? [] : [waitAct(journey ?? "")]),
  });
  const turn = turnsOf(house, journey?.id)[0];
  expect(turn?.invalid.map(event => event.data.faults)).toEqual([[{ code: "continuation", path: "/acts" }]]);
  expect(turn?.closed?.data).toMatchObject({ outcome: "done", calls: 2 });
  const second = seen.filter(each => each.journey)[1];
  if (!second) throw new Error("second call");
  expect(messagesOf(second).at(-1)?.content).toContain("Un journey sigue hasta decir cómo sigue");
});
it("a continuation before the last act is corrected before any act runs", async () => {
  const { house, journey } = await run({
    consciousness: opensOnce,
    journey: ({ call, journey }) => (call === 1 ? [waitAct(journey ?? ""), addAct] : [waitAct(journey ?? "")]),
  });
  expect(house.tools.state().tools.notas.count).toBe(1);
  expect(turnsOf(house, journey?.id)[0]?.invalid.map(event => event.data.faults)).toEqual([
    [{ code: "continuation", path: "/acts/0" }],
  ]);
});
it("the consciousness resumes a cut journey: the journey wakes and reads the note in words", async () => {
  const { house, seen, journey } = await run({
    consciousness: ({ call, opened }) => {
      if (call !== 2) return opensOnce({ call, changing: "", body: "" });
      return [{ act: "resume", target: opened ?? "", input: { note: "Probá otra vez" } }];
    },
    journey: ({ call, journey }) => {
      if (call === 1) throw new Error("provider down");
      return [waitAct(journey ?? "")];
    },
  });
  const turns = turnsOf(house, journey?.id);
  expect(turns.map(turn => turn.closed?.data.outcome)).toEqual(["interrupted", "done"]);
  expect(seen.filter(each => each.journey)[1]?.changing).toContain(
    "Tu consciencia retomó este journey: Probá otra vez",
  );
  expect(house.tools.state().house.journeys.get(journey?.id ?? "")?.resumed).toBe("Probá otra vez");
});
it("the consciousness desists from a cut journey with its reason, and nothing else wakes it", async () => {
  const { house, seen, journey } = await run({
    consciousness: seen =>
      seen.call === 2
        ? [{ act: "desist", target: seen.opened ?? "", input: { reason: "No hace falta", references: [] } }]
        : opensOnce(seen),
    journey: () => {
      throw new Error("provider down");
    },
  });
  expect(house.tools.state().house.journeys.get(journey?.id ?? "")?.closed?.data).toMatchObject({
    outcome: "desisted",
    summary: "No hace falta",
  });
  expect(turnsOf(house, journey?.id)).toHaveLength(1);
  // It woke for the cut, then once more when its journey closed: the closure is its own fact, as before.
  expect(seen.filter(each => !each.journey)).toHaveLength(3);
});
it("a journey frame keeps room for its turn's conversation, so a long thread still lets the turn go on", async () => {
  const { house, seen, journey } = await run({
    consciousness: opensOnce,
    journey: ({ call, journey }) => (call === 2 ? [addAct] : [waitAct(journey ?? "")]),
  });
  if (!journey) throw new Error("journey");
  house.bus.together(() => {
    for (let index = 0; index < 15; index++) {
      const turn = `old-${index}`;
      house.bus.emit(effect("mind-turn-opened", { turn, wake: [] }, "mind:notas", [], journey.id));
      house.bus.emit(
        effect("mind-scene", { turn, text: `${index} ${"x".repeat(3900)}` }, "mind:notas", [], journey.id),
      );
      house.bus.emit(
        effect("mind-turn-closed", { turn, outcome: "done", calls: 1, applied: [] }, "mind:notas", [], journey.id),
      );
    }
  });
  house.bus.emit(effect("journey-resumed", { note: "Seguí" }, "mind:notas", [], journey.id));
  await (await house.minds)?.flush();
  const calls = seen.filter(each => each.journey === journey.id);
  expect(calls).toHaveLength(3);
  expect(calls[1]?.changing).toContain("Omitido:");
  expect(turnsOf(house, journey.id).at(-1)?.closed?.data).toMatchObject({ outcome: "done", calls: 2 });
});
