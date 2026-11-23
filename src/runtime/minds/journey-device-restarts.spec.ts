// A notice still wakes its journey across a restart of the house; a stopped, retired or desisted journey is honest.
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
/** The journey starts the work and waits on its notice; when it wakes again it ends. */
const waiting: JourneyScript = (_, id, turn) =>
  turn === 1 ? answer([sendOn("Informe"), waitNotice(id)]) : answer([endJourney(id)]);
async function asked(journey: JourneyScript = waiting) {
  const rig = deviceMindFixture();
  rigs.push(rig);
  const house = await rig.open(journey);
  send(house, "mind:notes", "Mandá el informe");
  await flush(house);
  const id = journeyOf(house)?.id;
  const execution = id ? executionsOf(house, id)[0]?.execution : undefined;
  if (!id || !execution) throw new Error("journey");
  return { rig, house, id, execution };
}
const turnsOf = (house: RequestHouse, id: string) =>
  [...house.tools.state().house.minds.turns.values()].filter(turn => turn.opened.process === id).length;
it.each(["after", "before"] as const)(
  "a restart with the notice coming %s it still wakes the journey, once",
  async order => {
    const { rig, house, id, execution } = await asked();
    // Recorded, and the house goes down before the journey's turn runs: the wake is still owed after the restart.
    if (order === "before") expect(rig.announce(execution)).toBe("recorded");
    house.close();
    const again = await rig.open(waiting);
    if (order === "after") expect(rig.announce(execution)).toBe("recorded");
    await flush(again);
    expect(wakesOf(again, id)).toEqual([["journey-opened"], ["device-execution-notice"]]);
    expect(rig.frames.filter(frame => frame.includes(told))).toHaveLength(1);
    expect(journeyOf(again)?.closed?.data.outcome).toBe("done");
  },
  60000,
);
it("a notice recorded right after a restart, before the minds start, wakes the journey", async () => {
  const { rig, house, id, execution } = await asked();
  house.close();
  const again = await rig.open(waiting, () => expect(rig.announce(execution)).toBe("recorded"));
  await flush(again);
  expect(wakesOf(again, id)).toEqual([["journey-opened"], ["device-execution-notice"]]);
  expect(journeyOf(again)?.closed?.data.outcome).toBe("done");
}, 60000);
it.each(["notice", "retirement"] as const)(
  "a %s for a stopped journey is recorded and waits: its resumed turn reads it",
  async arrival => {
    const { rig, house, id, execution } = await asked();
    house.bus.emit(effect("journey-interrupted", { reason: "Pará" }, "mind:supervisor", [], id));
    await flush(house);
    // The consciousness heard what the stopped journey left running: its work, until its notice comes.
    const stop = rig.frames.find(frame => frame.includes("The supervisor stopped your journey")) ?? "";
    expect(stop).toContain("Left pending: notes outbox/send (vm).");
    if (arrival === "notice") expect(rig.announce(execution)).toBe("recorded");
    else house.devices.retire("ana", "vm");
    await flush(house);
    expect(turnsOf(house, id)).toBe(1);
    house.bus.emit(effect("journey-resumed", { note: "Seguí" }, "mind:notes", [], id));
    await flush(house);
    const kind = arrival === "notice" ? "device-execution-notice" : "device-retired";
    expect(wakesOf(house, id)).toEqual([["journey-opened"], [kind, "journey-resumed"]]);
    const resumed = rig.frames.find(frame => frame.includes("Your consciousness resumed this journey: Seguí")) ?? "";
    expect(resumed).toContain(arrival === "notice" ? told : "The device Linux was retired: the notice of the job");
    expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
  },
  60000,
);
it("a disconnection wakes nobody; the device's retirement wakes the journey waiting on it", async () => {
  const { rig, house, id } = await asked((frame, id, turn) => {
    if (turn === 1) return answer([sendOn("Informe"), waitNotice(id)]);
    // Woken by the retirement, a second wait on that notice comes back as a correction.
    return frame.includes("runs on a retired device") ? answer([endJourney(id)]) : answer([waitNotice(id)]);
  });
  rig.disconnect();
  await flush(house);
  expect(turnsOf(house, id)).toBe(1);
  house.devices.retire("ana", "vm");
  await flush(house);
  expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-retired"]]);
  const line =
    "The device Linux was retired: the notice of the job outbox/send → notes/outbox that this journey started";
  expect(rig.frames.filter(frame => frame.includes(line))).toHaveLength(2);
  expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
}, 60000);
it("a retirement during the journey's turn refuses its wait on that notice and still wakes it after", async () => {
  const { house, id } = await asked((frame, id, turn, call, house) => {
    if (turn > 1) return answer([endJourney(id)]);
    if (call === 1) return answer([sendOn("Informe")]);
    if (call === 2) {
      house.devices.retire("ana", "vm");
      return answer([waitNotice(id)]);
    }
    expect(frame).toContain("runs on a retired device: that notice will not come.");
    return answer([{ act: "wait", target: id, input: { what: "Mañana", until: Date.now() + 86_400_000 } }]);
  });
  expect(wakesOf(house, id)).toEqual([["journey-opened"], ["device-retired"]]);
  expect(journeyOf(house)?.closed?.data.outcome).toBe("done");
}, 60000);
it("a desisted journey wakes for nothing its device says", async () => {
  const { rig, house, id, execution } = await asked();
  const desist = { outcome: "desisted", summary: "No sigo", references: [] } as const;
  house.bus.emit(effect("journey-closed", desist, "mind:notes", [], id));
  expect(rig.announce(execution)).toBe("recorded");
  await flush(house);
  expect(turnsOf(house, id)).toBe(1);
}, 60000);
it("a restart that cuts the turn a notice woke says that notice again with the restart", async () => {
  let cut = true;
  const script: JourneyScript = (_, id, turn) => {
    if (turn === 1) return answer([sendOn("Informe"), waitNotice(id)]);
    return turn === 2 && cut ? new Promise(() => {}) : answer([endJourney(id)]);
  };
  const { rig, house, id, execution } = await asked(script);
  expect(rig.announce(execution, "lost")).toBe("recorded");
  await vi.waitFor(() => expect(turnsOf(house, id)).toBe(2));
  house.close();
  cut = false;
  const again = await rig.open(script);
  await flush(again);
  expect(wakesOf(again, id)).toEqual([["journey-opened"], ["device-execution-notice"], ["mind-turn-closed"]]);
  const last =
    rig.frames.find(frame => frame.includes("The house restarted during this journey's previous turn")) ?? "";
  expect(last).toContain(shortIds(`${told} (start: start:${execution}) was lost.`));
  expect(journeyOf(again)?.closed?.data.outcome).toBe("done");
}, 60000);
