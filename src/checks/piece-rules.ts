// The form rules of the approved form, held once over the pieces of a screen: each names what does not hold.
import type { Row, Screen, Span } from "../surface/contract/contract.ts";
import { hintSends } from "../surface/contract/hint-sends.ts";
import { controlNames } from "../surface/pieces/controls.ts";
import type { EntryPiece, NoticePiece, RowPiece, SurfacePiece } from "../surface/pieces/pieces.ts";
import { surfaceTexts as said } from "../texts/surface.texts.ts";
import { asText, groupsOf, type Held, mainOf, notice, pairsOf, same, says, type Thread } from "./piece-pairs.ts";
import { textRows, threadOf, where } from "./piece-pairs.ts";

const beats = {
  connected: ["●", "ok"],
  connecting: ["●", "wait"],
  "signal-lost": ["×", "cut"],
  disconnected: ["×", "t3"],
} as const;
const zones: Held = (screen, { zones: all }) => {
  const middle = all[1];
  /** The type holds the order; pieces that came over a wire are read as they are. */
  const kinds = all.map(zone => ("kind" in zone ? zone.kind : "content"));
  return [
    ...where("zones", same(kinds, ["bar", "content", "toolbar"])),
    ...where("main", middle.main.kind === screen.body.kind),
    ...where("beside", (middle.beside?.kind === "panel") === (screen.panel !== undefined)),
  ];
};
const beat: Held = (screen, { zones: [bar] }) => {
  const [icon, tone] = beats[screen.state];
  return where("beat", bar.beat.state === screen.state && bar.beat.icon === icon && bar.beat.tone === tone);
};
const barTexts: Held = (screen, { zones: [bar] }) => [
  ...where("title", same(bar.title, { text: screen.title, tone: "t1", bold: true })),
  ...where("clock", says(bar.clock, screen.clock, "t1")),
  ...where("battery", screen.battery ? says(bar.battery, screen.battery, "t2") : bar.battery === undefined),
];
const fixed: Held = (screen, { zones: [, , toolbar] }) => [
  ...where(
    "fixed",
    same(
      toolbar.fixed.map(action => action.control),
      [...(screen.menu ? ["menu"] : []), "quit"],
    ),
  ),
  ...toolbar.fixed.flatMap(({ control, key, does }) =>
    control === "menu" || control === "quit"
      ? where(control, says(key, said.chords[control], "t2") && says(does, said.keys[control], "t3"))
      : [control],
  ),
];
const iffHint: Held = (screen, { zones: [, , toolbar] }) =>
  where(
    "aids",
    same(
      toolbar.aids.map(action => action.control),
      screen.hints.map(hint => hint.intent),
    ),
  );
const sends: Held = (_screen, { zones: [, , toolbar] }) =>
  [...toolbar.fixed, ...toolbar.aids].flatMap(({ control, sends: sent }) =>
    where(control, same(sent, control === "menu" || control === "quit" ? { kind: control } : hintSends[control])),
  );
const verbs: Held = (screen, { zones: [, , toolbar] }) =>
  toolbar.aids.flatMap(({ control, key, does }, i) => {
    const verb = screen.hints[i]?.does ?? "";
    const named = control !== "menu" && control !== "quit" && says(key, controlNames[control], "t2");
    return where(`aid ${i}`, verb !== "" && !/[.!?¿¡]/u.test(verb) && says(does, verb, "t3") && named);
  });
const off: Held = (screen, pieces) =>
  textRows(screen, pieces)
    .filter(pair => pair.row.off)
    .flatMap(({ place, row, piece }) => {
      const text = asText(piece);
      const quiet = (span: Span | undefined): boolean =>
        text?.chosen === true || span === undefined || span.tone === "t3";
      const kept =
        text?.off === true &&
        text.key?.text === (row.key || undefined) &&
        text.datum?.text === (row.detail || undefined) &&
        [text.key, text.name, text.datum].every(quiet);
      return where(place, kept);
    });
