// A mind reads short references for long ids, and what it gives back with them reaches the whole id.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { answer, history, openWork } from "../../../tests/support/request-mind-fixture.ts";
import { currentTurn } from "../../../tests/support/request-mind-responder.ts";
import {
  framesOf,
  supervisedFixture,
  supervising,
  supervisor,
  think,
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
it("resumes and desists from a journey by its short reference and keeps whole ids in the references", async () => {
  const f = supervisedFixture();
  fixtures.push(f);
  const house = await f.open();
  f.prepare(house);
  const judge = supervisor(() => ({ outcome: "passed", text: "Sí" }));
  let step = 0;
  f.respond(frame => {
    if (supervising(frame)) return judge(frame);
    const turn = currentTurn(house);
    const journey = [...house.tools.state().house.journeys.values()][0];
    const until = Date.now() + 3_600_000;
    if (turn.process)
      return answer([
        { act: "wait", target: `journey:${turn.process.slice(8, 16)}`, input: { what: "Espero", until } },
      ]);
    if (!journey) return answer([openWork("Anotar")]);
    const short = `journey:${journey.id.slice(8, 16)}`;
    step++;
    if (step === 1) return answer([{ act: "resume", target: short, input: { note: "Seguí" } }]);
    if (step === 2) {
      const references = [short, journey.opened.slice(0, 8), "el hilo de ana"];
      return answer([{ act: "desist", target: short, input: { reason: "Ya no hace falta", references } }]);
    }
    return answer();
  });
  await think(house, "Anotá el mate");
  await think(house, "Seguí con eso");
  await think(house, "Dejalo");
  const journey = [...house.tools.state().house.journeys.values()][0];
  if (!journey) throw new Error("journey");
  const resumed = history(house).filter(event => event.kind === "journey-resumed" && event.process === journey.id);
  expect(resumed).toHaveLength(1);
  expect(journey.closed?.data).toMatchObject({
    outcome: "desisted",
    references: [journey.id, journey.opened, "el hilo de ana"],
  });
  const frames = framesOf(f).filter(frame => !supervising(frame));
  expect(frames.some(frame => frame.includes(`journey:${journey.id.slice(8, 16)}`))).toBe(true);
  for (const frame of frames) {
    expect(frame).not.toContain(journey.id);
    expect(frame).not.toMatch(/[0-9a-f]{64}/u);
  }
}, 60000);
