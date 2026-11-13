import type { Intent } from "./contract.ts";
import type { Result, Tool } from "./shown-tool.ts";
import { findable } from "./finding.ts";
import { choices, cursorOf, goneOf } from "./lists.ts";
import { begin, toolOf, start } from "./screen.ts";
import type { Picture, Running, Session, Stepped } from "./screen.ts";
import { actedOn, conversationOf, sent, talkStep } from "./talk.ts";
import { replace, up, walking } from "./walking.ts";
import { movedList } from "./reading.ts";
import { must } from "./window.ts";
type Tools = readonly Tool[];
function forward(session: Session, open: Session[number]): Session {
  const before = session.at(-2);
  const back = open.kind === "view" && before?.kind === "view" && before.tool === open.tool;
  return back && before.target === open.target ? up(session) : [...session, open];
}
/** Search treats keys as text; Escape closes it and Enter opens the selected result. */
function seeking(session: Session, place: Picture & { find: string }, tools: Tools, key: Intent): Session {
  const { find, ...menu } = place;
  const still = (sought: string): Session => replace(session, { ...place, find: sought, at: 0 });
  if (key.kind === "cancel") return replace(session, { ...menu, at: 0 });
  if (key.kind === "type") return still(find + key.text);
  if (key.kind === "erase") return still(Array.from(find).slice(0, -1).join(""));
  const list = choices(place, tools);
  const cursor = cursorOf(place, tools);
  if (key.kind === "up") return replace(session, { ...place, at: Math.max(cursor - 1, 0) });
  if (key.kind === "down") return replace(session, { ...place, at: Math.min(cursor + 1, list.length - 1) });
  const chosen = key.kind === "confirm" ? list[cursor]?.open : undefined;
  return chosen ? [...replace(session, { ...menu, at: 0 }), chosen] : session;
}
export function step(session: Session, key: Intent, tools: readonly Tool[], now: number): Stepped {
  if (key.kind === "quit") return { session, quit: true };
  const place = must(session.at(-1));
  if (place.kind === "act") return walking(session, place, tools, key, now);
  if (key.kind === "menu") return { session: start };
  if (place.kind === "talk") {
    const talk = conversationOf(toolOf(tools, place.tool), place.target);
    const acting = actedOn(place, key, talk);
    if (acting) return { session: [...session, begin(tools, acting.tool, acting.act, acting.target)] };
    const next = talkStep(place, key, talk);
    if (next === "leave") return { session: up(session) };
    const sending = next.sending === place.sending ? undefined : next.sending;
    return { session: replace(session, next), ...(sending ? { sending } : {}) };
  }
  if (goneOf(session, tools)) return { session: key.kind === "cancel" ? up(session) : session };
  if (place.find !== undefined) return { session: seeking(session, { ...place, find: place.find }, tools, key) };
  const list = choices(place, tools);
  const cursor = cursorOf(place, tools);
  const control = list[cursor]?.press;
  if (control && (key.kind === "confirm" || key.kind === "type" || key.kind === "erase")) {
    control(key);
    return { session };
  }
  /** Nothing is being written on a menu, so space is free there: it starts looking for something. */
  if (key.kind === "type" && key.text === " " && findable(place, tools))
    return { session: replace(session, { ...place, find: "", at: 0 }) };
  if (key.kind === "up" || key.kind === "down") return { session: replace(session, movedList(place, tools, key.kind)) };
  if (key.kind === "cancel") return { session: up(session) };
  /** Enter first returns from reading to the selected row, without opening it. */
  const { shift: away = 0, reading, ...back } = place;
  if (key.kind === "confirm" && (away !== 0 || reading !== undefined)) return { session: replace(session, back) };
  const hot = key.kind === "type" ? list.find(row => row.key === key.text) : undefined;
  const chosen = hot ?? (key.kind === "confirm" ? list[cursor] : undefined);
  return { session: chosen?.open ? forward(session, chosen.open) : session };
}
export const settled = (session: Session, sending: Promise<unknown>, refused: string | undefined): Session =>
  session.map(place => (place.kind === "talk" && place.sending === sending ? sent(place, refused) : place));
export function finished(session: Session, walk: Running, result: Result, clock?: string): Session {
  const place = session.at(-1);
  if (place?.kind !== "act" || place.phase !== "running" || place.since !== walk.since) return session;
  if (result.ok) {
    const made = result.made === undefined ? {} : { made: result.made };
    return replace(session, {
      ...place,
      phase: "done",
      done: result.text,
      ...(clock ? { doneAt: clock } : {}),
      ...made,
    });
  }
  const pos = Math.max(place.pos - 1, place.floor);
  const typed = place.answers[pos] ?? "";
  const caret = Array.from(typed).length;
  const again = { typed, caret, at: 0, suggested: false, error: result.reason, failed: true as const };
  return replace(session, { ...place, phase: "asking", pos, ...again });
}
