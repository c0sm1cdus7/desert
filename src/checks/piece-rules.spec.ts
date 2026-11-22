// Every form rule holds over the bank's pieces of every screen, and each one fails, alone, when its piece is wrong.
import { describe, expect, it } from "vitest";
import { paintedScreens } from "../../tests/support/painted-screens.ts";
import { goldenScreens } from "../../tests/support/write-terminal-frames.ts";
import type { Row, Screen } from "../surface/contract/contract.ts";
import { piecesOf } from "../surface/pieces/pieces-of.ts";
import type { ContentPiece, RowPiece, StackPiece, SurfacePiece, ThreadPiece } from "../surface/pieces/pieces.ts";
import type { ToolbarPiece } from "../surface/pieces/pieces.ts";
import { pieceRules } from "./piece-rules.ts";

const painted = (name: string): Screen => {
  const found = paintedScreens.find(entry => entry.name === name);
  if (!found) throw new Error(`no painted screen named ${name}`);
  return found.screen;
};
/** Every golden screen and every hand-built one. */
const screens = (): readonly Readonly<{ name: string; screen: Screen }>[] => [...goldenScreens(), ...paintedScreens];
type Change = (pieces: SurfacePiece) => SurfacePiece;
const main =
  (change: (main: ContentPiece) => ContentPiece): Change =>
  pieces => {
    const [bar, middle, toolbar] = pieces.zones;
    return { ...pieces, zones: [bar, { ...middle, main: change(middle.main) }, toolbar] };
  };
const toolbar =
  (change: (toolbar: ToolbarPiece) => ToolbarPiece): Change =>
  ({ zones: [bar, middle, rail], ...rest }) => ({ ...rest, zones: [bar, middle, change(rail)] });
const stack = (at: number, change: (stack: StackPiece) => StackPiece): Change =>
  main(content =>
    content.kind === "list"
      ? { ...content, stacks: content.stacks.map((s, i) => (i === at ? change(s) : s)) }
      : content,
  );
const row = (at: number, index: number, change: (row: RowPiece & { as: "text" }) => RowPiece): Change =>
  stack(at, s => ({ ...s, rows: s.rows.map((r, i) => (i === index && r.as === "text" ? change(r) : r)) }));
