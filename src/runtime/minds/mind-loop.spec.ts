// Puts on record, through a running house, that two minds in an individual thread wake each other for as long as
// they answer: no guard, counter, timer or limit stops them, only their own judgement (22/11, unsigned).
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  requestMindFixture,
  answer,
  say,
  send,
  history,
  type RequestHouse,
} from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn, lineOf } from "../../../tests/support/request-mind-responder.ts";
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
const other = (actor: string) => (actor === "mind:notes" ? "assistant:ana" : "mind:notes");
/** The turns of the house in order: who thought and the ids of what woke it. */
const turns = (house: RequestHouse) =>
  [...house.tools.state().house.minds.turns.values()].map(turn => ({
    by: turn.opened.by,
    wake: turn.opened.data.wake,
  }));
it("22/11, unsigned: two minds that always answer in an individual thread wake each other without end", async () => {
  const f = requestMindFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  const rounds = 12;
  let thought = 0;
  // Each mind answers the other with a line, without naming it; only this script, not the house, stops them.
  f.respond(() => {
    const { by } = currentTurn(house);
    thought++;
    return thought > rounds ? answer() : answer([say(other(by), `Listo ${thought}`)]);
  });
  expect(send(house, "assistant:ana", "Empezá").status).toBe("accepted");
  await (await house.minds)?.flush();
  const said = history(house).flatMap(event => lineOf(event) ?? []);
  const run = turns(house);
  expect(said).toHaveLength(rounds + 1);
  expect(run).toHaveLength(rounds + 1);
  // Every line woke exactly the other mind of its thread, in the turn right after it.
  said.forEach((line, index) => {
    expect(run[index]).toEqual({ by: index === 0 ? "assistant:ana" : other(line.by), wake: [line.id] });
    expect(line.to).toBe(index === 0 ? "assistant:ana" : other(line.by));
  });
}, 60000);
