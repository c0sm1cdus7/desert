// Says what a journey still owes itself from its devices: announcing work whose notice it has not read yet.
import type { DeviceExecution, DeviceState } from "../../house/devices/device-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import type { NoticeWait } from "../../tools/minds/journey-controls.ts";
/** Work whose device announces how it ends and still may: its start was not rejected, which the house never
 * answers with a notice. Anything else is pending only while its start has no result. */
export const awaitsNotice = (execution: DeviceExecution): boolean =>
  execution.announces === true ? !execution.notice && execution.status !== "rejected" : execution.status === "running";
/** A notice is read once a turn of its journey opened after the house recorded it: that turn's frame showed it. One
 * recorded while the journey's turn is still open is unread, and wakes the journey once that turn closes. */
export function noticeWait(history: readonly Event[], devices: DeviceState, journey: string): NoticeWait {
  const executions = [...devices.executions.values()].filter(
    each => each.journey === journey && each.announces === true && each.status !== "rejected",
  );
  if (!executions.length) return "none";
  const turn = history.findLast(e => e.layer === "house" && e.kind === "mind-turn-opened" && e.process === journey);
  const recorded = new Map<string, number>();
  for (const e of history)
    if (e.layer === "house" && e.kind === "device-execution-notice" && !recorded.has(e.data.execution))
      recorded.set(e.data.execution, e.seq);
  const unread = (execution: DeviceExecution) => (recorded.get(execution.execution) ?? 0) > (turn?.seq ?? 0);
  const retired = (execution: DeviceExecution) => devices.devices.get(execution.device)?.retired === true;
  if (executions.some(each => (each.notice ? unread(each) : !retired(each)))) return "owed";
  return executions.some(each => !each.notice) ? "retired" : "none";
}
