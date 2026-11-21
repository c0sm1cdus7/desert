// Proves what wakes a journey and its consciousness: facts of the new shape only, once, and the oldest wake first.
import { expect, it } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
import { pendingMindWakes } from "./mind-schedule.ts";
const actor = "mind:notes";
const policy = (scope: WakePolicy["scope"]): WakePolicy => ({
  scope,
  name: "Notas",
  message: () => undefined,
  toolOf: () => undefined,
});
const consciousness = policy({ kind: "consciousness", actor });
const journey = policy({ kind: "journey", actor, process: "j1", kit: [] });
const at = (emissions: readonly HouseEmission[]): Event[] =>
  emissions.map((emission, index) => ({ ...emission, id: `e${index + 1}`, seq: index + 1, at: 0 }));
const opened = effect(
  "journey-opened",
  { version: 2, goal: "Anotar", kit: { version: 2, selections: [] } },
  actor,
  [],
  "j1",
);
const turn = effect("mind-turn-opened", { turn: "t1", wake: [] }, actor, [], "j1");
const closed = (data: Partial<HouseEmission<"mind-turn-closed">["data"]>) =>
  effect("mind-turn-closed", { turn: "t1", outcome: "failed", calls: 12, applied: [], ...data }, actor, [], "j1");
const wakes = (scope: WakePolicy, history: readonly Event[]) =>
  history.filter(event => mindWakeDecision(scope, event, history, 0)).map(event => event.kind);
it("a journey turn cut for any reason but a restart wakes its consciousness, not the journey", () => {
  const history = at([opened, turn, closed({ reason: "call-limit" })]);
  expect(wakes(consciousness, history)).toEqual(["mind-turn-closed"]);
  expect(wakes(journey, history)).toEqual([]);
  const uncertain = at([opened, turn, closed({ outcome: "interrupted", reason: "uncertain" })]);
  expect(wakes(consciousness, uncertain)).toEqual(["mind-turn-closed"]);
});
it("a closure without a reason, written before 21/11, wakes nobody: nothing historical comes back on deploy", () => {
  const failed = at([opened, turn, closed({})]);
  expect(wakes(consciousness, failed)).toEqual([]);
  const interrupted = at([opened, turn, closed({ outcome: "interrupted" })]);
  expect(wakes(consciousness, interrupted)).toEqual([]);
  expect(wakes(journey, interrupted)).toEqual([]);
});
it("the consciousness does not wake for a journey that went on or closed after its cut turn", () => {
  const later = effect("mind-turn-opened", { turn: "t2", wake: [] }, actor, [], "j1");
  expect(wakes(consciousness, at([opened, turn, closed({ reason: "invalid" }), later]))).toEqual([]);
  const ended = effect("journey-closed", { outcome: "desisted", summary: "No", references: [] }, actor, [], "j1");
  expect(wakes(consciousness, at([opened, turn, closed({ reason: "invalid" }), ended]))).toEqual(["journey-closed"]);
});
it("a restart wakes the same journey through its closure, and its consciousness only through its own facts", () => {
  const history = at([opened, turn, closed({ outcome: "interrupted", reason: "interrupted" })]);
  expect(wakes(journey, history)).toEqual(["mind-turn-closed"]);
  expect(wakes(consciousness, history)).toEqual([]);
});
it("a resume wakes the journey it names, once its consciousness wrote it", () => {
  const done = effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 1, applied: [] }, actor, [], "j1");
  const resumed = effect("journey-resumed", { note: "Mirá el resultado" }, actor, [], "j1");
  expect(wakes(journey, at([opened, turn, done, resumed]))).toEqual(["journey-resumed"]);
  expect(wakes(consciousness, at([opened, turn, done, resumed]))).toEqual([]);
});
it("the schedule runs the oldest pending wake first, not the first mind in its list", () => {
  const other = policy({ kind: "consciousness", actor: "mind:agenda" });
  const history = at([
    effect(
      "journey-opened",
      { version: 2, goal: "Agendar", kit: { version: 2, selections: [] } },
      "mind:agenda",
      [],
      "j2",
    ),
    opened,
  ]);
  const order = (policies: readonly WakePolicy[]) =>
    pendingMindWakes(policies, history, 0).map(each => each.scope.process ?? each.scope.actor);
  const journeys = [journey, policy({ kind: "journey", actor: "mind:agenda", process: "j2", kit: [] })];
  expect(order(journeys)).toEqual(["j2", "j1"]);
  expect(order([...journeys].reverse())).toEqual(["j2", "j1"]);
  expect(order([consciousness, other])).toEqual([]);
});
it("a wait written after its turn closed, as the old 90-second follow-up did, wakes nobody", () => {
  const done = effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 1, applied: [] }, actor, [], "j1");
  const waiting = effect("journey-waiting", { what: "Sigo", until: 0 }, actor, ["e2"], "j1");
  expect(wakes(journey, at([opened, turn, done, waiting]))).toEqual([]);
  expect(pendingMindWakes([journey, consciousness], at([opened, turn, done, waiting]), 100_000)).toEqual([]);
});
it("a wait the mind chose inside its turn wakes its journey once its hour comes", () => {
  const done = effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 1, applied: [] }, actor, [], "j1");
  const waiting = effect("journey-waiting", { what: "Sigo", until: 0 }, actor, ["e2", "e1"], "j1");
  expect(wakes(journey, at([opened, turn, waiting, done]))).toEqual(["journey-waiting"]);
  const loose = effect("journey-waiting", { what: "Sigo", until: 0 }, actor, ["e1"], "j1");
  expect(wakes(journey, at([opened, turn, done, loose]))).toEqual(["journey-waiting"]);
});
