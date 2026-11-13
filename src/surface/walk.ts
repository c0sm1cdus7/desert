// An action as a thread: what was answered, what it asks now, and how it ended. Every action looks like this.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Body, Field, Hint, Row, Span, ThreadEvent } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { errorSpans } from "./talk.ts";
import { must } from "./window.ts";
import { actOf, type Done, maskOf, optionsOf, pickedFrom, type Running, validOf, type Walk } from "./screen.ts";
function endOf(walk: Running | Done, now: number): readonly Span[] {
  if (walk.phase === "done") {
    const at: readonly Span[] = walk.doneAt ? [{ text: ` · ${walk.doneAt}`, tone: "t3" }] : [];
    return [{ text: `${said.ok} `, tone: "ok" }, { text: walk.done, tone: "t1" }, ...at];
  }
  const seconds = Math.max(1, Math.round((now - walk.since) / 1000));
  return [
    { text: said.working, tone: seconds % 2 ? "t2" : "t3" },
    { text: ` · ${seconds} s`, tone: "t3" },
  ];
}
/** What was answered, beside what was asked. Under it, when what was asked is a block of several lines: the answer
 * is never read as the end of the block's last line. */
const answersOf = (walk: Walk): readonly ThreadEvent[] =>
  walk.asked.slice(0, walk.pos).map(({ ask, shown }) => ({
    text: [
      { text: ask.includes("\n") ? `${ask}\n` : `${ask} `, tone: "t2" },
      { text: shown, tone: "t1" },
    ],
  }));
const isTyped = (field: Field | null): boolean => field?.kind === "text" || field?.kind === "secret";
/** What an empty written field shows: its mask's shape, its own placeholder, or that a secret goes there. */
const shapeOf = (field: Field): string => {
  if ("mask" in field) return field.mask.empty;
  return "placeholder" in field ? field.placeholder : said.pasteHere;
};
/** The things a question picks among, as a list: each of the first nine with its number. While the person looks
 * for one, where they write comes first and the rows carry no key. */
