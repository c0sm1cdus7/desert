// Says in words why a mind woke when the waking fact is about its journeys; any other fact keeps its id.
import type { Language } from "../../fields/languages.ts";
import type { DeviceExecution, DeviceState } from "../../house/devices/device-state.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { journeyCut, journeyNotice, journeyWoke } from "../../texts/journey.texts.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
/** What the waking mind's frame reads: the house's journeys and devices, and the journey it wakes, if any. */
type Seen = Readonly<{ journeys: Journeys; devices: DeviceState; journey?: string | undefined }>;
type NoticeStatus = HouseEvent<"device-execution-notice">["data"]["status"];
/** How many turns of this journey were cut up to this one: a fact, not a limit. A restart is no failure of the mind,
 * so the count leaves its closures out (21/11). */
const cutsOf = (history: readonly Event[], event: Event) =>
  history.filter(
    e =>
      e.seq <= event.seq &&
      e.layer === "house" &&
      e.kind === "mind-turn-closed" &&
      e.process === event.process &&
      e.data.reason !== undefined &&
      e.data.reason !== "interrupted",
  ).length;
/** The work as the mind saw it when it started it: its act, its target, and the reference its start returned. */
function workOf(history: readonly Event[], execution: string) {
  let target = "";
  let started = "";
  for (const e of history) {
    if (e.layer !== "house") continue;
    if (e.kind === "act" && e.id === execution) target = e.data.object;
    if (e.kind === "device-execution-result" && e.data.execution === execution) started = e.data.reference;
  }
  return { target, started };
}
/** What a device said of the journey's work, or, when a person retired it, which of that work will not be heard of. */
function deviceWords(event: Event, seen: Seen, language: Language, history: readonly Event[]): string | undefined {
  if (event.layer !== "house") return undefined;
  const say = (execution: DeviceExecution, status: NoticeStatus | "retired", reference = "") => {
    const device = seen.devices.devices.get(execution.device)?.name ?? execution.device;
    const work = { act: execution.action, device, ...workOf(history, execution.execution) };
    return journeyNotice.text(language, { ...work, status, reference });
  };
  if (event.kind === "device-execution-notice") {
    const execution = seen.devices.executions.get(event.data.execution);
    return execution && say(execution, event.data.status, event.data.reference);
  }
  if (event.kind !== "device-retired" || !seen.journey) return undefined;
  const lines = [...seen.devices.executions.values()]
    .filter(each => each.journey === seen.journey && each.device === event.data.device)
    .filter(each => each.announces === true && !each.notice && each.status !== "rejected")
    .map(each => say(each, "retired"));
  return lines.length ? lines.join("\n") : undefined;
}
function describe(
  event: Event | undefined,
  seen: Seen,
  language: Language,
  history: readonly Event[],
): string | undefined {
  if (event?.layer !== "house") return undefined;
  if (event.kind === "journey-resumed") return journeyWoke.text(language, { cause: "resume", note: event.data.note });
  if (event.kind === "device-execution-notice" || event.kind === "device-retired")
    return deviceWords(event, seen, language, history);
  if (event.kind !== "mind-turn-closed" || !event.process || !event.data.reason) return undefined;
  if (event.data.reason === "interrupted") return journeyWoke.text(language, { cause: "restart", note: "" });
  const goal = seen.journeys.get(event.process)?.goal;
  const reason = turnNotice.text(language, { reason: event.data.reason });
  return goal === undefined ? undefined : journeyCut.text(language, { goal, reason, cuts: cutsOf(history, event) });
}
/** One line per waking fact, or nothing when no fact has words, so every other frame stays as it was. */
export function wakeWords(
  history: readonly Event[],
  seen: Seen,
  wake: readonly string[],
  language: Language,
): readonly string[] | undefined {
  const events = new Map(history.flatMap(event => (wake.includes(event.id) ? [[event.id, event] as const] : [])));
  const lines = wake.map(id => describe(events.get(id), seen, language, history));
  return lines.some(line => line !== undefined) ? lines.map((line, index) => line ?? wake[index] ?? "") : undefined;
}
