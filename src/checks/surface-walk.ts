// Walks a surface by its own intents, from a fresh set of tools each time, so no path has to be written by hand.
import { workingLanguage, type Language } from "../fields/languages.ts";
import type { Hint, Intent, Screen, Span, ThreadEvent } from "../surface/contract/contract.ts";
import type { Tool } from "../surface/contract/shown-tool.ts";
import { resolve } from "../surface/router/resolve.ts";
import { actOf, start, type Session } from "../surface/session/screen.ts";
import { finished, settled, step } from "../surface/router/step.ts";

/** The Barra a walk reads its screens under: a fixed hour, in the language of whoever walks. */
const barIn = (language: Language) => ({ state: "connected", clock: "14:32", now: 5_000, language }) as const;
const tries: readonly Intent[] = [
  { kind: "confirm" },
  { kind: "down" },
  { kind: "up" },
  { kind: "switch" },
  { kind: "type", text: "x" },
  { kind: "type", text: "f" },
  /** A space marks an option of a many question, and starts looking for something on a menu. */
  { kind: "type", text: " " },
  { kind: "erase" },
  { kind: "cancel" },
];
export interface Stop {
  readonly screen: Screen;
  readonly path: readonly Intent[];
}
/** The session a path leaves, from the Menu or from where it is given: each act it starts has run and each message
 * it sends has been answered before the next intent, as a person who waits sees it. */
export async function replayed(
  tools: readonly Tool[],
  path: readonly Intent[],
  from = start,
  language: Language = workingLanguage,
): Promise<Session> {
  let session: Session = from;
  for (const intent of path) {
    const stepped = step(session, intent, tools, barIn(language).now, language);
    session = stepped.session;
    const { run, sending } = stepped;
    if (sending) session = settled(session, sending, await sending);
    if (run) {
      session = finished(session, run, await actOf(tools, run).run(run.answers), "14:33");
    }
  }
  return session;
}
const replay = async (tools: readonly Tool[], path: readonly Intent[], rows: number, language: Language) =>
  resolve(await replayed(tools, path, start, language), tools, barIn(language), { rows });
/** Every distinct screen within reach, each with the intents that reach it; then the screen of each path given,
 * for what lies deeper than the walk goes before its cap: a path is written by hand, a screen never is. */
export async function surfaceWalk(
  fresh: () => readonly Tool[],
  rows: number,
  most: number,
  also: readonly (readonly Intent[])[] = [],
  language: Language = workingLanguage,
): Promise<readonly Stop[]> {
  const seen = new Map<string, Stop>();
  const queue: Intent[][] = [[]];
  let budget = most * 30; // Most paths land on a screen already seen: stop looking long before they all run out.
  while (queue.length && seen.size < most && budget-- > 0) {
    const path = queue.shift() ?? [];
    const screen = await replay(fresh(), path, rows, language);
    const key = JSON.stringify(screen);
    if (seen.has(key)) continue;
    seen.set(key, { screen, path });
    for (const intent of tries) queue.push([...path, intent]);
  }
  for (const path of also) {
    const screen = await replay(fresh(), path, rows, language);
    const key = JSON.stringify(screen);
    if (!seen.has(key)) seen.set(key, { screen, path });
  }
  return [...seen.values()];
}
const plain = (spans: readonly Span[]): string => spans.map(span => span.text).join("");
const eventTexts = (event: ThreadEvent): readonly string[] => [
  ...(event.head ? [plain(event.head)] : []),
  ...(event.quote ? [event.quote] : []),
  plain(event.text),
  ...(event.attachments ?? []).flatMap(attachment => [attachment.title, attachment.detail]),
];
/** What the person has to be able to read in the main part, in order. */
export function mainTexts({ body }: Screen): readonly string[] {
  if (body.kind === "focus") return [body.title, ...body.lines.map(plain)];
  if (body.kind === "list") {
    return body.stacks.flatMap(stack => [
      stack.title,
      ...(stack.rows.length ? [] : [stack.empty ?? ""]),
      ...stack.rows.flatMap(row => [...(row.key ? [`[${row.key}]`] : []), row.title, row.detail ?? ""]),
    ]);
  }
  return [
    ...body.events.flatMap(eventTexts),
    ...(body.options ?? []).flatMap(row => [row.title, row.detail ?? ""]),
    ...(body.reference ? [body.reference] : []),
    ...(body.entry ? [body.entry.typed || body.entry.placeholder] : []),
  ];
}
export const panelTexts = ({ panel }: Screen): readonly string[] =>
  panel ? [panel.title, panel.detail ?? "", ...panel.lines.slice(panel.top).map(plain)] : [];
export const hintTexts = ({ hints }: Screen): readonly Hint["does"][] => hints.map(hint => hint.does);
/** The texts that have to be highlighted: at most one thing has the focus. */
export function chosenText({ body }: Screen): string | undefined {
  if (body.kind === "focus") return undefined;
  if (body.kind === "list") return body.stacks.flatMap(stack => stack.rows).find(row => row.selected)?.title;
  const option = body.options?.find(row => row.selected)?.title;
  if (option) return option;
  const event = body.events.find(known => known.selected);
  if (event) return plain(event.text);
  return body.events.flatMap(known => known.attachments ?? []).find(attachment => attachment.selected)?.title;
}
