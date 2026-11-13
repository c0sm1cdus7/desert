// What each intent does where you are: the only place that moves a session.
import type { Intent } from "./contract.ts";
import type { Result, Tool } from "./shown-tool.ts";
import { findable } from "./finding.ts";
import { choices, cursorOf, goneOf } from "./lists.ts";
import { begin, fieldOf, toolOf, start } from "./screen.ts";
import type { Picture, Running, Session, Stepped } from "./screen.ts";
import { actedOn, conversationOf, sent, talkStep, writesMessage } from "./talk.ts";
import { replace, up, walking } from "./walking.ts";
import { movedList } from "./reading.ts";
import { must } from "./window.ts";
type Tools = readonly Tool[];
/** Going where a row leads. Opening the very place you came from is going back to it: nothing piles up. */
function forward(session: Session, open: Session[number]): Session {
  const before = session.at(-2);
  const back = open.kind === "view" && before?.kind === "view" && before.tool === open.tool;
  return back && before.target === open.target ? up(session) : [...session, open];
}
/** A menu while a person looks for something: what they type is what they look for, and no key is a shortcut.
 * Escape closes the search; enter goes to the thing the cursor is on, and the search is over. */
function seeking(session: Session, place: Picture & { find: string }, tools: Tools, key: Intent): Session {
  const { find, reading: _reading, ...menu } = place;
  const still = (sought: string): Session => replace(session, { ...menu, find: sought, at: 0 });
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
/** Where something is being written: the answer of a question that takes a text, what is looked for, or a message. */
function writing(place: Session[number], tools: Tools): boolean {
  if (place.kind === "talk") return writesMessage(place, conversationOf(toolOf(tools, place.tool), place.target));
  if (place.kind !== "act") return place.find !== undefined;
  const field = place.phase === "asking" ? fieldOf(tools, place) : undefined;
  return field?.kind === "text" || field?.kind === "secret" || (field?.kind === "pick" && place.finding === true);
}
/** What is pasted is written where something is being written, one character after another, with each line break
 * or tab inside it as a space and none at its ends; anywhere else it does nothing. It never confirms, never chooses,
 * and is never a shortcut. */
function pasted(session: Session, text: string, tools: Tools, now: number): Stepped {
  const place = must(session.at(-1));
  const secret = place.kind === "act" && place.phase === "asking" && fieldOf(tools, place)?.kind === "secret";
  if (secret) return step(session, { kind: "type", text }, tools, now);
  const chars = Array.from(text.trim().replace(/[\r\n\t]+/gu, " ")).filter(char => !/\p{Cc}/u.test(char));
  return chars.reduce<Stepped>(
    (stepped, char) => {
      const there = must(stepped.session.at(-1));
      return writing(there, tools) ? step(stepped.session, { kind: "type", text: char }, tools, now) : stepped;
    },
    { session },
  );
}
export function step(session: Session, key: Intent, tools: readonly Tool[], now: number): Stepped {
  if (key.kind === "quit") return { session, quit: true };
  if (key.kind === "paste") return pasted(session, key.text, tools, now);
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
    return { session: seeking(session, { ...place, find: "" }, tools, { kind: "type", text: "" }) };
  if (key.kind === "up" || key.kind === "down") return { session: replace(session, movedList(place, tools, key.kind)) };
  if (key.kind === "cancel") return { session: up(session) };
  /** With what is shown moved away from the chosen row, Enter first brings it back: nobody opens a row they are
   * not looking at. */
  const { shift: away = 0, reading, ...back } = place;
  if (key.kind === "confirm" && (away !== 0 || reading !== undefined)) return { session: replace(session, back) };
  const hot = key.kind === "type" ? list.find(row => row.key === key.text) : undefined;
  const chosen = hot ?? (key.kind === "confirm" ? list[cursor] : undefined);
  return { session: chosen?.open ? forward(session, chosen.open) : session };
}
/** A message the house settled; the place that sent it may be anywhere in the session by now. */
export const settled = (session: Session, sending: Promise<unknown>, refused: string | undefined): Session =>
  session.map(place => (place.kind === "talk" && place.sending === sending ? sent(place, refused) : place));
/** The result of the act this walk started; a walk you already left stays gone. */
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