function pickRows(walk: Walk, question: Field & { kind: "pick" }): readonly Row[] {
  const found = pickedFrom(question, walk);
  const rows = found.map((option, i): Row => {
    /** What makes a new one keeps the key of its act; the things there are take their number. */
    const key = walk.finding || i > 8 || option.makes || option.off ? {} : { key: option.key ?? String(i + 1) };
    return { ...option, ...key, selected: i === walk.at };
  });
  /** Nothing to pick among is said where the list would be: the question never stands over nothing. */
  if (!walk.finding && !rows.length && question.nothing())
    return [{ title: question.nothing(), still: true, tone: "t3" }];
  if (!walk.finding) return rows;
  const typing: Row = { title: "", entry: { typed: walk.typed, caret: Array.from(walk.typed).length } };
  return [typing, ...(rows.length ? rows : [{ title: said.nothingFound, still: true, tone: "t3" as const }])];
}
/** A question, and beside its name what its datum is today, when it changes one: said as a datum, turned down. */
function askSpans(question: Field): readonly Span[] {
  const current = question.current === undefined ? "" : maskOf(question, question.current);
  const name = { text: question.ask, tone: "t1" } as const;
  return current ? [name, { text: ` ${current}`, tone: "t2" }] : [name];
}
export function walkBody(walk: Walk, field: Field | null, now: number): Body {
  const answered = answersOf(walk);
  if (walk.phase !== "asking") return { kind: "thread", events: [...answered, { text: endOf(walk, now) }] };
  const question = must(field);
  /** What is wrong is said under the question, which stays: the person reads what is asked and why not. */
  const reason = walk.error ?? (isTyped(question) ? question.wrong?.(walk.typed) : undefined);
  const spans =
    walk.failed && !walk.ignored && reason !== undefined
      ? errorSpans(reason)
      : [{ text: reason ?? "", tone: "t3" as const }];
  const advice = walk.ignored ? { ignored: true as const } : {};
  const wrong = reason === undefined ? [] : [{ text: spans, nested: true, ...advice }];
  /** A confirmation says under it what the act is for: nobody confirms what they were not told. */
  const told = question.kind === "confirm" && question.note !== undefined ? question.note : undefined;
  const note = told === undefined ? [] : [{ text: [{ text: told, tone: "t3" as const }], nested: true }];
  const events = [...answered, { text: askSpans(question) }, ...note, ...wrong];
  if (question.kind === "pick") return { kind: "thread", events, options: pickRows(walk, question) };
  if (isTyped(field)) {
    const typed = walk.typed === "" ? "" : maskOf(field, walk.typed);
    const caret = "mask" in question ? Array.from(typed).length : walk.caret;
    const whole = walk.suggested && typed !== "" ? { suggested: true as const } : {};
    const remaining = "mask" in question ? question.mask.remaining?.(walk.typed) : undefined;
    const padding = "mask" in question && !validOf(question, walk.typed) ? question.mask.padding?.(walk.typed) : 0;
    const shape = { ...(typed && remaining ? { remaining } : {}), ...(typed && padding ? { padding } : {}) };
    return { kind: "thread", events, entry: { typed, caret, placeholder: shapeOf(question), ...whole, ...shape } };
  }
  const options: readonly Row[] = optionsOf(field).map((option, i) => ({
    ...option,
    ...(field?.kind === "many" ? { key: walk.marks.includes(option.title) ? "x" : " " } : {}),
    selected: i === walk.at,
  }));
  return { kind: "thread", events, options, ...(walk.read ? { read: walk.read } : {}) };
}
function enterSays(walk: Walk, field: Field | null, tools: readonly Tool[]): string {
  const options = optionsOf(field);
  if (field?.kind === "confirm") return must(options[walk.at]).title;
  const picked = field?.kind === "pick" ? field.found(walk.finding ? walk.typed : "")[walk.at] : undefined;
  const chosen = picked ? (picked.value ?? picked.title) : (options[walk.at]?.title ?? walk.typed);
  const answer = field?.kind === "many" ? walk.marks.join(" · ") : chosen;
  const act = actOf(tools, walk);
  const last = walk.pos + 1 === walk.until || !act.next([...walk.answers.slice(0, walk.pos), answer]);
  return last ? act.verb : said.keys.next;
}
export function walkHints(walk: Walk, field: Field | null, tools: readonly Tool[]): readonly Hint[] {
  const k = said.keys;
  const leave: Hint = {
    intent: "cancel",
    does: walk.phase === "asking" && walk.pos > walk.floor ? k.goBack : k.cancel,
  };
  if (walk.phase === "done") return [{ intent: "cancel", does: k.close }];
  if (walk.phase === "running") return [leave];
  const enter: Hint = { intent: "confirm", does: enterSays(walk, field, tools) };
  if (isTyped(field)) return validOf(field, walk.typed) ? [enter, leave] : [leave];
  if (
    field?.kind === "many" &&
    (field.unchanged?.(walk.marks.join(" · ")) || field.wrong?.(walk.marks.join(" · ")) !== undefined)
  )
    return [{ intent: "move", does: k.choose }, { intent: "mark", does: k.mark }, leave];
  /** With nothing left to choose, only leaving is left. */
  const free = field?.kind === "pick" ? field.found(walk.finding ? walk.typed : "") : optionsOf(field);
  if (field?.kind === "pick" && free.every(option => option.off)) {
    if (walk.finding) return [{ intent: "cancel", does: k.close }];
    return free.length ? [{ intent: "find", does: k.find }, leave] : [leave];
  }
  if (free.length && free.every(option => option.off)) return [leave];
  const move: Hint = { intent: "move", does: k.choose };
  if (field?.kind === "pick" && !walk.finding && !field.found("").length) return [leave];
  if (field?.kind === "pick" && walk.finding) return [move, enter, { intent: "cancel", does: k.close }];
  if (field?.kind === "pick") return [move, enter, { intent: "find", does: k.find }, leave];
  return field?.kind === "many" ? [move, { intent: "mark", does: k.mark }, enter, leave] : [move, enter, leave];
}