/** The chosen row, the lit event and the lit attachment are the selected ones; a written row is never lit. */
const chosen: Held = (screen, pieces) => [
  ...pairsOf(screen, pieces).flatMap(({ place, row, piece }) => {
    if (row.spans) return where(place, piece?.as === "line");
    if (row.entry) return where(place, piece?.as === "entry");
    return where(place, asText(piece)?.chosen === (row.selected ?? false));
  }),
  ...(threadOf(screen)?.events ?? []).flatMap((event, i) => {
    const main = mainOf(pieces);
    const piece = main.kind === "thread" ? main.events[i] : undefined;
    const lit = (event.attachments ?? []).map(attachment => attachment.selected ?? false);
    return where(
      `event ${i}`,
      piece?.lit === (event.selected ?? false) &&
        same(
          piece.attached.map(a => a.lit),
          lit,
        ),
    );
  }),
];
const datum: Held = (screen, pieces) =>
  textRows(screen, pieces).flatMap(({ place, row, piece, reads }) => {
    const text = asText(piece);
    const fact = (reads || row.still === true) && Boolean(row.detail);
    if (text?.whole !== (fact ? "datum" : "name")) return [place];
    if (!fact || text.chosen || text.off) return [];
    return where(place, text.name.tone === "t2" && text.datum?.tone === (row.tone ?? "t1"));
  });
const keyPlace: Held = (screen, pieces) =>
  groupsOf(screen, pieces).flatMap(group => where(group.place, group.piece?.keyed === group.rows.some(row => row.key)));
const counted = (n: number | undefined, way: "above" | "below", piece: NoticePiece | undefined): boolean =>
  n ? same(piece, notice(way, `${way === "above" ? "↑" : "↓"} ${n} ${said.more}`, "t3")) : piece === undefined;
const howMuch: Held = (screen, pieces) =>
  groupsOf(screen, pieces).flatMap(({ place, above, below, piece }) =>
    where(place, counted(above, "above", piece?.above) && counted(below, "below", piece?.below)),
  );
const emptyStack: Held = (screen, pieces) =>
  groupsOf(screen, pieces)
    .filter(group => group.piece?.kind === "stack")
    .flatMap(({ place, rows, empty, piece }) => {
      const shown = piece?.kind === "stack" ? piece.empty : undefined;
      return where(place, rows.length ? shown === undefined : same(shown, notice("empty", empty ?? "", "t1")));
    });
/** Composed as each event, attachment and panel says it: what is turned down is all in the faintest tone. */
const quieted = (spans: readonly Span[], muted: boolean): readonly Span[] =>
  muted ? spans.map(span => ({ ...span, tone: "t3" })) : spans;
const attachedLine = (
  muted: boolean,
  { title, detail, selected }: { title: string; detail: string; selected?: boolean },
) =>
  muted && !selected
    ? [{ text: `${title} · ${detail}`, tone: "t3" }]
    : [
        { text: title, tone: "t1", bold: true },
        { text: ` · ${detail}`, tone: "t3" },
      ];
const turnedDown: Held = (screen, pieces) => {
  const main = mainOf(pieces);
  const events = (threadOf(screen)?.events ?? []).flatMap((event, i) => {
    const piece = main.kind === "thread" ? main.events[i] : undefined;
    const muted = event.muted ?? false;
    const head = event.head ? quieted(event.head, muted) : undefined;
    const lines = (event.attachments ?? []).map(attachment => attachedLine(muted, attachment));
    const composed =
      same(piece?.head, head) &&
      same(piece?.text, quieted(event.text, muted)) &&
      same(
        piece?.attached.map(a => a.line),
        lines,
      );
    return where(`event ${i}`, composed);
  });
  const { panel } = screen;
  const beside = pieces.zones[1].beside;
  const quiet = !(panel?.focused ?? true);
  const drawn =
    !panel ||
    (says(beside?.title, panel.title, quiet ? "t3" : "t1") &&
      says(beside?.detail, panel.detail ?? "", "t3") &&
      same(
        beside?.lines,
        panel.lines.map(line => quieted(line, quiet)),
      ));
  return [...events, ...where("panel", drawn)];
};
/** Placeholder iff nothing is written; the leading padding and the shape still to fill in the faintest tone; no caret
 * iff what is written is lit whole. */
function threadShape(entry: NonNullable<Thread["entry"]>, piece: EntryPiece | undefined): boolean {
  const { typed, remaining = "", padding = 0 } = entry;
  const whole = entry.suggested === true;
  const written = piece?.written ?? [];
  const shown = written.map(span => span.text).join("");
  const first = written[0];
  const last = written.at(-1);
  return (
    piece?.whole === whole &&
    (piece.caret === undefined) === whole &&
    (typed
      ? piece.placeholder === undefined && shown === typed + remaining
      : written.length === 0 && says(piece.placeholder, entry.placeholder, "t3")) &&
    (!typed || !remaining || says(last, remaining, "t3")) &&
    (!typed || !padding || whole || says(first, typed.slice(0, padding), "t3"))
  );
}
const rowShape = (row: Row, piece: RowPiece | undefined): boolean =>
  piece?.as === "entry" &&
  !piece.entry.whole &&
  piece.entry.written.map(span => span.text).join("") === row.entry?.typed &&
  piece.entry.caret?.at === row.entry.caret &&
  same(piece.entry.label, row.title ? { text: row.title, tone: "t2" } : undefined);
