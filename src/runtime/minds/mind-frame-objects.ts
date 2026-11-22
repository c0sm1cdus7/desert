// Shows each thing in play capped, with its length and how to read it whole; a quiet thing stays a row of its list.
import type { Language } from "../../fields/languages.ts";
import type { DeviceState } from "../../house/devices/device-state.ts";
import type { Event } from "../../journal/vocabulary.ts";
import { frameReading } from "../../texts/mind-frame.texts.ts";
import type { FrameItem } from "./mind-frame.ts";
/** How much of an object a frame shows. A string over `field` keeps its first `head` and last `tail` characters around
 * a mark that says how many it left out; an object over `object` keeps whole lines from its start and its end. A list
 * keeps every row it can, each one short; a thing keeps more of each text. */
type Budget = Readonly<{ field: number; head: number; tail: number; object: number; start: number; end: number }>;
const listBudget: Budget = { field: 200, head: 60, tail: 100, object: 4000, start: 1000, end: 3000 };
const thingBudget: Budget = { field: 1200, head: 300, tail: 700, object: 3000, start: 1000, end: 2000 };
type Cut = Readonly<{ budget: Budget; say: (part: "field" | "lines", count: number) => string }>;
function cutString(text: string, { budget, say }: Cut): string {
  const points = Array.from(text);
  if (points.length <= budget.field) return text;
  const left = points.length - budget.head - budget.tail;
  return `${points.slice(0, budget.head).join("")}${say("field", left)}${points.slice(-budget.tail).join("")}`;
}
const cutValue = (value: unknown, cut: Cut): unknown => {
  if (typeof value === "string") return cutString(value, cut);
  if (Array.isArray(value)) return value.map(each => cutValue(each, cut));
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(Object.entries(value).map(([key, each]) => [key, cutValue(each, cut)]));
};
/** A row the tools write as JSON keeps its shape with each long string cut; any other line is cut as text. */
function cutLine(line: string, cut: Cut): string {
  try {
    const value: unknown = JSON.parse(line);
    if (typeof value === "object" && value !== null) return JSON.stringify(cutValue(value, cut));
  } catch {
    // Not JSON: a plain line.
  }
  return cutString(line, cut);
}
/** Whole lines from the start and from the end within their budgets, around a mark with how many it left out. */
function cutLines(lines: readonly string[], cut: Cut): string {
  const head: string[] = [];
  for (const line of lines)
    if (head.join("\n").length + line.length <= cut.budget.start) head.push(line);
    else break;
  const tail: string[] = [];
  for (const line of [...lines].reverse())
    if (head.length + tail.length < lines.length && tail.join("\n").length + line.length <= cut.budget.end)
      tail.unshift(line);
    else break;
  if (!head.length && !tail.length) return cutString(lines.join("\n"), cut);
  return [...head, cut.say("lines", lines.length - head.length - tail.length), ...tail].join("\n");
}
export function capObject(item: FrameItem, language: Language): FrameItem {
  const length = Array.from(item.text).length;
  const budget = isList(item) ? listBudget : thingBudget;
  const cut: Cut = { budget, say: (part, count) => frameReading.text(language, { part, count, id: item.id }) };
  const lines = item.text.split("\n").map(line => cutLine(line, cut));
  const text = lines.join("\n");
  const kept = text.length <= budget.object ? text : cutLines(lines, cut);
  if (kept === item.text) return item;
  return {
    id: item.id,
    text: `${kept}\n${frameReading.text(language, { part: "whole", count: length, id: item.id })}`,
  };
}
/** A list writes its rows as JSON lines with an id each. */
const isList = (item: FrameItem) => /"id":"/u.test(item.text);
/** The ids a tool writes as rows of a list: such a thing is shown whole only when it is in play. */
function listed(objects: readonly FrameItem[]): Set<string> {
  const ids = new Set<string>();
  for (const object of objects)
    for (const match of object.text.matchAll(/"id":"([^"]+)"/gu)) if (match[1] !== object.id) ids.add(match[1] ?? "");
  return ids;
}
type Play = Readonly<{ history: readonly Event[]; mark: number; wake: readonly string[]; devices: DeviceState }>;
/** What the facts lead to: what the tools wrote or acted on since the mind last answered or in what woke it, a thing
 * named after such an act, and device work of this scope that has not ended. */
export function inPlay({ history, mark, wake, devices }: Play, journeys: (journey: string) => boolean): Set<string> {
  const ids = new Set<string>();
  const causes = new Set(history.filter(e => wake.includes(e.id)).flatMap(e => [e.id, ...e.cause]));
  const acts = new Map<string, string>();
  for (const e of history) {
    if (e.layer !== "house") continue;
    if (e.kind === "act") acts.set(e.id, e.data.object);
    const recent = e.seq > mark || causes.has(e.id) || e.cause.some(id => causes.has(id));
    if (!recent) continue;
    if (e.kind === "tool-entry") [e.data.target, ...(e.data.made ?? [])].forEach(id => ids.add(id));
    if (e.kind === "act") [e.data.object, `${e.data.object}/${e.id}`].forEach(id => ids.add(id));
  }
  for (const each of devices.executions.values()) {
    const open = each.status === "running" || each.status === "unknown" || (each.announces && !each.notice);
    const object = acts.get(each.execution);
    if (open && each.status !== "rejected" && object && each.journey && journeys(each.journey))
      ids.add(`${object}/${each.execution}`);
  }
  return ids;
}
/** The objects a frame shows: every list, every thing no list names, and the listed things in play; each capped. */
export function framedObjects(objects: readonly FrameItem[], play: ReadonlySet<string>, language: Language) {
  const rows = listed(objects);
  const shown = objects.filter(object => !rows.has(object.id) || play.has(object.id) || isList(object));
  return { objects: shown.map(object => capObject(object, language)), quiet: objects.length - shown.length };
}
