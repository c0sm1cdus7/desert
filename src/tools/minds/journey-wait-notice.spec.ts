// A journey waits on a device's notice only while it is owed one; without an hour it arms no clock.
import { expect, it } from "vitest";
import type { HouseEmission, HouseEvent } from "../../house/facts.ts";
import { journeyStep, type Journeys } from "../../house/minds/journey-state.ts";
import { clockStep, type Deadlines } from "../../journal/clock.ts";
import { turnLimits, type TurnContext } from "./mind-contract.ts";
import {
  endJourney,
  JourneyNoticeRefused,
  openJourney,
  waitJourney,
  type JourneyControlContext,
  type JourneyControlState,
  type NoticeWait,
} from "./journey-controls.ts";
const actor = "assistant:beto";
const kit = [{ tool: "notes", acts: ["write"] }];
function rig() {
  const events: HouseEvent[] = [];
  let clock: Deadlines = new Map();
  let owed: NoticeWait = "none";
  const state: JourneyControlState & { journeys: Journeys } = {
    journeys: new Map(),
    kit,
    active: true,
    pending: [],
    through: 0,
    now: 1000,
    rulesVersion: "r1",
    notices: () => owed,
  };
  const turn: TurnContext = {
    id: "t1",
    scope: { kind: "consciousness", actor },
    language: "es",
    wake: ["cause"],
    through: 0,
    limits: turnLimits,
    usage: { calls: 0, corrections: 0, consultations: 0 },
  };
  const apply = (facts: readonly HouseEmission[]) => {
    for (const fact of facts) {
      const event = { ...fact, id: `e${events.length + 1}`, seq: events.length + 1, at: state.now };
      Object.assign(state, { journeys: journeyStep(state.journeys, event), through: event.seq });
      clock = clockStep(clock, event);
      events.push(event);
    }
  };
  const facts = openJourney({ turn, cause: ["cause"], state: () => state }, { goal: "Correr el trabajo", kit });
  apply(facts);
  const process = facts[0]?.process ?? "";
  const context: JourneyControlContext = {
    turn: { ...turn, scope: { kind: "journey", actor, process, kit } },
    cause: ["cause"],
    state: () => state,
  };
  const owe = (next: NoticeWait) => {
    owed = next;
  };
  return { state, context, apply, events, owe, process, clock: () => clock };
}
it("refuses a wait on a notice that will not come, and says whether the device was retired", () => {
  const r = rig();
  const refusal = (owed: NoticeWait) => {
    r.owe(owed);
    try {
      waitJourney(r.context, { what: "El trabajo", on: "notice" });
    } catch (error) {
      return error instanceof JourneyNoticeRefused ? { retired: error.retired } : error;
    }
    return "accepted";
  };
  expect(refusal("none")).toEqual({ retired: false });
  expect(refusal("retired")).toEqual({ retired: true });
  expect(refusal("owed")).toBe("accepted");
  expect(r.events).toHaveLength(1);
});
it("waits on a notice without an hour, arms no clock, and cancels the hour a previous wait armed", () => {
  const r = rig();
  r.owe("owed");
  const facts = waitJourney(r.context, { what: "El trabajo", on: "notice" });
  expect(facts.map(fact => fact.kind)).toEqual(["journey-waiting"]);
  r.apply(facts);
  expect(r.state.journeys.get(r.process)?.waiting).toEqual({ what: "El trabajo", on: "notice" });
  expect(r.clock().size).toBe(0);
  expect(() => waitJourney(r.context, { what: "El trabajo", on: "notice", until: 1000 })).toThrow("until");
  expect(() => waitJourney(r.context, { what: "El trabajo", on: "later" })).toThrow("journey.wait.input/on");
  expect(() => waitJourney(r.context, { what: "El trabajo" })).toThrow("journey.wait.input/until");
  r.apply(waitJourney(r.context, { what: "Con hora", on: "notice", until: 2000 }));
  expect(r.clock().get(r.process)?.at).toBe(2000);
  const plain = waitJourney(r.context, { what: "Sin hora", on: "notice" });
  expect(plain.map(fact => fact.kind)).toEqual(["journey-waiting", "wake-at"]);
  r.apply(plain);
  expect(r.clock().size).toBe(0);
  // The closing has no hour left to cancel.
  expect(endJourney(r.context, { summary: "Listo", references: [] }).map(fact => fact.kind)).toEqual([
    "journey-closed",
  ]);
  expect(r.events.reduce(journeyStep, new Map())).toEqual(r.state.journeys);
});
