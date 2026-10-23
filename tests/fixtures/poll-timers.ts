import type { TestContext } from "node:test";

/** Observe real polling timers without replacing their timing or async behavior. */
export function pollTimers(t: TestContext) {
  const schedule = globalThis.setTimeout, cancel = globalThis.clearTimeout;
  const pending = new Set<ReturnType<typeof setTimeout>>();
  t.mock.method(globalThis, "setTimeout", (callback: (...args: unknown[]) => void, delay?: number, ...args: unknown[]) => {
    const observed = delay === 250 || delay === 500;
    const timer = schedule(() => { pending.delete(timer); callback(...args); }, delay);
    if (observed) pending.add(timer);
    return timer;
  });
  t.mock.method(globalThis, "clearTimeout", (timer: ReturnType<typeof setTimeout>) => {
    pending.delete(timer); cancel(timer);
  });
  t.after(() => { for (const timer of pending) cancel(timer); pending.clear(); });
  return pending;
}
