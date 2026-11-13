// Talking to a tool: one thread, one Entrada, and what opened beside it. Which part has the focus decides the keys.
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import type { Attachment, Body, Hint, Intent, Panel, Span, ThreadEvent } from "./contract.ts";
import type { Conversation, Said, Tool } from "./shown-tool.ts";
import { must } from "./window.ts";

export interface Talk {
  readonly kind: "talk";
  readonly tool: string;
  readonly target?: string;
  readonly typed: string;
  readonly caret: number;
  /** What is focused in the thread, -1 for nothing: messages and attachments, in order. */
  readonly at: number;
  readonly open?: string;
  readonly inPanel: boolean;
  readonly full: boolean;
  readonly top: number;
  readonly refused?: string;
  readonly sending?: Promise<string | undefined>;
  /** A question left for later, and where the cursor is on the one being answered. */
  readonly later?: string;
  readonly option: number;
}
const quiet = { typed: "", caret: 0, at: -1, inPanel: false, full: false, top: 0, option: 0 };
export function startTalk(tool: string, target?: string): Talk {
  const there = target === undefined ? {} : { target };
  return { kind: "talk", tool, ...there, ...quiet };
}
export const conversationOf = (tool: Tool, target?: string): Conversation =>
  must(target === undefined ? tool.conversation : tool.conversationAt?.(target));
type Stop = { readonly said: Said; readonly attachment?: Attachment & { readonly id: string } };
const plainOf = (text: Said["text"]): string =>
  typeof text === "string" ? text : text.map(span => span.text).join("");
const stopsOf = (all: readonly Said[]): readonly Stop[] =>
  all
    .filter(item => !item.nested)
    .flatMap(item => [{ said: item }, ...(item.attachments ?? []).map(attachment => ({ said: item, attachment }))]);
const quoteOf = ({ who, text }: Said): string => `↳ ${who?.[0]?.text ?? ""} · ${plainOf(text)}`;

/** What could not be done, the same in a thread and in an action. */
export const errorSpans = (reason: string): readonly Span[] => [
  { text: `${said.error} `, tone: "cut" },
  { text: reason, tone: "t1" },
];
function eventsOf(place: Talk, talk: Conversation): readonly ThreadEvent[] {
  const stop = stopsOf(talk.said())[place.at];
  const quiet = place.inPanel || stop !== undefined;
  const events = talk.said().map((item): ThreadEvent => {
    const on = stop?.said === item;
    return {
      ...(item.who ? { head: item.who } : {}),
      ...(item.quote ? { quote: item.quote } : {}),
      ...(item.nested ? { nested: true } : {}),
      text: typeof item.text === "string" ? [{ text: item.text, tone: "t1" }] : item.text,
      attachments: (item.attachments ?? []).map(({ id, ...shown }) => ({
        ...shown,
        selected: on && stop.attachment?.id === id,
      })),
      selected: on && !stop.attachment,
      muted: quiet && !(on && !place.inPanel),
    };
  });
  const live = talk.live();
  const refused: readonly ThreadEvent[] = place.refused ? [{ text: errorSpans(place.refused) }] : [];
  return [...events, ...(live ? [{ text: live, muted: quiet }] : []), ...refused];
}
const asking = (place: Talk, talk: Conversation) => {
  const question = talk.pending?.();
  return question && question.id !== place.later && !place.inPanel ? question : null;
};
/** Whether what is typed is being written: not while reading the panel; with a question, only on its own words. */
export function writesMessage(place: Talk, talk: Conversation): boolean {
  const question = asking(place, talk);
  return question ? question.options[place.option] === undefined : !place.inPanel;
}
export function talkBody(place: Talk, talk: Conversation): Body {
  const stop = stopsOf(talk.said())[place.at];
  const question = asking(place, talk);
  const placeholder = stop ? said.talk.answering : said.talk.writing;
  if (question) {
    const rows = question.options.map((row, i) => ({ ...row, selected: i === place.option }));
    const writing = place.option === rows.length;
    const other = { title: said.talk.other, ...(writing ? { entry: { typed: place.typed, caret: place.caret } } : {}) };
    return { kind: "thread", events: eventsOf(place, talk), options: [...rows, other] };
  }
  return {
    kind: "thread",
    events: eventsOf(place, talk),
    ...(stop && !stop.attachment && place.typed ? { reference: quoteOf(stop.said) } : {}),
    ...(place.inPanel ? {} : { entry: { typed: place.typed, caret: place.caret, placeholder } }),
  };
}
export const talkPanel = (place: Talk, talk: Conversation): Panel | undefined =>
  place.open === undefined
    ? undefined
    : { ...talk.open(place.open), focused: place.inPanel, full: place.full, top: place.top };

