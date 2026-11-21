// A journey turn of several calls keeps the supervisor's moments: it reviews what leaves the house, then the end.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  end,
  framesOf,
  moments,
  notes,
  out,
  sent,
  supervisedFixture,
  supervising,
  supervisor,
  think,
  withSend,
} from "../../../tests/support/supervisor-responder.ts";
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
it("a world act without a continuation is reviewed, applied and told back; the end after it is reviewed", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  withSend(house);
  const judge = supervisor(() => ({ outcome: "passed", text: "Sigue" }));
  const said: string[] = [];
  f.respond(frame => {
    if (supervising(frame)) return judge(frame);
    said.push(frame);
    return notes(house, frame, (goal, shown, id) =>
      shown.includes("Resultados de los actos") ? [end(id)] : [out(goal)],
    );
  });
  await think(house, "Mandá el pedido");
  expect(moments(framesOf(f))).toEqual(["open", "world", "end", "learn"]);
  expect(sent(house)).toBe(1);
  const journey = [...house.tools.state().house.journeys.values()][0];
  expect(journey?.closed?.data.outcome).toBe("done");
  const turn = [...house.tools.state().house.minds.turns.values()].find(each => each.opened.process === journey?.id);
  expect(turn?.closed?.data).toMatchObject({ outcome: "done", calls: 4 });
  expect(said.filter(text => text.includes("1. outbox/send → notes/outbox: aceptado."))).toHaveLength(1);
});
