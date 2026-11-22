// A renderer against the screen it was handed, as plain data: what it drew in, named failures out; no cells, no DOM.
import type { HintKey, Intent, Screen } from "../surface/contract/contract.ts";
import { hintSends } from "../surface/contract/hint-sends.ts";
import { wire } from "../surface/contract/wire.ts";
import { chosenText, hintTexts, mainTexts, panelTexts } from "./surface-walk.ts";

/** What a renderer drew for one Screen, read back from its own output. */
export interface Drawn {
  /** The lines of the Barra, as read. */
  readonly bar: readonly string[];
  /** The lines of the content zone, in reading order. */
  readonly main: readonly string[];
  readonly panel?: readonly string[];
  readonly toolbar: readonly string[];
  /** Every text drawn as the chosen thing. */
  readonly marked: readonly string[];
  /** Which of the four states the Barra shows, as the renderer drew it. */
  readonly state: Screen["state"];
  /** Whether a control that goes to the Menu is drawn. */
  readonly menu: boolean;
  readonly controls: readonly { readonly hint: HintKey; readonly name: string; readonly sends: readonly Intent[] }[];
}
type Check =
  | "shows-every-text-in-order"
  | "title-in-bar"
  | "marks-the-chosen"
  | "control-sends-what-it-says"
  | "a-control-iff-its-hint"
  | "menu-iff-offered"
  | "shows-the-state"
  | "adds-no-words";
/** One check that does not hold, and what it misses. */
export interface Failure {
  readonly check: Check;
  readonly missing: string;
}
const squeeze = (text: string): string => text.replace(/\s+/gu, "");
/** The first expected text that does not show up, in this order, however the renderer wrapped it. */
function outOfOrder(drawn: readonly string[], expected: readonly string[]): string | undefined {
  const seen = squeeze(drawn.join(""));
  let from = 0;
  for (const text of expected.map(squeeze).filter(Boolean)) {
    const at = seen.indexOf(text, from);
    if (at < 0) return text;
    from = at;
  }
  return undefined;
}
function inOrder(screen: Screen, drawn: Drawn): readonly string[] {
  const missing = [
    screen.panel?.full ? undefined : outOfOrder(drawn.main, mainTexts(screen)),
    screen.panel ? outOfOrder(drawn.panel ?? [], panelTexts(screen)) : undefined,
    outOfOrder(drawn.toolbar, hintTexts(screen)),
  ];
  return missing.filter(text => text !== undefined);
}
const same = (a: Intent, b: Intent): boolean =>
  a.kind === b.kind && ("text" in a ? a.text : "") === ("text" in b ? b.text : "");
/** What a control sends that its hint does not promise; a move sends up or down, and nothing else. */
function wrongSends({ hint, sends }: Drawn["controls"][number]): string | undefined {
  const promised = hintSends[hint];
  const fine =
    promised === "move"
      ? sends.length > 0 && sends.every(intent => intent.kind === "up" || intent.kind === "down")
      : sends.length === 1 && sends.every(intent => same(intent, promised));
  return fine ? undefined : `${hint}: ${JSON.stringify(sends)}`;
}
function controlsAndHints(screen: Screen, drawn: Drawn): readonly string[] {
  const hinted = new Set(screen.hints.map(hint => hint.intent));
  const drawnHints = new Set(drawn.controls.map(control => control.hint));
  return [
    ...[...hinted].filter(hint => !drawnHints.has(hint)).map(hint => `${hint}/no-control`),
    ...[...drawnHints].filter(hint => !hinted.has(hint)).map(hint => `${hint}/no-hint`),
  ];
}
const enums = new Set(["kind", "tone", "state", "intent", "fg", "bg", "id", "keyboard"]);
/** Every string the wired screen holds as text, walked whole: its kinds, tones and colors are no words, and neither
 * are a row's identity nor the keys an entry asks for, which are sent back or read, never drawn. */
function textsIn(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textsIn);
  if (typeof value !== "object" || value === null) return [];
  return Object.entries(value).flatMap(([key, inner]) => (enums.has(key) ? [] : textsIn(inner)));
}
const wordsOf = (text: string): readonly string[] => text.match(/\p{L}+/gu) ?? [];
/** Each word drawn that no screen text, bar datum or catalog entry has; one cut with … counts by its prefix. */
function addedWords(screen: Screen, drawn: Drawn, catalog: readonly string[]): readonly string[] {
  const known = new Set([...textsIn(wire(screen)), screen.clock, screen.battery ?? "", ...catalog].flatMap(wordsOf));
  const lines = [...drawn.bar, ...drawn.main, ...(drawn.panel ?? []), ...drawn.toolbar, ...drawn.marked];
  const names = drawn.controls.map(control => control.name);
  const added = [...lines, ...names].flatMap(line =>
    [...line.matchAll(/\p{L}+(…)?/gu)].flatMap(([word, cut]) => {
      const bare = cut ? word.slice(0, -1) : word;
      const fits = cut ? [...known].some(whole => whole.startsWith(bare)) : known.has(bare);
      return fits ? [] : [bare];
    }),
  );
  return [...new Set(added)];
}
/** Every check of the contract on what one renderer drew for one screen; empty when it drew what it was handed. */
export function conformance(screen: Screen, drawn: Drawn, catalog: readonly string[]): readonly Failure[] {
  const chosen = chosenText(screen);
  const failed = (check: Check, missing: readonly (string | undefined)[]): readonly Failure[] =>
    missing.filter(text => text !== undefined).map(text => ({ check, missing: text }));
  return [
    ...failed("shows-every-text-in-order", inOrder(screen, drawn)),
    ...failed("title-in-bar", [squeeze(drawn.bar.join("")).includes(squeeze(screen.title)) ? undefined : screen.title]),
    ...failed("marks-the-chosen", [
      chosen === undefined || squeeze(drawn.marked.join("")).includes(squeeze(chosen)) ? undefined : chosen,
    ]),
    ...failed("control-sends-what-it-says", drawn.controls.map(wrongSends)),
    ...failed("a-control-iff-its-hint", controlsAndHints(screen, drawn)),
    ...failed("menu-iff-offered", [drawn.menu === screen.menu ? undefined : `menu: ${String(drawn.menu)}`]),
    ...failed("shows-the-state", [drawn.state === screen.state ? undefined : drawn.state]),
    ...failed("adds-no-words", addedWords(screen, drawn, catalog)),
  ];
}