/** One wrong piece per rule, on a screen that shows what the rule holds. */
const mutations: readonly (readonly [string, string, Change])[] = [
  ["zones-in-order", "focus", main(() => ({ kind: "list", stacks: [] }))],
  [
    "beat-says-the-state",
    "signal lost",
    ({ zones: [bar, ...rest], ...p }) => ({ ...p, zones: [{ ...bar, beat: { ...bar.beat, tone: "ok" } }, ...rest] }),
  ],
  [
    "bar-says-only-the-title",
    "focus",
    ({ zones: [bar, ...rest], ...p }) => ({ ...p, zones: [{ ...bar, clock: { text: "00:00", tone: "t1" } }, ...rest] }),
  ],
  ["fixed-controls", "focus", toolbar(t => ({ ...t, fixed: t.fixed.slice(1) }))],
  ["an-action-iff-its-hint", "focus", toolbar(t => ({ ...t, aids: t.aids.slice(0, -1) }))],
  [
    "action-sends-what-it-says",
    "focus",
    toolbar(t => ({ ...t, aids: t.aids.map(a => ({ ...a, sends: { kind: "cancel" } })) })),
  ],
  [
    "actions-are-verbs",
    "focus",
    toolbar(t => ({ ...t, aids: t.aids.map(a => ({ ...a, does: { ...a.does, text: `${a.does.text}.` } })) })),
  ],
  [
    "off-keeps-place-and-reason",
    "rows of every kind",
    row(0, 2, r => (r.datum ? { ...r, datum: { ...r.datum, tone: "t2" } } : r)),
  ],
  ["chosen-is-what-the-screen-chose", "rows of every kind", row(0, 7, r => ({ ...r, chosen: false }))],
  [
    "datum-leads-what-is-read",
    "rows of every kind",
    row(1, 0, r => (r.datum ? { ...r, datum: { ...r.datum, tone: "t1" } } : r)),
  ],
  ["key-place-is-the-stack's", "rows of every kind", stack(0, s => ({ ...s, keyed: false }))],
  ["says-how-much-is-left", "rows of every kind", stack(0, ({ above: _gone, ...s }) => s)],
  [
    "an-empty-stack-says-so",
    "rows of every kind",
    stack(2, s => (s.empty ? { ...s, empty: { ...s.empty, text: { text: "", tone: "t1" } } } : s)),
  ],
  [
    "turned-down",
    "muted event with a selected attachment",
    main(c =>
      c.kind === "thread"
        ? { ...c, events: c.events.map(e => ({ ...e, text: e.text.map(s => ({ ...s, tone: "t1" })) })) }
        : c,
    ),
  ],
  [
    "entry-shows-its-shape",
    "entry with padding",
    main(c =>
      c.kind === "thread" && c.entry
        ? { ...c, entry: { ...c.entry, written: c.entry.written.map(s => ({ ...s, tone: "t1" })) } }
        : c,
    ),
  ],
  ["small-is-one-notice", "focus", p => ({ ...p, small: { ...p.small, text: { text: "x", tone: "t1" } } })],
];
/** The first golden screen that shows what a rule of the three additions holds. */
const golden = (shows: (screen: Screen) => boolean): Screen => {
  const found = goldenScreens().find(entry => shows(entry.screen));
  if (!found) throw new Error("no golden screen shows it");
  return found.screen;
};
const rowsOf = ({ body }: Screen): readonly Row[] => {
  if (body.kind === "list") return body.stacks.flatMap(s => s.rows);
  return body.kind === "thread" ? (body.options ?? []) : [];
};
const thread = (change: (thread: ThreadPiece) => ThreadPiece): Change =>
  main(c => (c.kind === "thread" ? change(c) : c));
const rowPieces = (change: (row: RowPiece) => RowPiece): Change =>
  main(c => {
    const each = (rows: readonly RowPiece[]) => rows.map(change);
    if (c.kind === "list") return { ...c, stacks: c.stacks.map(s => ({ ...s, rows: each(s.rows) })) };
    return c.kind === "thread" && c.options ? { ...c, options: { ...c.options, rows: each(c.options.rows) } } : c;
  });
const texts = (change: (row: RowPiece & { as: "text" }) => RowPiece): Change =>
  rowPieces(r => (r.as === "text" ? change(r) : r));