const entryShape: Held = (screen, pieces) => {
  const entry = threadOf(screen)?.entry;
  const main = mainOf(pieces);
  const piece = main.kind === "thread" ? main.entry : undefined;
  return [
    ...where("entry", entry ? threadShape(entry, piece) : piece === undefined),
    ...pairsOf(screen, pieces)
      .filter(pair => pair.row.entry)
      .flatMap(({ place, row, piece: written }) => where(place, rowShape(row, written))),
  ];
};

/** A row that can be chosen sends its choice, and it names that row; a row that cannot, off or still, sends none. */
const sendsChoice: Held = (screen, pieces) =>
  pairsOf(screen, pieces).flatMap(({ place, row, piece }) => {
    const text = asText(piece);
    if (!row.id) return where(place, text?.sends === undefined);
    return where(place, same(text?.sends, { kind: "choose", row: row.id }) && !text?.off && !text?.still);
  });
/** A mark is said on the piece iff on the row, it says what the key shows, and every option that can be taken says
 * it or none does. */
const markSaid: Held = (screen, pieces) => [
  ...textRows(screen, pieces).flatMap(({ place, row, piece }) => {
    const marked = asText(piece)?.marked;
    return where(
      place,
      marked === row.marked && (marked === undefined || marked === (asText(piece)?.key?.text === "x")),
    );
  }),
  ...groupsOf(screen, pieces)
    .filter(group => group.piece?.kind === "options")
    .flatMap(({ place, piece }) => {
      const saying = (piece?.rows ?? []).flatMap(r => (r.as === "text" && !r.off ? [r.marked !== undefined] : []));
      return where(place, saying.every(Boolean) || !saying.some(Boolean));
    }),
];
/** Every character a secret entry shows is covered. */
const covered = (written: readonly Span[]): boolean =>
  written.every(span => Array.from(span.text).every(character => character === "•"));
const threadKeys = (entry: NonNullable<Thread["entry"]>, piece: EntryPiece | undefined): boolean =>
  piece?.keyboard === entry.keyboard &&
  piece.secret === (entry.secret === true) &&
  (!piece.secret || covered(piece.written));
/** An entry says the keys it asks for, the screen's or text in a row, and whether it is a secret, shown covered. */
const entryKeys: Held = (screen, pieces) => {
  const entry = threadOf(screen)?.entry;
  const main = mainOf(pieces);
  const piece = main.kind === "thread" ? main.entry : undefined;
  return [
    ...where("entry", !entry || threadKeys(entry, piece)),
    ...pairsOf(screen, pieces)
      .filter(pair => pair.row.entry)
      .flatMap(({ place, piece: row }) =>
        where(place, row?.as === "entry" && row.entry.keyboard === "text" && !row.entry.secret),
      ),
  ];
};

/** Every rule, by the name a failure carries. */
const rules = [
  ["zones-in-order", zones],
  ["beat-says-the-state", beat],
  ["bar-says-only-the-title", barTexts],
  ["fixed-controls", fixed],
  ["an-action-iff-its-hint", iffHint],
  ["action-sends-what-it-says", sends],
  ["actions-are-verbs", verbs],
  ["off-keeps-place-and-reason", off],
  ["chosen-is-what-the-screen-chose", chosen],
  ["datum-leads-what-is-read", datum],
  ["key-place-is-the-stack's", keyPlace],
  ["says-how-much-is-left", howMuch],
  ["an-empty-stack-says-so", emptyStack],
  ["turned-down", turnedDown],
  ["entry-shows-its-shape", entryShape],
  ["a-row-sends-its-choice", sendsChoice],
  ["a-mark-is-said", markSaid],
  ["an-entry-says-its-keys", entryKeys],
  ["small-is-one-notice", (_screen, { small }) => where("small", same(small, notice("small", said.tooSmall, "t1")))],
] as const satisfies readonly (readonly [string, Held])[];
/** One rule that does not hold over the pieces of one screen, and where. */
export interface PieceFailure {
  readonly rule: (typeof rules)[number][0];
  readonly missing: string;
}
/** Every form rule over the pieces a bank made of one screen: empty when they say what the approved form says. */
export function pieceRules(screen: Screen, pieces: SurfacePiece): readonly PieceFailure[] {
  return rules.flatMap(([rule, check]) => check(screen, pieces).map(missing => ({ rule, missing })));
}
