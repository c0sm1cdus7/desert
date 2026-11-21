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
it("only the supervisor's own turn a restart cut consumed nothing; a journey's own closure wakes it instead", () => {
  const ended = effect("journey-closed", { outcome: "done", summary: "Listo", references: [] }, actor, [], "j1");
  const cut = (by: string, reason?: "interrupted") => [
    effect("mind-turn-opened", { turn: "c1", wake: ["e2"] }, by, []),
    effect(
      "mind-turn-closed",
      { turn: "c1", outcome: "interrupted", calls: 1, applied: [], ...(reason ? { reason } : {}) },
      by,
      [],
    ),
  ];
  const supervisor: WakePolicy = {
    ...consciousness,
    scope: { kind: "consciousness", actor: "mind:supervisor" },
    wakes: e => e.kind === "journey-closed",
  };
  const woken = (scope: WakePolicy, history: readonly Event[]) =>
    pendingMindWakes([scope], history, 0).map(each => each.wake);
  expect(woken(supervisor, at([opened, ended, ...cut("mind:supervisor", "interrupted")]))).toEqual([["e2"]]);
  // A closure without a reason comes from before 21/11: what that turn consumed stays consumed.
  expect(woken(supervisor, at([opened, ended, ...cut("mind:supervisor")]))).toEqual([]);
  // Any other consciousness never repeats a turn a restart cut for anything but its journeys' cuts and stops.
  expect(woken(consciousness, at([opened, ended, ...cut(actor, "interrupted")]))).toEqual([]);
  const journeyTurn = effect("mind-turn-opened", { turn: "t1", wake: ["e1"] }, actor, [], "j1");
  const restarted = effect(
    "mind-turn-closed",
    { turn: "t1", outcome: "interrupted", calls: 1, applied: [], reason: "interrupted" },
    actor,
    [],
    "j1",
  );
  expect(woken(journey, at([opened, journeyTurn, restarted]))).toEqual([["e3"]]);
});
it("a consciousness turn a restart cut before it applied any act gives back its journeys' cuts and stops only", () => {
  const stop = effect("journey-interrupted", { reason: "Pará" }, "mind:supervisor", [], "j1");
  const own = (wake: string, applied: string[] = [], reason?: "interrupted") => [
    effect("mind-turn-opened", { turn: "c1", wake: [wake] }, actor, []),
    effect(
      "mind-turn-closed",
      { turn: "c1", outcome: "interrupted", calls: 1, applied, ...(reason ? { reason } : {}) },
      actor,
      [],
    ),
  ];
  const woken = (history: readonly Event[]) => pendingMindWakes([consciousness], history, 0).map(each => each.wake);
  const cutTurn = [opened, turn, closed({ reason: "call-limit" })];
  expect(woken(at([...cutTurn, ...own("e3", [], "interrupted")]))).toEqual([["e3"]]);
  expect(woken(at([opened, stop, ...own("e2", [], "interrupted")]))).toEqual([["e2"]]);
  // A turn that already applied an act heard what woke it: a resume, a desist or a line stays its answer.
  expect(woken(at([...cutTurn, ...own("e3", ["e9"], "interrupted")]))).toEqual([]);
  expect(woken(at([opened, stop, ...own("e2", ["e9"], "interrupted")]))).toEqual([]);
  // A resume is a control, not an act the turn applied: once the journey was resumed, its cut was answered.
  const resumed = effect("journey-resumed", { note: "Seguí" }, actor, [], "j1");
  const [hearing, restarted] = own("e3", [], "interrupted");
  if (!hearing || !restarted) throw new Error("turn");
  expect(woken(at([...cutTurn, hearing, resumed, restarted]))).toEqual([]);
  // A closure without a reason comes from before 21/11, and any other failure of the turn is no restart.
  expect(woken(at([...cutTurn, ...own("e3")]))).toEqual([]);
  const failed = effect(
    "mind-turn-closed",
    { turn: "c1", outcome: "failed", calls: 1, applied: [], reason: "http" },
    actor,
    [],
  );
  expect(woken(at([...cutTurn, effect("mind-turn-opened", { turn: "c1", wake: ["e3"] }, actor, []), failed]))).toEqual(
    [],
  );
});
