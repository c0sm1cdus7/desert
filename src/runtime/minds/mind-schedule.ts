// Schedules confirmed wakes and recovers interrupted turns without new facts or resends.
import { requireMind } from "../../fields/mind-errors.ts";
import { parseMindActor } from "../../fields/mind-actor.ts";
import { effect, type HouseEmission, type HouseEvent } from "../../house/facts.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { TimeSource } from "../../journal/clock.ts";
import type { Language } from "../../fields/languages.ts";
import type { MindScope } from "../../tools/minds/mind-contract.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
import { ids } from "../../house/ids.ts";
import { mindWakeDecision, type WakePolicy } from "./mind-wake-policy.ts";
import type { TurnWake } from "./mind-ports.ts";
const array = (value: unknown): boolean => Array.isArray(value);
const schedules = new WeakSet<MindSchedulePorts["bus"]>();
const sameScope = (event: Event, scope: MindScope) => event.by === scope.actor && event.process === scope.process;
/** The turns a restart cut, by closures of the 21/11 shape, each with whether it applied any act. */
const restartCuts = (history: readonly Event[]) =>
  new Map(
    history.flatMap(e =>
      e.layer === "house" && e.kind === "mind-turn-closed" && e.data.reason === "interrupted"
        ? [[e.data.turn, e.data.applied.length > 0] as const]
        : [],
    ),
  );
/** The facts that alone move a journey its consciousness owns: its cut turn and the supervisor's stop. Nothing else
 * wakes the consciousness for that journey again, so a restart must not take them away; once a later resume went
 * back to that journey, the consciousness already answered it. */
function journeyMoves(history: readonly Event[]): ReadonlySet<string> {
  const resumed = new Map<string, number>();
  for (const e of history)
    if (e.layer === "house" && e.kind === "journey-resumed" && e.process) resumed.set(e.process, e.seq);
  return new Set(
    history.flatMap(e =>
      e.layer === "house" &&
      e.process !== undefined &&
      (resumed.get(e.process) ?? 0) < e.seq &&
      (e.kind === "journey-interrupted" ||
        (e.kind === "mind-turn-closed" && e.data.reason !== undefined && e.data.reason !== "interrupted"))
        ? [e.id]
        : [],
    ),
  );
}
/** What a turn consumed. A restart is no failure of any mind (21/11): the supervisor's own turn a restart cut
 * consumed nothing, so it wakes again for the same facts, as a journey does through its closure; a consciousness's
 * turn a restart cut before it applied any act gives back its journeys' cuts and stops, so none of them waits forever
 * for an unrelated wake. Anything else that woke it stays consumed: its call is never repeated. */
