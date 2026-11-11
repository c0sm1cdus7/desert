// An action as a thread: what was answered, what it asks now, and how it ended. Every action looks like this.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Body, Field, Hint, Row, Span, ThreadEvent, Tool } from "./contract.ts";
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

export function walkBody(walk: Walk, field: Field | null, now: number): Body {
  const answered = answersOf(walk);
  if (walk.phase !== "asking") return { kind: "thread", events: [...answered, { text: endOf(walk, now) }] };
  const question = must(field);
  const asking = walk.error === undefined ? [{ text: question.ask, tone: "t1" } as const] : errorSpans(walk.error);
  const events = [...answered, { text: asking }];
  if (isTyped(field)) {
    const typed = walk.typed === "" ? "" : maskOf(field, walk.typed);
    const caret = "mask" in question ? Array.from(typed).length : walk.caret;
    return { kind: "thread", events, entry: { typed, caret, placeholder: shapeOf(question) } };
  }
  const options: readonly Row[] = optionsOf(field).map((option, i) => ({
    ...option,
    ...(field?.kind === "many" ? { key: walk.marks.includes(option.title) ? "x" : " " } : {}),
    selected: i === walk.at,
  }));
  return { kind: "thread", events, options };
}
function enterSays(walk: Walk, field: Field | null, tools: readonly Tool[]): string {
  const options = optionsOf(field);
  if (field?.kind === "confirm") return must(options[walk.at]).title;
  const answer = field?.kind === "many" ? walk.marks.join(" · ") : (options[walk.at]?.title ?? walk.typed);
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
  const move: Hint = { intent: "move", does: k.choose };
  return field?.kind === "many" ? [move, { intent: "mark", does: k.mark }, enter, leave] : [move, enter, leave];
}
