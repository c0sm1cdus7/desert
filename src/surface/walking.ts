// What each key does inside an act: writing an answer, choosing one, picking a thing, going back, leaving.
import { nextMoneyAnswer } from "./fields/money-memory.ts";
import { answerValidity } from "../tools/answers/answer-change.ts";
import type { Field, Intent, Mask, Option } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { actOf, begin, fieldOf, maskOf, optionsOf, opened, opening, pickedFrom, validOf } from "./screen.ts";
import type { Asking, Session, Stepped, Walk } from "./screen.ts";
import { answersAfter } from "./kept-answers.ts";
import { edited } from "./talk.ts";
import { movedOptions } from "./reading.ts";
import { must } from "./window.ts";
type Tools = readonly Tool[];
export const up = (session: Session): Session => (session.length > 1 ? session.slice(0, -1) : session);
export const replace = (session: Session, place: Session[number]): Session => [...session.slice(0, -1), place];
function advance(session: Session, walk: Asking, tools: readonly Tool[], answer: string, now: number): Stepped {
  const current = must(fieldOf(tools, walk));
  const act = actOf(tools, walk);
  if (current.unchanged?.(answer)) return { session };
  const answers = answersAfter(act, walk, answer);
  /** What the act says cannot go on stays at the question it was answered in, saying why. */
  const why =
    answerValidity(current.valid?.(answer), current.wrong?.(answer)) ?? act.stops?.(answers.slice(0, walk.pos + 1));
  if (why !== undefined) return { session: replace(session, opening(tools, { ...walk, error: why })) };
  const asked = [
    ...walk.asked.slice(0, walk.pos),
    { ask: current.ask, shown: maskOf(current, answer), ...(current.currency ? { currency: current.currency } : {}) },
  ];
  /** A walk that asked only part asks on when the rest no longer says everything the act takes. */
  const open = walk.until === undefined ? null : act.next(answers);
  const { until: _part, ...whole } = walk;
  const moved: Walk = { ...(open && open.kind !== "confirm" ? whole : walk), answers, asked, pos: walk.pos + 1 };
  const {
    error: _gone,
    ignored: _key,
    failed: _result,
    finding: _sought,
    read: _back,
    reading: _reading,
    ...clean
  } = moved;
  const field = fieldOf(tools, clean);
  if (field) return { session: replace(session, opening(tools, clean, nextMoneyAnswer(act.next, walk, answers))) };
  const running: Walk = { ...clean, phase: "running", since: now };
  return { session: replace(session, running), run: running };
}
/** In a field with a format the keys go through its mask: what does not fit is not typed. */
function masked(walk: Asking, mask: Mask, key: Intent): Asking | undefined {
  if (key.kind === "type") {
    let typed = walk.typed;
    let reason: string | undefined;
    let accepted = false;
    for (const text of Array.from(key.text)) {
      const rejected = mask.rejected?.(typed, text);
      reason ??= rejected;
      accepted ||= rejected === undefined;
      typed = mask.put(typed, text);
    }
    const changed = accepted ? rewritten(walk) : walk;
    const why = reason === undefined ? {} : { error: reason, ignored: true as const };
    return { ...changed, typed, caret: Array.from(typed).length, ...why };
  }
  if (key.kind === "erase") return { ...rewritten(walk), typed: Array.from(walk.typed).slice(0, -1).join("") };
  return key.kind === "left" || key.kind === "right" ? walk : undefined;
}
/** Editing clears a prior result; an ignored key keeps its own reason instead. */
function rewritten({ error: _was, ignored: _key, failed: _result, ...written }: Asking): Asking {
  return { ...written, suggested: false };
}
/** A space that says nothing is not typed: before anything is written, or next to another space. Two names that
 * read the same are written the same. */