const sent = { kind: "choose", row: "other" } as const;
/** One wrong piece per check of the three additions, on the first golden screen that shows what it holds. */
const added: readonly (readonly [string, string, (screen: Screen) => boolean, Change])[] = [
  ["a-row-sends-its-choice", "a row with an id", s => rowsOf(s).some(r => r.id), texts(({ sends: _, ...r }) => r)],
  [
    "a-row-sends-its-choice",
    "a row with an id, sending another",
    s => rowsOf(s).some(r => r.id),
    texts(r => (r.sends ? { ...r, sends: { ...r.sends, row: `${r.sends.row} ` } } : r)),
  ],
  [
    "a-row-sends-its-choice",
    "an off row",
    s => rowsOf(s).some(r => r.off),
    texts(r => (r.off ? { ...r, sends: sent } : r)),
  ],
  [
    "a-row-sends-its-choice",
    "a still row",
    s => rowsOf(s).some(r => r.still && !r.entry && !r.spans),
    texts(r => (r.still ? { ...r, sends: sent } : r)),
  ],
  [
    "a-mark-is-said",
    "a marked option",
    s => rowsOf(s).some(r => r.marked !== undefined),
    texts(r => (r.marked === undefined ? r : { ...r, marked: !r.marked })),
  ],
  [
    "an-entry-says-its-keys",
    "a secret entry",
    s => s.body.kind === "thread" && s.body.entry?.secret === true,
    thread(c => (c.entry ? { ...c, entry: { ...c.entry, secret: false } } : c)),
  ],
  [
    "an-entry-says-its-keys",
    "an entry asking for digits",
    s => s.body.kind === "thread" && s.body.entry?.keyboard === "digits",
    thread(c => (c.entry ? { ...c, entry: { ...c.entry, keyboard: "text" } } : c)),
  ],
  [
    "an-entry-says-its-keys",
    "a row written in",
    s => rowsOf(s).some(r => r.entry),
    rowPieces(r => (r.as === "entry" ? { ...r, entry: { ...r.entry, keyboard: "digits" } } : r)),
  ],
];
/** A multiple question where one option that can be taken does not say whether it is, on its screen and piece. */
function unsaid(): Screen {
  const screen = golden(s => rowsOf(s).some(r => r.marked !== undefined && !r.off));
  const { body } = screen;
  if (body.kind !== "thread" || !body.options) throw new Error("a marked option is in a question");
  const at = body.options.findIndex(r => r.marked !== undefined && !r.off);
  const options = body.options.map((r, i) => {
    if (i !== at) return r;
    const { marked: _gone, ...rest } = r;
    return rest;
  });
  return { ...screen, body: { ...body, options } };
}
/** A secret entry whose screen shows what is written uncovered. */
const uncovered: Screen = {
  ...painted("entry placeholder"),
  body: {
    kind: "thread",
    events: [],
    entry: { typed: "abc", caret: 3, placeholder: "", keyboard: "text", secret: true },
  },
};
describe("pieceRules", () => {
  it("finds nothing wrong in the bank's pieces of every golden and hand-built screen", () => {
    const failing = screens().flatMap(({ name, screen }) =>
      pieceRules(screen, piecesOf(screen)).map(failure => `${name}: ${failure.rule} ${failure.missing}`),
    );
    expect(failing).toEqual([]);
  });
  it.each(mutations)("%s fails alone when its piece is wrong (on %s)", (rule, name, change) => {
    const screen = painted(name);
    const pieces = piecesOf(screen);
    expect(pieceRules(screen, pieces)).toEqual([]);
    const changed = change(pieces);
    expect(changed).not.toEqual(pieces);
    expect([...new Set(pieceRules(screen, changed).map(failure => failure.rule))]).toEqual([rule]);
  });
  it.each(added)("%s fails alone when its piece is wrong (on %s)", (rule, _name, shows, change) => {
    const screen = golden(shows);
    const pieces = piecesOf(screen);
    expect(pieceRules(screen, pieces)).toEqual([]);
    const changed = change(pieces);
    expect(changed).not.toEqual(pieces);
    expect([...new Set(pieceRules(screen, changed).map(failure => failure.rule))]).toEqual([rule]);
  });
  it("says a secret entry whose screen shows it uncovered, and nothing else", () => {
    expect(pieceRules(uncovered, piecesOf(uncovered))).toEqual([{ rule: "an-entry-says-its-keys", missing: "entry" }]);
  });
  it("says options where one says its mark and another does not, and only that", () => {
    const screen = unsaid();
    expect(pieceRules(screen, piecesOf(screen))).toEqual([{ rule: "a-mark-is-said", missing: "options" }]);
  });
  it("finds in no golden screen an off row that does not say why", () => {
    const silent = goldenScreens().flatMap(({ name, screen }) => {
      const { body } = screen;
      const listed = body.kind === "list" ? body.stacks.flatMap(s => s.rows) : [];
      const rows = body.kind === "thread" ? (body.options ?? []) : listed;
      return rows.filter(r => r.off && !r.detail).map(r => `${name}: ${r.title}`);
    });
    expect(silent).toEqual([]);
  });
  it("has one mutation for each rule", () => {
    expect(new Set([...mutations, ...added].map(([rule]) => rule)).size).toBe(19);
  });
});
