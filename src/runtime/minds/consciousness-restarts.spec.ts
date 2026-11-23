// A restart that cuts a consciousness while it hears a journey's cut or stop wakes it again: no journey stays stuck.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { answer, history, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  deviceMindFixture,
  endJourney,
  flush,
  journeyOf,
  sendOn,
  waitNotice,
  type ConsciousScript,
  type JourneyScript,
} from "../../../tests/support/device-mind-fixture.ts";
const rigs: ReturnType<typeof deviceMindFixture>[] = [];
beforeEach(() =>
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("network forbidden");
    }),
  ),
);
afterEach(() => {
  rigs.splice(0).forEach(rig => rig.fixture.cleanup());
  vi.unstubAllGlobals();
});
/** The consciousness's turns after the thread's line, each as the kinds of the facts that woke it and how it closed. */
const consciousTurns = (house: RequestHouse) =>
  [...house.tools.state().house.minds.turns.values()]
    .filter(turn => turn.opened.by === "mind:notes" && !turn.opened.process)
    .slice(1)
    .map(turn => ({
      wake: history(house).flatMap(event => (turn.opened.data.wake.includes(event.id) ? [event.kind] : [])),
      closed: turn.closed?.data.reason ?? turn.closed?.data.outcome,
    }));
/** The consciousness hangs on the first wake that names `heard`, so the house goes down in its turn; once the house
 * is back it resumes the journey. */
function hearing(heard: string) {
  let hung = false;
  const conscious: ConsciousScript = (frame, house) => {
    const journey = journeyOf(house);
    if (!journey || journey.closed || !frame.includes(heard)) return answer();
    if (!hung) {
      hung = true;
      return new Promise(() => {});
    }
    return answer([{ act: "resume", target: journey.id, input: { note: "Probá otra vez" } }]);
  };
  const rig = deviceMindFixture(conscious);
  rigs.push(rig);
  return rig;
}
const hungTurn = (house: RequestHouse) =>
  [...house.tools.state().house.minds.turns.values()].some(turn => !turn.closed && !turn.opened.process);
it("a restart while the consciousness hears a cut wakes it again for it; its resume moves the journey", async () => {
  const journey: JourneyScript = (_, id, turn) => {
    if (turn === 1) throw new Error("provider down");
    return answer([endJourney(id)]);
  };
  const rig = hearing("A turn of the journey «Mandar el informe» was cut");
  const house = await rig.open(journey);
  send(house, "mind:notes", "Mandá el informe");
  await vi.waitFor(() => expect(hungTurn(house)).toBe(true), { timeout: 30000 });
  house.close();
  const again = await rig.open(journey);
  await flush(again);
  expect(consciousTurns(again)).toEqual([
    { wake: ["mind-turn-closed"], closed: "interrupted" },
    { wake: ["mind-turn-closed"], closed: "done" },
    { wake: ["journey-closed"], closed: "done" },
  ]);
  expect(journeyOf(again)?.closed?.data.outcome).toBe("done");
}, 60000);
it("a restart while the consciousness hears the supervisor's stop wakes it again for that stop", async () => {
  const journey: JourneyScript = (_, id, turn) =>
    turn === 1 ? answer([sendOn("Informe"), waitNotice(id)]) : answer([endJourney(id)]);
  const rig = hearing("The supervisor stopped your journey");
  const house = await rig.open(journey);
  send(house, "mind:notes", "Mandá el informe");
  await flush(house);
  const id = journeyOf(house)?.id ?? "";
  house.bus.emit(effect("journey-interrupted", { reason: "Pará" }, "mind:supervisor", [], id));
  await vi.waitFor(() => expect(hungTurn(house)).toBe(true), { timeout: 30000 });
  house.close();
  const again = await rig.open(journey);
  await flush(again);
  expect(consciousTurns(again)).toEqual([
    { wake: ["journey-interrupted"], closed: "interrupted" },
    { wake: ["journey-interrupted"], closed: "done" },
    { wake: ["journey-closed"], closed: "done" },
  ]);
  expect(journeyOf(again)?.closed?.data.outcome).toBe("done");
}, 60000);
