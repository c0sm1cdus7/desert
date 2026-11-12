// What each key does inside an act: writing an answer, choosing one, picking a thing, going back, leaving.
import type { Field, Intent, Mask, Option } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { actOf, begin, fieldOf, maskOf, optionsOf, opened, pickedFrom, validOf } from "./screen.ts";
import type { Asking, Session, Stepped, Walk } from "./screen.ts";
import { toolTexts } from "../texts/tools.texts.ts";
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
  /** What the act says cannot go on stays at the question it was answered in, saying why. */
  const why = actOf(tools, walk).stops?.(answers.slice(0, walk.pos + 1));
  if (why !== undefined) return { session: replace(session, { ...walk, error: why }) };
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
/** What is written after a key. A key that changed nothing leaves what was said as it was; one that did takes it
 * away, and what is written now says its own as soon as it is complete and still does not hold. */
function rewritten(field: Field, before: Asking, { error: _was, ...written }: Asking): Asking {
  const said = written.typed === before.typed ? before.error : undefined;
  const why = said ?? (validOf(field, written.typed) ? field.wrong?.(written.typed) : undefined);
  return { ...written, suggested: false, ...(why === undefined ? {} : { error: why }) };
}
function typing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  /** A text takes no more than it may hold: the key that would pass it is not typed. */
  /** What the question opened with gives way to the first key written. */
  const fresh = walk.suggested && key.kind === "type" ? { ...walk, typed: "", caret: 0 } : walk;
  const full = key.kind === "type" && "max" in field && Array.from(fresh.typed).length >= (field.max ?? Infinity);
  if (full) return { session };
  const changed = "mask" in field ? masked(fresh, field.mask, key) : edited(fresh, key);
  if (changed) return { session: replace(session, rewritten(field, fresh, changed)) };
  if (key.kind !== "confirm") return { session };
  /** What cannot be sent says why, where it is written: enter never does nothing in silence. */
  if (!validOf(field, walk.typed)) {
    const same = field.only === true && field.current === walk.typed;
    const why = same ? toolTexts.unchanged : field.lacks?.(walk.typed);
    return { session: why === undefined ? session : replace(session, { ...walk, error: why }) };
  }
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
  const found = pickedFrom(field, walk);
  /** With nothing to pick among there is nothing to look for either: only leaving is left. */
  if (!walk.finding && !found.length) return { session };
  if (walk.finding && key.kind === "type") return sought(walk.typed + key.text);
  if (walk.finding && key.kind === "erase") return sought(Array.from(walk.typed).slice(0, -1).join(""));
  if (key.kind === "type" && key.text === " ") return set({ finding: true, typed: "", caret: 0, at: 0 });
  /** Taking a row answers with it; the one that makes a new thing starts that act, and what it makes is the answer. */
  const taken = (row: Option | undefined): Stepped => {
    if (!row || row.off) return { session };
    if (!row.makes) return advance(session, walk, tools, row.value ?? row.title, now);
    return { session: [...session, { ...begin(tools, row.makes.tool, row.makes.act), returns: true }] };
  };
  if (key.kind === "type") {
    const numbered = found.filter(option => !option.makes);
    return taken(/^[1-9]$/u.test(key.text) ? numbered[Number(key.text) - 1] : found.find(row => row.key === key.text));
  }
  if (key.kind === "up" || key.kind === "down") return set({ at: beside(found, walk.at, key.kind) });
  return taken(key.kind === "confirm" ? found[walk.at] : undefined);
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
    /** What was made to answer a question answers it: the person is back where they were asked, one step on. */
    const asking = session.at(-2);
    if (walk.phase === "done" && walk.returns && walk.made !== undefined && asking?.kind === "act")
      return asking.phase === "asking" ? advance(up(session), asking, tools, walk.made, now) : { session: up(session) };
    const thingIsGone = walk.phase === "done" && actOf(tools, walk).leaves;
    return { session: thingIsGone ? up(up(session)) : up(session) };
  }
  if (walk.phase !== "asking") return { session };
  const field = must(fieldOf(tools, walk));
  if (field.kind === "pick") return picking(session, walk, tools, field, key, now);
  const textual = field.kind === "text" || field.kind === "secret";
  return textual ? typing(session, walk, tools, field, key, now) : choosing(session, walk, tools, field, key, now);
}
