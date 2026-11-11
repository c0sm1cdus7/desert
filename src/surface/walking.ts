// What each key does inside an act: writing an answer, choosing one, picking a thing, going back, leaving.
import type { Field, Intent, Mask } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { actOf, fieldOf, maskOf, optionsOf, opened, validOf } from "./screen.ts";
import type { Asking, Session, Stepped, Walk } from "./screen.ts";
import { edited } from "./talk.ts";
import { must } from "./window.ts";

type Tools = readonly Tool[];
export const up = (session: Session): Session => (session.length > 1 ? session.slice(0, -1) : session);
export const replace = (session: Session, place: Session[number]): Session => [...session.slice(0, -1), place];
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
  const { error: _gone, finding: _sought, ...clean } = moved;
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
  /** A text takes no more than it may hold: the key that would pass it is not typed. */
  /** What the question opened with gives way to the first key written. */
  const fresh = walk.suggested && key.kind === "type" ? { ...walk, typed: "", caret: 0 } : walk;
  const full = key.kind === "type" && "max" in field && Array.from(fresh.typed).length >= (field.max ?? Infinity);
  if (full) return { session };
  const changed = "mask" in field ? masked(fresh, field.mask, key) : edited(fresh, key);
  if (changed) return { session: replace(session, { ...changed, suggested: false }) };
  if (key.kind !== "confirm" || !validOf(field, walk.typed)) return { session };
  /** What is complete and still wrong stays where it was written, and the question now says why. */
  const why = field.wrong?.(walk.typed);
  return why === undefined
    ? advance(session, walk, tools, walk.typed, now)
    : { session: replace(session, { ...walk, error: why }) };
}
/** The option above or below that can be chosen: the cursor never rests on one that cannot. */
function beside(options: readonly { off?: boolean }[], at: number, way: "up" | "down"): number {
  const step = way === "up" ? -1 : 1;
  for (let next = at + step; next >= 0 && next < options.length; next += step) if (!options[next]?.off) return next;
  return at;
}
function choosing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  const options = optionsOf(field);
  const set = (next: Partial<Asking>): Stepped => ({ session: replace(session, { ...walk, ...next }) });
  if (key.kind === "up" || key.kind === "down") return set({ at: beside(options, walk.at, key.kind) });
  const chosen = options[walk.at]?.off ? undefined : options[walk.at];
  if (field.kind === "many" && key.kind === "type" && key.text === " " && chosen) {
    const on = walk.marks.includes(chosen.title);
    return set({ marks: on ? walk.marks.filter(mark => mark !== chosen.title) : [...walk.marks, chosen.title] });
  }
  if (key.kind === "type" && field.kind !== "many") {
    const at = options.findIndex(option => option.key === key.text && !option.off);
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
/** A question that picks a thing is a list: a number takes its row, enter the one the cursor is on, and space
 * starts looking, as on any menu. While looking, what is typed is what is looked for and no key is a shortcut. */
function picking(
  session: Session,
  walk: Asking,
  tools: Tools,
  field: Field & { kind: "pick" },
  key: Intent,
  now: number,
) {
  const set = (next: Partial<Asking>): Stepped => ({ session: replace(session, { ...walk, ...next }) });
  const sought = (typed: string): Stepped => set({ typed, caret: Array.from(typed).length, at: 0 });
  const found = field.found(walk.finding ? walk.typed : "");
  /** With nothing to pick among there is nothing to look for either: only leaving is left. */
  if (!walk.finding && !found.length) return { session };
  if (walk.finding && key.kind === "type") return sought(walk.typed + key.text);
  if (walk.finding && key.kind === "erase") return sought(Array.from(walk.typed).slice(0, -1).join(""));
  if (key.kind === "type" && key.text === " ") return set({ finding: true, typed: "", caret: 0, at: 0 });
  if (key.kind === "type") {
    const row = /^[1-9]$/u.test(key.text) ? found[Number(key.text) - 1] : undefined;
    return row && !row.off ? advance(session, walk, tools, row.value ?? row.title, now) : { session };
  }
  if (key.kind === "up" || key.kind === "down") return set({ at: beside(found, walk.at, key.kind) });
  const chosen = key.kind === "confirm" ? found[walk.at] : undefined;
  return chosen && !chosen.off ? advance(session, walk, tools, chosen.value ?? chosen.title, now) : { session };
}
function back(session: Session, walk: Asking, tools: readonly Tool[]): Session {
  const { error: _gone, ...clean } = walk;
  const earlier = { ...clean, pos: walk.pos - 1 };
  return replace(session, { ...earlier, ...opened(fieldOf(tools, earlier), walk.answers[earlier.pos]) });
}
export function walking(session: Session, walk: Walk, tools: readonly Tool[], key: Intent, now: number): Stepped {
  if (key.kind === "cancel") {
    /** Escape closes the search first: the whole list is back, and the question is still the same. */
    if (walk.phase === "asking" && walk.finding) {
      const { finding: _sought, ...whole } = walk;
      return { session: replace(session, { ...whole, typed: "", caret: 0, at: 0 }) };
    }
    if (walk.phase === "asking" && walk.pos > walk.floor) return { session: back(session, walk, tools) };
    const thingIsGone = walk.phase === "done" && actOf(tools, walk).leaves;
    return { session: thingIsGone ? up(up(session)) : up(session) };
  }
  if (walk.phase !== "asking") return { session };
  const field = must(fieldOf(tools, walk));
  if (field.kind === "pick") return picking(session, walk, tools, field, key, now);
  const textual = field.kind === "text" || field.kind === "secret";
  return textual ? typing(session, walk, tools, field, key, now) : choosing(session, walk, tools, field, key, now);
}
