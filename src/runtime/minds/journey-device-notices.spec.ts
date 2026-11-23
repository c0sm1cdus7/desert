// A journey that started announcing work on a device wakes on its notice, in every order the notice can come.
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { effect } from "../../house/facts.ts";
import { answer, send, type RequestHouse } from "../../../tests/support/request-mind-fixture.ts";
import {
  deviceMindFixture,
  endJourney,
  executionsOf,
  flush,
  journeyOf,
  sendOn,
  told,
  waitNotice,
  wakesOf,
  type JourneyScript,
} from "../../../tests/support/device-mind-fixture.ts";
import { shortIds } from "./mind-references.ts";
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
/** Opens the house, asks the notes mind for the report, and lets the journey's first turn run. */
async function asked(journey: (rig: ReturnType<typeof deviceMindFixture>) => JourneyScript) {
  const rig = deviceMindFixture();
  rigs.push(rig);
  const house = await rig.open(journey(rig));
  send(house, "mind:notes", "Mandá el informe");
  await flush(house);
  const id = journeyOf(house)?.id;
  if (!id) throw new Error("journey");
  return { rig, house, id };
}
const executions = (house: RequestHouse, id: string) => executionsOf(house, id).map(each => each.execution);
const invalid = (house: RequestHouse, id: string) =>
  [...house.tools.state().house.minds.turns.values()]
    .filter(turn => turn.opened.process === id)
    .map(turn => turn.invalid.map(event => event.data.faults[0]?.code));
it("wakes on a notice that comes after its wait, and says which work it was and how it ended", async () => {
  const { rig, house, id } = await asked(
    () => (_, id, turn) => (turn === 1 ? answer([sendOn("Informe"), waitNotice(id)]) : answer([endJourney(id)])),
  );
  expect(journeyOf(house)?.waiting).toEqual({ what: "El envío", on: "notice" });
  const [execution] = executionsOf(house, id);
  expect(execution).toMatchObject({ announces: true, status: "accepted" });
  expect(rig.announce(execution?.execution ?? "", "failed")).toBe("recorded");
  await flush(house);
  expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-execution-notice"]]);
  const frame = rig.frames.find(frame => frame.includes(told)) ?? "";
  expect(frame).toContain(
    shortIds(`(start: start:${execution?.execution ?? ""}) failed. Notice reference: aviso:failed.`),
  );
  expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
}, 60000);
it("accepts a wait on a notice recorded earlier in the same turn, and wakes right after that turn", async () => {
  const { rig, house, id } = await asked(rig => (_, id, turn, call, house) => {
    if (turn > 1) return answer([endJourney(id)]);
    if (call === 1) return answer([sendOn("Informe")]);
    // Between the start and the wait the device already announced: the notice is unread, so the wait stands.
    const [execution = ""] = executions(house, id);
    expect(rig.announce(execution)).toBe("recorded");
    return answer([waitNotice(id)]);
  });
  expect(invalid(house, id)).toEqual([[], []]);
  expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-execution-notice"]]);
  expect(rig.frames.filter(frame => frame.includes(told))).toHaveLength(1);
  expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
}, 60000);
it("accepts a wait answered with a start whose notice came before its result, held until written", async () => {
  const { house, id } = await asked(rig => {
    rig.onStart(request => {
      // The device answers the start late: its notice comes first and the house holds it until the result.
      expect(rig.announce(request.execution)).toBe("held");
      return { status: "accepted", reference: `start:${request.execution}` };
    });
    return (_, id, turn) => (turn === 1 ? answer([sendOn("Informe"), waitNotice(id)]) : answer([endJourney(id)]));
  });
  expect(invalid(house, id)).toEqual([[], []]);
  expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-execution-notice"]]);
  expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
}, 60000);
it.each([
  ["first", "second"],
  ["second", "first"],
] as const)(
  "two works, one notice each in a turn of its own: the %s one first",
  async (one, two) => {
    const { rig, house, id } = await asked(() => (frame, id, turn) => {
      if (turn === 1) return answer([sendOn("Uno"), sendOn("Dos"), waitNotice(id)]);
      if (turn === 2) return answer([waitNotice(id, "El otro envío")]);
      // Both notices were read: nothing will announce, so the wait comes back as a correction and the journey ends.
      return frame.includes("nothing will give notice") ? answer([endJourney(id)]) : answer([waitNotice(id, "Nada")]);
    });
    const [first = "", second = ""] = executions(house, id);
    const order = { first, second };
    expect(rig.announce(order[one])).toBe("recorded");
    await flush(house);
    expect(journeyOf(house)?.waiting?.what).toBe("El otro envío");
    expect(rig.announce(order[two], "cancelled")).toBe("recorded");
    await flush(house);
    expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-execution-notice"], ["device-execution-notice"]]);
    expect(invalid(house, id)).toEqual([[], [], ["wait"]]);
    expect(rig.frames.filter(frame => frame.includes(told))).toHaveLength(3);
    expect(rig.frames.some(frame => frame.includes("was cancelled. Notice reference: aviso:cancelled."))).toBe(true);
    expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
  },
  60000,
);
it("an execution started by a person, outside any journey, wakes no mind", async () => {
  const { rig, house, id } = await asked(() => (_, id) => answer([endJourney(id)]));
  const turns = () => house.tools.state().house.minds.turns.size;
  house.bus.emit(effect("attended", { target: "notes/outbox" }, "ana"));
  const by = house.tools.act(sendOn("Mío"), house.tools.state().through, "ana");
  expect(by).not.toMatchObject({ status: "rejected" });
  await flush(house);
  const [execution] = [...house.tools.state().house.devices.executions.values()].filter(each => !each.journey);
  expect(execution?.actor).toBe("ana");
  // Her act on the notes tool woke its program mind, notes does not talk; her work's notice wakes nobody.
  const before = turns();
  expect(rig.announce(execution?.execution ?? "")).toBe("recorded");
  await flush(house);
  expect(turns()).toBe(before);
  expect(journeyOf(house)?.id).toBe(id);
}, 60000);
