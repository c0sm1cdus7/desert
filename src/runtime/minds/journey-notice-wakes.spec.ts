// Proves who a device's notice and a device's retirement wake: only the journey that started the work, once.
import { expect, it } from "vitest";
import { effect, type HouseEmission } from "../../house/facts.ts";
import { emptyDevices, deviceStep } from "../../house/devices/device-state.ts";
import { emptyHouse, type House } from "../../house/members.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
import { pendingMindWakes } from "./mind-schedule.ts";
import { noticeWait } from "./journey-notices.ts";
const actor = "mind:agents";
const policy = (scope: WakePolicy["scope"]): WakePolicy => ({
  scope,
  name: "Agentes",
  message: () => undefined,
  toolOf: () => undefined,
  talks: false,
});
const consciousness = policy({ kind: "consciousness", actor });
const journey = policy({ kind: "journey", actor, process: "j1", kit: [] });
const other = policy({ kind: "journey", actor, process: "j2", kit: [] });
const at = (emissions: readonly HouseEmission[]): Event[] =>
  emissions.map((emission, index) => ({ ...emission, id: `e${index + 1}`, seq: index + 1, at: 0 }));
const kit = { version: 2 as const, selections: [] };
const opened = (process: string) => effect("journey-opened", { version: 2, goal: "Correr", kit }, actor, [], process);
const turn = (id: string, process = "j1") => effect("mind-turn-opened", { turn: id, wake: [] }, actor, [], process);
const done = (id: string, process = "j1") =>
  effect("mind-turn-closed", { turn: id, outcome: "done", calls: 1, applied: [] }, actor, [], process);
const base = { actor, program: "agents", action: "claude/start", device: "vm", connection: "c1" };
const started = (execution: string, process?: string, announces = true) =>
  effect(
    "device-execution-started",
    { ...base, execution, ...(process ? { journey: process } : {}), ...(announces ? { announces: true } : {}) },
    actor,
    [execution],
    process,
  );
const result = (execution: string, process?: string) =>
  effect("device-execution-result", { execution, status: "accepted", reference: `r:${execution}` }, actor, [], process);
const notice = (execution: string, process?: string) =>
  effect("device-execution-notice", { execution, status: "finished", reference: `n:${execution}` }, actor, [], process);
const retired = effect("device-retired", { device: "vm" }, "franco");
const waitOn = effect("journey-waiting", { what: "El trabajo", on: "notice" }, actor, ["e2"], "j1");
const wakes = (scope: WakePolicy, history: readonly Event[]) =>
  history.filter(event => mindWakeDecision(scope, event, history, 0)).map(event => event.kind);