export function talkHints(place: Talk, talk: Conversation): readonly Hint[] {
  const t = said.talk;
  const question = asking(place, talk);
  if (question) {
    const writing = place.option === question.options.length;
    return [
      { intent: "move", does: said.keys.choose },
      ...(writing && !place.typed.trim() ? [] : [{ intent: "confirm" as const, does: t.answer }]),
      { intent: "cancel", does: t.later },
    ];
  }
  if (place.inPanel) {
    return [
      { intent: "move", does: t.scroll },
      { intent: "full", does: place.full ? t.split : t.fullscreen },
      ...(place.full ? [] : [{ intent: "switch" as const, does: t.toThread }]),
      { intent: "cancel", does: said.keys.close },
    ];
  }
  const stop = stopsOf(talk.said())[place.at];
  const enter = (): readonly Hint[] => {
    if (place.typed) return [{ intent: "confirm", does: t.send }];
    if (stop?.attachment) return [{ intent: "confirm", does: said.keys.open }];
    return stop?.said.act ? [{ intent: "confirm", does: stop.said.act.does }] : [];
  };
  return [
    { intent: "move", does: t.message },
    ...enter(),
    ...(place.open === undefined ? [] : [{ intent: "switch" as const, does: t.toPanel }]),
    { intent: "cancel", does: place.at >= 0 ? t.unfocus : said.keys.goBack },
  ];
}
/** One edit of what is being written, the same in a thread and in an action; undefined if the key is not one. */
export function edited<T extends { readonly typed: string; readonly caret: number }>(
  place: T,
  key: Intent,
): T | undefined {
  const chars = Array.from(place.typed);
  const { caret } = place;
  if (key.kind === "type") return { ...place, typed: chars.toSpliced(caret, 0, key.text).join(""), caret: caret + 1 };
  if (key.kind === "erase" && caret > 0)
    return { ...place, typed: chars.toSpliced(caret - 1, 1).join(""), caret: caret - 1 };
  if (key.kind === "left") return { ...place, caret: Math.max(caret - 1, 0) };
  if (key.kind === "right") return { ...place, caret: Math.min(caret + 1, chars.length) };
  return undefined;
}
function inPanel(place: Talk, key: Intent, lines: number): Talk | "leave" {
  if (key.kind === "up") return { ...place, top: Math.max(place.top - 1, 0) };
  if (key.kind === "down") return { ...place, top: Math.min(place.top + 1, Math.max(lines - 1, 0)) };
  if (key.kind === "switch") return place.full ? place : { ...place, inPanel: false };
  if (key.kind === "type" && key.text === "f") return { ...place, full: !place.full };
  if (key.kind !== "cancel") return place;
  const { open: _closed, ...closed } = place;
  return { ...closed, inPanel: false, full: false, top: 0 };
}
type Question = NonNullable<ReturnType<NonNullable<Conversation["pending"]>>>;
function answering(place: Talk, key: Intent, talk: Conversation, question: Question): Talk {
  const last = question.options.length;
  if (key.kind === "up") return { ...place, option: Math.max(place.option - 1, 0) };
  if (key.kind === "down") return { ...place, option: Math.min(place.option + 1, last) };
  if (key.kind === "cancel") return { ...place, later: question.id, option: 0 };
  const chosen = question.options[place.option];
  if (!chosen && key.kind !== "confirm") return edited(place, key) ?? place;
  if (key.kind !== "confirm") return place;
  const answer = chosen?.title ?? place.typed.trim();
  return answer ? { ...place, sending: talk.send(answer, undefined, question.id) } : place;
}
/** What the house said about the message: accepted, it leaves the Entrada; refused, it stays with its reason. */
export function sent(place: Talk, refused: string | undefined): Talk {
  const { sending: _settled, refused: _before, ...rest } = place;
  return refused ? { ...rest, refused } : { ...rest, typed: "", caret: 0, at: -1, option: 0 };
}
/** Enter on a message that carries an act, with nothing typed, opens that act on the message. */
export function actedOn(place: Talk, key: Intent, talk: Conversation) {
  if (key.kind !== "confirm" || place.sending || place.typed.trim() || place.inPanel || asking(place, talk))
    return undefined;
  const stop = stopsOf(talk.said())[place.at];
  if (!stop?.said.act || stop.attachment) return undefined;
  return { tool: stop.said.act.tool, act: stop.said.act.name, target: stop.said.id };
}
/** One intent on a conversation; "leave" hands it back to whoever opened it. */
export function talkStep(place: Talk, key: Intent, talk: Conversation): Talk | "leave" {
  const stops = stopsOf(talk.said());
  const question = asking(place, talk);
  if (place.sending && key.kind === "confirm") return place;
  if (question) return answering(place, key, talk, question);
  if (place.inPanel) return inPanel(place, key, place.open === undefined ? 0 : talk.open(place.open).lines.length);
  if (key.kind === "cancel") return place.at >= 0 ? { ...place, at: -1 } : "leave";
  if (key.kind === "switch") return place.open === undefined ? place : { ...place, inPanel: true };
  if (key.kind === "up") {
    if (place.at === 0) talk.older?.();
    return { ...place, at: place.at < 0 ? stops.length - 1 : Math.max(place.at - 1, 0) };
  }
  if (key.kind === "down") return { ...place, at: place.at < 0 || place.at >= stops.length - 1 ? -1 : place.at + 1 };
  if (key.kind !== "confirm") return edited(place, key) ?? place;
  const stop = stops[place.at];
  if (place.typed.trim())
    return { ...place, sending: talk.send(place.typed, stop && !stop.attachment ? quoteOf(stop.said) : undefined) };
  return stop?.attachment ? { ...place, open: stop.attachment.id, inPanel: true, top: 0, at: -1 } : place;
}
