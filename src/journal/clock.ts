export const toolReminderLadder = { firstMs: 60_000, maxMs: 3_600_000, multiplier: 2 } as const;
const maxTimerDelayMs = 2_147_483_647;
/** How often a screen that shows time passing is drawn again. */
export const redrawMs = 400;
/** Every case of a program happens at this one instant, so what it promises to read does not depend on the day. */
export const caseInstant = Date.UTC(2026, 0, 15, 15, 0);
import { effect } from "../house/facts.ts";
import type { Event, HouseBus } from "./vocabulary.ts";
export const systemTime: TimeSource = {
  now: () => Date.now(),
  wait: (at, fire) => {
    const timer = setTimeout(fire, Math.min(maxTimerDelayMs, Math.max(0, at - Date.now())));
    return () => clearTimeout(timer);
  },
};
// Schedule asynchronously at an absolute time; cancellation prevents delivery.
export type TimeSource = { now(): number; wait(at: number, fire: () => void): () => void };
export type Deadlines = ReadonlyMap<string, { readonly at: number; readonly cause: string; readonly seq: number }>;
export function clockStep(state: Deadlines, event: Event): Deadlines {
  if (event.layer !== "house" || (event.kind !== "wake-at" && event.kind !== "woke")) return state;
  const next = new Map(state);
  if (event.kind === "wake-at" && event.data.at !== null) {
    next.set(event.data.id, { at: event.data.at, cause: event.id, seq: event.seq });
  } else if (event.kind === "wake-at" || event.cause.includes(next.get(event.data.id)?.cause ?? "")) {
    next.delete(event.data.id);
  }
  return next;
}
/** Arm the earliest pending deadline, ordering ties by journal position. */
export function startClock(bus: HouseBus, time: TimeSource, initial: Deadlines, by: string): () => void {
  let state = initial;
  let live = true;
  let cancel = () => {};
  const arm = (): void => {
    cancel();
    if (!live) return;
    const first = [...state].sort(([, a], [, b]) => a.at - b.at || a.seq - b.seq)[0];
    if (!first) return;
    const [id, wake] = first;
    cancel = time.wait(wake.at, () => {
      if (time.now() < wake.at) return arm();
      bus.emit(effect("woke", { id }, by, [wake.cause]));
    });
  };
  const off = bus.on(event => {
    const before = state;
    bus.onRollback?.(() => {
      state = before;
      arm();
    });
    state = clockStep(state, event);
    arm();
  });
  arm();
  return () => {
    live = false;
    [off, cancel].forEach(stop => stop());
  };
}