function idleSpace({ typed, caret }: Asking, key: Intent): boolean {
  if (key.kind !== "type" || key.text !== " ") return false;
  const chars = Array.from(typed);
  return caret === 0 || chars[caret - 1] === " " || chars[caret] === " ";
}
function typing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  /** What the question opened with gives way to the first key written. */
  const fresh = walk.suggested && key.kind === "type" ? { ...walk, typed: "", caret: 0 } : walk;
  /** A text takes no more than it may hold: the key that would pass it is not typed. */
  const full = key.kind === "type" && "max" in field && Array.from(fresh.typed).length >= (field.max ?? Infinity);
  if (full) return { session };
  if (!("mask" in field) && idleSpace(fresh, key)) return { session };
  const changed = "mask" in field ? masked(fresh, field.mask, key) : edited(fresh, key);
  if (key.kind === "type" && changed?.typed === fresh.typed && !("mask" in field && field.mask.rejected))
    return { session };
  if (key.kind === "type" && walk.suggested && changed?.typed === "" && changed.error !== undefined)
    return { session: replace(session, { ...walk, error: changed.error, ignored: true }) };
  if (changed) return { session: replace(session, "mask" in field ? changed : rewritten(changed)) };
  if (key.kind !== "confirm") return { session };
  if (validOf(field, walk.typed)) return advance(session, walk, tools, walk.typed, now);
  const reason = field.wrong?.(walk.typed, true);
  const { ignored: _key, ...confirmed } = walk;
  return reason === undefined ? { session } : { session: replace(session, { ...confirmed, error: reason }) };
}
function choosing(session: Session, walk: Asking, tools: Tools, field: Field, key: Intent, now: number): Stepped {
  const options = optionsOf(field);
  const set = (next: Partial<Asking>): Stepped => ({ session: replace(session, { ...walk, ...next }) });
  if (key.kind === "up" || key.kind === "down") {
    const next = movedOptions(options, walk.at, key.kind, walk.reading);
    /** Above the first option there is only what is said: the same key reads it back a window, and down returns. */
    if (key.kind === "up" && next.at === walk.at && walk.reading === undefined)
      return set({ read: (walk.read ?? 0) + 1 });
    return walk.read ? set({ read: 0 }) : set(next);
  }
  if (key.kind === "confirm" && options[walk.at]?.off) return { session };
  const chosen = options[walk.at]?.off ? undefined : options[walk.at];
  if (field.kind === "many" && key.kind === "type" && key.text === " " && chosen) {
    const on = walk.marks.includes(chosen.title);
    const marks = on ? walk.marks.filter(mark => mark !== chosen.title) : [...walk.marks, chosen.title];
    const next = optionsOf(fieldOf(tools, { ...walk, marks }));
    return set({ marks, at: next[walk.at]?.off ? next.findIndex(option => !option.off) : walk.at });
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
  const { reading: _reading, ...searched } = walk;
  const set = (next: Partial<Asking>): Stepped => ({ session: replace(session, { ...searched, ...next }) });
  const sought = (typed: string): Stepped =>
    set({
      typed,
      caret: Array.from(typed).length,
      at: field.found(typed).findIndex(option => !option.off && !option.makes),
    });
  const found = pickedFrom(field, walk);
  /** With nothing to pick among there is nothing to look for either: only leaving is left. */
  if (!walk.finding && !found.length) return { session };
  if (walk.finding && key.kind === "type") return sought(walk.typed + key.text);
  if (walk.finding && key.kind === "erase") return sought(Array.from(walk.typed).slice(0, -1).join(""));
  if (key.kind === "type" && key.text === " ")
    return set({ finding: true, typed: "", caret: 0, at: found.findIndex(option => !option.off && !option.makes) });
  /** Taking a row answers with it; the one that makes a new thing starts that act, and what it makes is the answer. */
  const taken = (row: Option | undefined): Stepped => {
    if (row?.off) return { session };
    if (!row) return { session };
    if (!row.makes) return advance(session, walk, tools, row.value ?? row.title, now);
    return { session: [...session, { ...begin(tools, row.makes.tool, row.makes.act), returns: true }] };
  };
  if (key.kind === "type") {
    const numbered = found.filter(option => !option.makes);
    const numberedRow = numbered.some(row => row.key !== undefined)
      ? numbered.find(row => row.key === key.text)
      : numbered[Number(key.text) - 1];
    return taken(/^[1-9]$/u.test(key.text) ? numberedRow : found.find(row => row.key === key.text));
  }
  if (key.kind === "up" || key.kind === "down") return set(movedOptions(found, walk.at, key.kind, walk.reading));
  return taken(key.kind === "confirm" ? found[walk.at] : undefined);
}
function back(session: Session, walk: Asking, tools: readonly Tool[]): Session {
  const { error: _gone, ignored: _key, failed: _result, read: _back, reading: _reading, ...clean } = walk;
  const earlier = { ...clean, pos: walk.pos - 1 };
  return replace(session, opening(tools, earlier, walk.answers[earlier.pos]));
}
export function walking(session: Session, walk: Walk, tools: readonly Tool[], key: Intent, now: number): Stepped {
  if (key.kind === "cancel") {
    if (walk.phase === "asking" && walk.failed) return { session: up(session) };
    /** Escape closes the search first: the whole list is back, and the question is still the same. */
    if (walk.phase === "asking" && walk.finding) {
      const { finding: _sought, reading: _reading, ...whole } = walk;
      return { session: replace(session, { ...whole, typed: "", caret: 0, at: opened(fieldOf(tools, whole)).at }) };
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
  if (walk.reading !== undefined && key.kind === "confirm") {
    const { reading: _reading, ...back } = walk;
    return { session: replace(session, back) };
  }
  if (field.kind === "pick") return picking(session, walk, tools, field, key, now);
  const textual = field.kind === "text" || field.kind === "secret";
  return textual ? typing(session, walk, tools, field, key, now) : choosing(session, walk, tools, field, key, now);
}
