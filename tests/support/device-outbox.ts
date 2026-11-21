// An in-memory stand-in for a device tool's durable outbox: what it owes, what it pushes and the answers it kept.
import type { DeviceNotice, DeviceNotices, NoticeAnswer } from "../../src/fields/device-protocol.ts";
export function deviceOutbox(owed: readonly DeviceNotice[] = []) {
  const notices = new Map(owed.map(notice => [notice.execution, notice]));
  const answers = new Map<string, NoticeAnswer>();
  const listeners = new Set<(notice: DeviceNotice) => void>();
  const port: DeviceNotices = {
    pending: () => Promise.resolve([...notices.values()].filter(notice => !answers.has(notice.execution))),
    acknowledge: (execution, answer) => {
      answers.set(execution, answer);
      return Promise.resolve();
    },
    subscribe: send => {
      listeners.add(send);
      return () => listeners.delete(send);
    },
  };
  return {
    port,
    answers,
    listening: () => listeners.size,
    /** A notice born now: kept first, as a tool keeps it on disk, then pushed to whoever listens. */
    push(notice: DeviceNotice) {
      notices.set(notice.execution, notice);
      for (const send of listeners) send(notice);
    },
  };
}
export const finished = (execution: string, value?: unknown): DeviceNotice => ({
  execution,
  status: "finished",
  reference: `agents:${execution}:finished`,
  ...(value === undefined ? {} : { value }),
});