/** The device fold of these facts, as the house keeps it, beside the registered device "vm". */
function devicesOf(history: readonly Event[]): House["devices"] {
  const registered = { id: "vm", owner: "martin", name: "Linux", publicKey: "k", accepted: true, retired: false };
  let house: House = {
    ...emptyHouse,
    admin: "franco",
    grants: new Map([["franco", []]]),
    devices: { ...emptyDevices, devices: new Map([["vm", { ...registered, inventory: [] }]]) },
  };
  for (const event of history) if (event.layer === "house") house = deviceStep(house, event);
  return house.devices;
}
it("a notice wakes only the journey that started the work, whatever it waited on, once its turn closed", () => {
  const plain = effect("journey-waiting", { what: "Hasta mañana", until: 9e12 }, actor, ["e2"], "j1");
  for (const waiting of [waitOn, plain]) {
    const facts = [opened("j1"), turn("t1"), started("x1", "j1"), result("x1", "j1"), waiting, done("t1")];
    const noticed = at([...facts, notice("x1", "j1")]);
    expect(wakes(journey, noticed)).toEqual(["device-execution-notice"]);
    expect(wakes(consciousness, noticed)).toEqual([]);
    expect(wakes(other, noticed)).toEqual([]);
  }
  // No wait at all: the notice landed while the turn was open and the turn ended without waiting.
  const open = [opened("j1"), turn("t1"), started("x1", "j1"), result("x1", "j1"), notice("x1", "j1")];
  expect(pendingMindWakes([journey], at(open), 0)).toEqual([]);
  const closed = at([...open, done("t1")]);
  expect(pendingMindWakes([journey], closed, 0).map(wake => wake.wake)).toEqual([["e5"]]);
});
it("an execution started outside a journey wakes nobody, and a closed or later-turned journey does not wake", () => {
  const loose = at([started("x1"), result("x1"), notice("x1")]);
  for (const scope of [journey, consciousness]) expect(wakes(scope, loose)).toEqual([]);
  const ended = effect("journey-closed", { outcome: "desisted", summary: "No", references: [] }, actor, [], "j1");
  const after = at([opened("j1"), started("x1", "j1"), result("x1", "j1"), ended, notice("x1", "j1")]);
  expect(wakes(journey, after)).toEqual([]);
  const read = at([opened("j1"), started("x1", "j1"), result("x1", "j1"), notice("x1", "j1"), turn("t2")]);
  expect(wakes(journey, read)).toEqual([]);
});
it("a device a person retired wakes each journey with announcing work on it still without its notice", () => {
  const history = at([
    ...["j1", "j2", "j3"].flatMap(process => [opened(process), turn(process, process), done(process, process)]),
    ...[started("x1", "j1"), result("x1", "j1"), started("x2", "j2"), result("x2", "j2"), notice("x2", "j2")],
    ...[started("x3", "j3", false), result("x3", "j3"), retired],
  ]);
  expect(wakes(journey, history)).toEqual(["device-retired"]);
  // Its work already announced how it ended: its notice wakes it, the retirement does not.
  expect(wakes(other, history)).toEqual(["device-execution-notice"]);
  expect(wakes(policy({ kind: "journey", actor, process: "j3", kit: [] }), history)).toEqual([]);
  expect(wakes(consciousness, history)).toEqual([]);
  // A disconnection is transport, not a fact any mind waits for.
  const cut = effect("device-disconnected", { device: "vm", connection: "c1", reason: "corte" }, "host");
  const work = [opened("j1"), turn("t1"), started("x1", "j1"), result("x1", "j1"), done("t1")];
  expect(wakes(journey, at([...work, cut]))).toEqual([]);
});
it("a journal from before the notices wakes nobody: no announcing execution, no notice, no wait on one", () => {
  const history = at([
    opened("j1"),
    turn("t1"),
    started("x1", "j1", false),
    result("x1", "j1"),
    effect("journey-waiting", { what: "Sigo", until: 9e12 }, actor, ["e2"], "j1"),
    effect("mind-turn-closed", { turn: "t1", outcome: "done", calls: 1, applied: [] }, actor, [], "j1"),
    started("x2", undefined, false),
    effect("device-execution-unknown", { execution: "x2", reason: "corte" }, actor),
    effect("device-disconnected", { device: "vm", connection: "c1", reason: "corte" }, "host"),
    retired,
  ]);
  expect(pendingMindWakes([journey, consciousness, other], history, Date.now())).toEqual([]);
  expect(noticeWait(history, devicesOf(history), "j1")).toBe("none");
});
it("a journey is owed a notice while its work has none, or one no turn of it read; a rejected start owes none", () => {
  const owed = (emissions: readonly HouseEmission[]) => {
    const history = at(emissions);
    return noticeWait(history, devicesOf(history), "j1");
  };
  const work = [opened("j1"), turn("t1"), started("x1", "j1")];
  expect(owed(work)).toBe("owed");
  expect(owed([...work, result("x1", "j1")])).toBe("owed");
  const data = { execution: "x1", status: "rejected", reference: "no" } as const;
  expect(owed([...work, effect("device-execution-result", data, actor, [], "j1")])).toBe("none");
  // Recorded while the turn that waits is open: unread, so the wait is accepted and the notice still wakes it.
  expect(owed([...work, result("x1", "j1"), notice("x1", "j1")])).toBe("owed");
  expect(owed([...work, result("x1", "j1"), notice("x1", "j1"), done("t1"), turn("t2")])).toBe("none");
  expect(owed([...work, result("x1", "j1"), retired])).toBe("retired");
  const unknown = effect("device-execution-unknown", { execution: "x1", reason: "corte" }, actor, [], "j1");
  expect(owed([...work, unknown])).toBe("owed");
  expect(owed([...work, result("x1", "j1"), started("x2", "j1"), result("x2", "j1"), notice("x1", "j1")])).toBe("owed");
});