function consumedBy(
  policy: WakePolicy,
  opened: readonly HouseEvent<"mind-turn-opened">[],
  restarted: ReturnType<typeof restartCuts>,
  moves: () => ReadonlySet<string>,
) {
  const supervisor = policy.scope.actor === ids.supervisor && policy.scope.process === undefined;
  const consciousness = policy.scope.kind === "consciousness" && !supervisor;
  return new Set(
    opened.flatMap(e => {
      const applied = restarted.get(e.data.turn);
      if (applied === undefined) return e.data.wake;
      if (supervisor) return [];
      return consciousness && !applied ? e.data.wake.filter(id => !moves().has(id)) : e.data.wake;
    }),
  );
}
export type PendingMindWake = Readonly<{ scope: MindScope; wake: readonly string[]; through: number }>;
export function pendingMindWakes(
  policies: readonly WakePolicy[],
  history: readonly Event[],
  now: number,
): readonly PendingMindWake[] {
  requireMind(array(policies), "policies");
  requireMind(array(history), "history");
  const pending: (PendingMindWake & Readonly<{ oldest: number }>)[] = [];
  const closed = new Set(
    history.flatMap(e => (e.layer === "house" && e.kind === "mind-turn-closed" ? [e.data.turn] : [])),
  );
  const restarted = restartCuts(history);
  let moves: ReadonlySet<string> | undefined;
  const moved = () => (moves ??= journeyMoves(history));
  for (const policy of policies) {
    const opened = history.filter(
      (e): e is HouseEvent<"mind-turn-opened"> =>
        e.layer === "house" && e.kind === "mind-turn-opened" && sameScope(e, policy.scope),
    );
    if (opened.some(e => !closed.has(e.data.turn))) continue;
    const consumed = consumedBy(policy, opened, restarted, moved);
    const waking = history.filter(e => !consumed.has(e.id) && mindWakeDecision(policy, e, history, now));
    const oldest = waking[0]?.seq;
    if (oldest !== undefined)
      pending.push({ scope: policy.scope, wake: waking.map(e => e.id), through: history.at(-1)?.seq ?? 0, oldest });
  }
  // The oldest waking fact runs first, so a journey that works a lot never leaves the other minds without a turn.
  return pending.sort((a, b) => a.oldest - b.oldest).map(({ scope, wake, through }) => ({ scope, wake, through }));
}
export type MindSchedulePorts = Readonly<{
  bus: Readonly<{ on: (listener: (event: Event) => void) => () => void; confirmation: () => () => boolean }>;
  history: () => readonly Event[];
  policies: () => readonly WakePolicy[];
  language: Language;
  time: TimeSource;
  nextId: () => string;
  emit: (emission: HouseEmission) => void;
  run: (wake: TurnWake) => Promise<unknown>;
  /** The schedule broke; the cause travels so the host can say what broke. */
  failed: (cause: unknown) => void;
}>;
export function interruptedCalls(opened: HouseEvent<"mind-turn-opened">, history: readonly Event[]): number {
  const reserved = new Set(
    history.flatMap(e =>
      e.layer === "house" && e.kind === "model-call-reserved" && e.data.turn === opened.data.turn ? [e.data.call] : [],
    ),
  );
  return history.filter(e => e.layer === "house" && e.kind === "model-call-started" && reserved.has(e.data.call))
    .length;
}
function interruptedActs(opened: HouseEvent<"mind-turn-opened">, history: readonly Event[]): string[] {
  const acts = new Set(
    history
      .filter(
        e =>
          e.layer === "house" &&
          e.kind === "act" &&
          e.seq > opened.seq &&
          e.by === opened.by &&
          e.process === opened.process,
      )
      .map(e => e.id),
  );
  return history.flatMap(e =>
    e.layer === "house" && e.kind === "act-result" && e.data.status === "accepted" && acts.has(e.data.act)
      ? [e.data.act]
      : [],
  );
}
/** An open turn is evidence of interruption, never permission to replay its model or its acts. */
export function recoverMindSchedule(ports: MindSchedulePorts): void {
  const history = ports.history();
  const closed = new Set(
    history.flatMap(e => (e.layer === "house" && e.kind === "mind-turn-closed" ? [e.data.turn] : [])),
  );
  for (const event of history) {
    if (event.layer !== "house" || event.kind !== "mind-turn-opened" || closed.has(event.data.turn)) continue;
    if (!ports.policies().some(p => sameScope(event, p.scope) && parseMindActor(p.scope.actor))) continue;
    const text = turnNotice.text(ports.language, { reason: "interrupted" });
    ports.emit(effect("mind-scene", { turn: event.data.turn, text }, event.by, [event.id], event.process));
    ports.emit(
      effect(
        "mind-turn-closed",
        {
          turn: event.data.turn,
          outcome: "interrupted",
          calls: interruptedCalls(event, history),
          applied: interruptedActs(event, history),
          reason: "interrupted",
        },
        event.by,
        [event.id],
        event.process,
      ),
    );
  }
}
function nextDeadline(ports: MindSchedulePorts): number | undefined {
  const history = ports.history();
  const policies = ports.policies().filter(p => parseMindActor(p.scope.actor));
  const deadlines: number[] = [];
  for (const event of history) {
    if (event.layer !== "house" || event.kind !== "journey-waiting") continue;
    // A wait on a notice without an hour arms no clock: only the notice, or the device's retirement, wakes it.
    const { until } = event.data;
    if (until === undefined || until <= ports.time.now()) continue;
    const pending = pendingMindWakes(policies, history, until);
    if (pending.some(wake => wake.wake.includes(event.id))) deadlines.push(until);
  }
  return deadlines.length ? Math.min(...deadlines) : undefined;
}
export type MindSchedule = Readonly<{ flush: () => Promise<void>; close: () => void; notify: () => void }>;
export function scheduleMindEvent(schedule: MindSchedule, confirmed: () => boolean): void {
  queueMicrotask(() => {
    if (confirmed()) schedule.notify();
  });
}
class Schedule {
  private live = true;
  private work: Promise<void> = Promise.resolve();
  private dirty = false;
  private cancel = () => {};
  private failure: Error | undefined;
  readonly ports: MindSchedulePorts;
  constructor(ports: MindSchedulePorts) {
    this.ports = ports;
  }
  notify = (): void => {
    if (!this.live || this.failure) return;
    this.dirty = true;
    this.work = this.work
      .then(() => this.drain())
      .catch((cause: unknown) => {
        if (!this.live) return;
        this.dirty = false;
        this.cancel();
        this.failure = new Error(turnNotice.text(this.ports.language, { reason: "internal" }), { cause });
        this.ports.failed(cause);
      });
  };
  flush = async (): Promise<void> => {
    await Promise.resolve();
    let current: Promise<void>;
    do {
      current = this.work;
      await current;
    } while (current !== this.work);
    if (this.failure) throw this.failure;
  };
  close = (): void => {
    this.live = false;
    this.cancel();
  };
  private closed(): boolean {
    return !this.live;
  }
  private async drain(): Promise<void> {
    while (this.live && this.dirty && !this.failure) {
      this.dirty = false;
      const policies = this.ports.policies().filter(p => parseMindActor(p.scope.actor));
      const pending = pendingMindWakes(policies, this.ports.history(), this.ports.time.now())[0];
      if (!pending) break;
      await this.ports.run({ ...pending, id: this.ports.nextId(), language: this.ports.language });
      if (this.closed()) return;
      const opened = this.ports
        .history()
        .some(
          e =>
            e.layer === "house" &&
            e.kind === "mind-turn-opened" &&
            sameScope(e, pending.scope) &&
            pending.wake.every(id => e.data.wake.includes(id)),
        );
      requireMind(opened, "schedule.consumed");
      this.dirty = true;
    }
    this.cancel();
    const deadline = nextDeadline(this.ports);
    if (this.live && deadline !== undefined) this.cancel = this.ports.time.wait(deadline, this.notify);
  }
}
export function startMindSchedule(ports: MindSchedulePorts): MindSchedule {
  requireMind(ports, "schedule.ports");
  requireMind(["es"].includes(ports.language), "schedule.language");
  for (const name of ["history", "policies", "nextId", "emit", "run", "failed"] as const)
    requireMind(typeof ports[name] === "function", `schedule.${name}`);
  requireMind(ports.bus, "schedule.bus");
  requireMind(ports.time, "schedule.time");
  requireMind(typeof ports.bus.on === "function", "schedule.bus.on");
  requireMind(typeof ports.bus.confirmation === "function", "schedule.bus.confirmation");
  requireMind(typeof ports.time.now === "function", "schedule.time.now");
  requireMind(typeof ports.time.wait === "function", "schedule.time.wait");
  requireMind(!schedules.has(ports.bus), "schedule.concurrent");
  recoverMindSchedule(ports);
  schedules.add(ports.bus);
  const schedule = new Schedule(ports);
  const off = ports.bus.on(() => scheduleMindEvent(schedule, ports.bus.confirmation()));
  schedule.notify();
  return {
    flush: schedule.flush,
    notify: schedule.notify,
    close: () => {
      off();
      schedule.close();
      schedules.delete(ports.bus);
    },
  };
}
