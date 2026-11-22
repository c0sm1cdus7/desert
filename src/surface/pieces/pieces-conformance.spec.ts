// The bank as renderer zero: what its pieces say, read as a renderer would draw it, passes the conformance kit.
import { expect, it } from "vitest";
import { walked } from "../../../tests/support/surface-tools.ts";
import { conformance, type Drawn } from "../../checks/renderer-conformance.ts";
import { surfaceTexts as said } from "../../texts/surface.texts.ts";
import { piecesOf } from "./pieces-of.ts";
import type { ContentPiece, EntryPiece, EventPiece, RowPiece, SurfacePiece, Text } from "./pieces.ts";

const catalog = [
  ...Object.values(said.controls),
  ...Object.values(said.chords),
  ...Object.values(said.keys),
  said.more,
  said.tooSmall,
];
const plain = (text: Text): string => text.map(span => span.text).join("");
const entryTexts = (entry: EntryPiece): readonly string[] => [
  ...(entry.label ? [entry.label.text] : []),
  entry.written.length ? plain(entry.written) : (entry.placeholder?.text ?? ""),
];
function rowTexts(row: RowPiece): readonly string[] {
  if (row.as === "line") return [plain(row.line)];
  if (row.as === "entry") return entryTexts(row.entry);
  return [...(row.key ? [`[${row.key.text}]`] : []), row.name.text, row.datum?.text ?? ""];
}
const eventTexts = (event: EventPiece): readonly string[] => [
  ...(event.head ? [plain(event.head)] : []),
  ...(event.quote ? [event.quote.text] : []),
  plain(event.text),
  ...event.attached.map(attached => plain(attached.line)),
];
function mainOf(main: ContentPiece): readonly string[] {
  if (main.kind === "focus") return [main.title.text, ...main.lines.map(plain)];
  if (main.kind === "list")
    return main.stacks.flatMap(stack => [
      stack.title.text,
      ...[stack.above, stack.empty].flatMap(notice => (notice ? [notice.text.text] : [])),
      ...stack.rows.flatMap(rowTexts),
      ...(stack.below ? [stack.below.text.text] : []),
    ]);
  return [
    ...main.events.flatMap(eventTexts),
    ...(main.options?.rows ?? []).flatMap(row => rowTexts(row).filter(text => !/^\[.*\]$/u.test(text))),
    ...(main.reference ? [main.reference.text.text] : []),
    ...(main.entry ? entryTexts(main.entry) : []),
  ];
}
/** What is drawn as the chosen thing: a chosen row, a lit event or attachment, what is written lit whole. */
function markedOf(main: ContentPiece): readonly string[] {
  if (main.kind === "focus") return [];
  const rows = main.kind === "list" ? main.stacks.flatMap(stack => stack.rows) : (main.options?.rows ?? []);
  const events = main.kind === "thread" ? main.events : [];
  return [
    ...rows.flatMap(row => (row.as === "text" && row.chosen ? rowTexts(row) : [])),
    ...events.flatMap(event => [
      ...(event.lit ? [plain(event.text)] : []),
      ...event.attached.flatMap(attached => (attached.lit ? [plain(attached.line)] : [])),
    ]),
    ...(main.kind === "thread" && main.entry?.whole ? [plain(main.entry.written)] : []),
  ];
}
/** The pieces, read as a renderer that draws every one of them in order. */
function drawnOf({ zones: [bar, { main, beside }, toolbar] }: SurfacePiece): Drawn {
  const actions = [...toolbar.fixed, ...toolbar.aids];
  return {
    bar: [[bar.title, bar.clock, ...(bar.battery ? [bar.battery] : [])].map(span => span.text).join(" ")],
    main: beside?.full ? [] : mainOf(main),
    ...(beside ? { panel: [beside.title.text, beside.detail.text, ...beside.lines.slice(beside.top).map(plain)] } : {}),
    toolbar: [actions.map(action => `${action.key.text} ${action.does.text}`).join("  ")],
    marked: markedOf(main),
    state: bar.beat.state,
    menu: toolbar.fixed.some(action => action.control === "menu"),
    controls: toolbar.aids.flatMap(({ control, key, sends }) =>
      control === "menu" || control === "quit"
        ? []
        : [{ hint: control, name: key.text, sends: sends === "move" ? [{ kind: "up" }, { kind: "down" }] : [sends] }],
    ),
  };
}
it("loses no text, adds no word and marks what is chosen, on every walked screen", async () => {
  const stops = await walked();
  expect(stops.length).toBeGreaterThan(50);
  const failures = new Map<string, string>();
  for (const { screen, path } of stops)
    for (const { check, missing } of conformance(screen, drawnOf(piecesOf(screen)), catalog))
      failures.set(`${check}: ${missing}`, failures.get(`${check}: ${missing}`) ?? JSON.stringify(path));
  expect([...failures].map(([failure, path]) => `${failure} at ${path}`)).toEqual([]);
});
