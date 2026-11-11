// An action as a thread: what was answered, what it asks now, and how it ended. Every action looks like this.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Body, Field, Hint, Row, Span, ThreadEvent } from "./contract.ts";
import type { Tool } from "./shown-tool.ts";
import { errorSpans } from "./talk.ts";
import { must } from "./window.ts";
import { actOf, maskOf, optionsOf, validOf, type Done, type Running, type Walk } from "./screen.ts";

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
const answersOf = (walk: Walk): readonly ThreadEvent[] =>
  walk.asked.slice(0, walk.pos).map(({ ask, shown }) => ({
    text: [
      { text: `${ask} `, tone: "t2" },
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
  const found = question.found(walk.finding ? walk.typed : "");
  const rows = found.map((option, i): Row => {
    const key = walk.finding || i > 8 ? {} : { key: String(i + 1) };
    return { ...option, ...key, selected: i === walk.at && !option.off };
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
  const asking = walk.error === undefined ? askSpans(question) : errorSpans(walk.error);
  const events = [...answered, { text: asking }];
  if (question.kind === "pick") return { kind: "thread", events, options: pickRows(walk, question) };
  if (isTyped(field)) {
    const typed = walk.typed === "" ? "" : maskOf(field, walk.typed);
    const caret = "mask" in question ? Array.from(typed).length : walk.caret;
    return { kind: "thread", events, entry: { typed, caret, placeholder: shapeOf(question) } };
  }
  const options: readonly Row[] = optionsOf(field).map((option, i) => ({
    ...option,
    ...(field?.kind === "many" ? { key: walk.marks.includes(option.title) ? "x" : " " } : {}),
    selected: i === walk.at && !option.off,
  }));
  return { kind: "thread", events, options };
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
  /** With nothing left to choose, only leaving is left. */
  const free = field?.kind === "pick" ? field.found(walk.finding ? walk.typed : "") : optionsOf(field);
  if (!isTyped(field) && free.length && free.every(option => option.off)) return [leave];
  const move: Hint = { intent: "move", does: k.choose };
  if (field?.kind === "pick" && !walk.finding && !field.found("").length) return [leave];
  if (field?.kind === "pick" && walk.finding) return [move, enter, { intent: "cancel", does: k.close }];
  if (field?.kind === "pick") return [move, enter, { intent: "find", does: k.find }, leave];
  return field?.kind === "many" ? [move, { intent: "mark", does: k.mark }, enter, leave] : [move, enter, leave];
}
