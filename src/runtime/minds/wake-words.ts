// Says each fact that woke a mind as itself: a message, an act and what it did, a journey's news, a device's word.
import type { Language } from "../../fields/languages.ts";
import type { DeviceExecution, DeviceState } from "../../house/devices/device-state.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { Journeys } from "../../house/minds/journey-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { journeyCut, journeyNotice, journeyWoke, wakeFact } from "../../texts/journey.texts.ts";
import { supervisorWoke } from "../../texts/supervisor.texts.ts";
import type { ProgramMessage } from "../../tools/installable/program.ts";
import { turnNotice } from "../../texts/mind-turn.texts.ts";
/** What the waking mind's frame reads: the house's journeys and devices, and the journey it wakes, if any. */
type Seen = Readonly<{
  journeys: Journeys;
  devices: DeviceState;
  journey?: string | undefined;
  /** How the programs read a fact as a message, so a waking message is said as it reads. */
  message?: ((event: Event) => ProgramMessage | undefined) | undefined;
}>;
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
/** A restart cut the turn that read a device's word: the line says it again, since that turn's frame was lost. */
function restarted(event: HouseEvent<"mind-turn-closed">, seen: Seen, language: Language, history: readonly Event[]) {
  const cut = history.find(
    e => e.layer === "house" && e.kind === "mind-turn-opened" && e.data.turn === event.data.turn,
  );
  const words = history.flatMap(e =>
    cut?.layer === "house" && cut.kind === "mind-turn-opened" && cut.data.wake.includes(e.id)
      ? (deviceWords(e, seen, language, history) ?? [])
      : [],
  );
  return [journeyWoke.text(language, { cause: "restart", note: "" }), ...words].join("\n");
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
  if (event.data.reason === "interrupted") return restarted(event, seen, language, history);
  const goal = seen.journeys.get(event.process)?.goal;
  const reason = turnNotice.text(language, { reason: event.data.reason });
  return goal === undefined ? undefined : journeyCut.text(language, { goal, reason, cuts: cutsOf(history, event) });
}
/** The first line of a journey's goal, so a line names the journey without repeating it whole. */
const named = (goal: string) => {
  const first = goal.split("\n")[0] ?? "";
  return first.length > 200 ? `${Array.from(first).slice(0, 200).join("")}…` : first;
};
/** What an act did: the entry its tool wrote, or its outcome. */
function actDetail(history: readonly Event[], act: Event): string {
  for (const e of history) {
    if (e.layer !== "house" || e.seq < act.seq) continue;
    if (e.kind === "tool-entry" && e.cause.includes(act.id)) return e.data.text;
    if (e.kind === "act-done" && e.data.act === act.id) return e.data.text;
  }
  return "";
}
/** Any fact said as itself: a message as the programs read it, an act, a journey's news, else its kind and author. */
export function factLine(event: Event, seen: Seen, language: Language, history: readonly Event[]): string {
  const message = seen.message?.(event);
  if (message) return message.text;
  const say = (kind: "opened" | "due" | "act" | "other", what: string, where = "", detail = "") =>
    wakeFact.text(language, { kind, who: event.by, what, where, detail });
  if (event.layer !== "house") return say("other", event.kind);
  if (event.kind === "act") return say("act", event.data.option, event.data.object, actDetail(history, event));
  if (event.kind === "journey-opened") return say("opened", "");
  if (event.kind === "journey-waiting") return say("due", "", "", event.data.what);
  if (event.kind === "journey-closed") {
    const goal = named(event.process ? (seen.journeys.get(event.process)?.goal ?? event.process) : "");
    const kind = event.data.outcome === "done" ? "done" : "desisted";
    return supervisorWoke.text(language, { kind, who: event.by, goal, detail: event.data.summary });
  }
  if (event.kind === "tool-entry") return say("other", event.data.text, event.data.target);
  return say("other", event.kind);
}
/** One line per waking fact; an id the journal does not hold stays an id. */
export function wakeWords(
  history: readonly Event[],
  seen: Seen,
  wake: readonly string[],
  language: Language,
): readonly string[] {
  const events = new Map(history.flatMap(event => (wake.includes(event.id) ? [[event.id, event] as const] : [])));
  return wake.map(id => {
    const event = events.get(id);
    if (!event) return id;
    return describe(event, seen, language, history) ?? factLine(event, seen, language, history);
  });
}
