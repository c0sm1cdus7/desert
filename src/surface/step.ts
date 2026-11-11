// What each intent does where you are: the only place that moves a session.
import type { Field, Intent, Mask, Result, Tool } from "./contract.ts";
import { choices, cursorOf, goneOf } from "./lists.ts";
import { actOf, begin, fieldOf, toolOf, maskOf, optionsOf, opened, start, validOf } from "./screen.ts";
import type { Asking, Running, Session, Stepped, Walk } from "./screen.ts";
import { actedOn, conversationOf, edited, sent, talkStep } from "./talk.ts";
import { must } from "./window.ts";

type Tools = readonly Tool[];
const up = (session: Session): Session => (session.length > 1 ? session.slice(0, -1) : session);
const replace = (session: Session, place: Session[number]): Session => [...session.slice(0, -1), place];

function advance(session: Session, walk: Asking, tools: readonly Tool[], answer: string, now: number): Stepped {
  const current = must(fieldOf(tools, walk));
  // An answer that changed can change what follows, so what was answered after it does not survive. Unless what
  // follows is what the thing already has: a walk that asks only part keeps the rest, and one that began with what
  // the thing is today keeps it past a written answer, which never changes what is asked next.
  const written = current.kind === "text" || current.kind === "secret";
  const kept = walk.until !== undefined || walk.answers[walk.pos] === answer || (walk.carried === true && written);
  const later = kept ? walk.answers.slice(walk.pos + 1) : [];
  const answers = [...walk.answers.slice(0, walk.pos), answer, ...later];
  const asked = [...walk.asked.slice(0, walk.pos), { ask: current.ask, shown: maskOf(current, answer) }];
  const moved: Walk = { ...walk, answers, asked, pos: walk.pos + 1 };
  const { error: _gone, ...clean } = moved;
  const field = fieldOf(tools, clean);
  if (field) return { session: replace(session, { ...clean, ...opened(field, answers[clean.pos]) }) };
  const running: Walk = { ...clean, phase: "running", since: now };
  return { session: replace(session, running), run: running };
}
/** In a field with a format the keys go through its mask: what does not fit is not typed. */
function masked(walk: Asking, mask: Mask, key: Intent): Asking | undefined {
  const typed =
    key.kind === "type" ? Array.from(key.text).reduce((now, text) => mask.put(now, text), walk.typed) : walk.typed;
  if (key.kind === "type") return { ...walk, typed, caret: Array.from(typed).length };
  if (key.kind === "erase") return { ...walk, typed: Array.from(walk.typed).slice(0, -1).join("") };
  return key.kind === "left" || key.kind === "right" ? walk : undefined;
}
function typing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  const changed = "mask" in field ? masked(walk, field.mask, key) : edited(walk, key);
  if (changed) return { session: replace(session, changed) };
  if (key.kind === "confirm" && validOf(field, walk.typed)) return advance(session, walk, tools, walk.typed, now);
  return { session };
}
function choosing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  const options = optionsOf(field);
  const set = (next: Partial<Asking>): Stepped => ({ session: replace(session, { ...walk, ...next }) });
  if (key.kind === "up") return set({ at: Math.max(walk.at - 1, 0) });
  if (key.kind === "down") return set({ at: Math.min(walk.at + 1, options.length - 1) });
  const chosen = options[walk.at];
  if (field.kind === "many" && key.kind === "type" && key.text === " " && chosen) {
    const on = walk.marks.includes(chosen.title);
    return set({ marks: on ? walk.marks.filter(mark => mark !== chosen.title) : [...walk.marks, chosen.title] });
  }
  if (key.kind === "type" && field.kind !== "many") {
    const at = options.findIndex(option => option.key === key.text);
    if (at >= 0) return choosing(session, { ...walk, at }, tools, field, { kind: "confirm" }, now);
  }
  if (key.kind !== "confirm" || !chosen) return { session };
  if (field.kind === "confirm" && chosen === options[field.reversible ? options.length - 1 : 0]) {
    return { session: up(session) };
  }
  if (field.kind === "many") {
    const ordered = options.filter(option => walk.marks.includes(option.title)).map(option => option.title);
    return advance(session, walk, tools, ordered.join(" · "), now);
  }
  return advance(session, walk, tools, chosen.title, now);
}
function back(session: Session, walk: Asking, tools: readonly Tool[]): Session {
  const { error: _gone, ...clean } = walk;
  const earlier = { ...clean, pos: walk.pos - 1 };
  return replace(session, { ...earlier, ...opened(fieldOf(tools, earlier), walk.answers[earlier.pos]) });
}
function walking(session: Session, walk: Walk, tools: readonly Tool[], key: Intent, now: number): Stepped {
  if (key.kind === "cancel") {
    if (walk.phase === "asking" && walk.pos > walk.floor) return { session: back(session, walk, tools) };
    const thingIsGone = walk.phase === "done" && actOf(tools, walk).leaves;
    return { session: thingIsGone ? up(up(session)) : up(session) };
  }
  if (walk.phase !== "asking") return { session };
  const field = must(fieldOf(tools, walk));
  const textual = field.kind === "text" || field.kind === "secret";
  return textual ? typing(session, walk, tools, field, key, now) : choosing(session, walk, tools, field, key, now);
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
  const list = choices(place, tools);
  const cursor = cursorOf(place, tools);
  const control = list[cursor]?.press;
  if (control && (key.kind === "confirm" || key.kind === "type" || key.kind === "erase")) {
    control(key);
    return { session };
  }
  if (key.kind === "up") return { session: replace(session, { ...place, at: Math.max(cursor - 1, 0) }) };
  if (key.kind === "down")
    return { session: replace(session, { ...place, at: Math.min(cursor + 1, list.length - 1) }) };
  if (key.kind === "cancel") return { session: up(session) };
  const hot = key.kind === "type" ? list.find(row => row.key === key.text) : undefined;
  const chosen = hot ?? (key.kind === "confirm" ? list[cursor] : undefined);
  return { session: chosen?.open ? [...session, chosen.open] : session };
}
/** A message the house settled; the place that sent it may be anywhere in the session by now. */
export const settled = (session: Session, sending: Promise<unknown>, refused: string | undefined): Session =>
  session.map(place => (place.kind === "talk" && place.sending === sending ? sent(place, refused) : place));
/** The result of the act this walk started; a walk you already left stays gone. */
export function finished(session: Session, walk: Running, result: Result, clock?: string): Session {
  const place = session.at(-1);
  if (place?.kind !== "act" || place.phase !== "running" || place.since !== walk.since) return session;
  if (result.ok) {
    return replace(session, { ...place, phase: "done", done: result.text, ...(clock ? { doneAt: clock } : {}) });
  }
  const pos = Math.max(place.pos - 1, place.floor);
  const typed = place.answers[pos] ?? "";
  const caret = Array.from(typed).length;
  return replace(session, { ...place, phase: "asking", pos, typed, caret, at: 0, error: result.reason });
}
