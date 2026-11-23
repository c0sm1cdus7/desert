// Rows, stacks, lists and the options of a question: which side leads, what is chosen, what is off and why.
import type { Language } from "../../fields/languages.ts";
import type { Body, Row, Stack } from "../contract/contract.ts";
import type { Tone } from "../contract/tones.ts";
import { countedOut, emptyNotice } from "./piece-notice.ts";
import { rowEntry } from "./piece-entry.ts";
import type { ListPiece, OptionsPiece, RowPiece, StackPiece } from "./pieces.ts";

/** A row of text. In a stack that is read, or a row that stays, a datum leads; elsewhere the name does. What cannot
 * be chosen now is all in the faintest tone; what is chosen is all in the first. */
function textRow(row: Row, reads: boolean): RowPiece {
  const chosen = row.selected ?? false;
  const off = row.off ?? false;
  const quiet = (fallback: Tone): Tone => (off ? "t3" : fallback);
  const tone = (fallback: Tone): Tone => (chosen ? "t1" : quiet(fallback));
  const detail = row.detail ?? "";
  const fact = (reads || row.still === true) && detail !== "";
  return {
    kind: "row",
    as: "text",
    ...(row.key ? { key: { text: row.key, tone: tone("t3") } } : {}),
    name: { text: row.title, tone: tone(fact ? "t2" : "t1"), bold: chosen },
    ...(detail ? { datum: { text: detail, tone: tone(row.tone ?? (fact ? "t1" : "t2")) } } : {}),
    whole: fact ? "datum" : "name",
    chosen,
    off,
    still: row.still ?? false,
    ...(row.id ? { sends: { kind: "choose", row: row.id } } : {}),
    ...(row.marked === undefined ? {} : { marked: row.marked }),
  };
}
/** A row as a piece: a line drawn as it is, a row written in, or a row of text. */
export function rowPiece(row: Row, reads: boolean): RowPiece {
  if (row.spans) return { kind: "row", as: "line", line: row.spans };
  if (row.entry) return { kind: "row", as: "entry", entry: rowEntry(row.title, row.entry) };
  return textRow(row, reads);
}
const keyed = (rows: readonly Row[]): boolean => rows.some(row => Boolean(row.key));
export const stackPiece = (stack: Stack, language: Language): StackPiece => ({
  kind: "stack",
  title: { text: stack.title, tone: "t3" },
  keyed: keyed(stack.rows),
  ...countedOut(stack.above, stack.below, language),
  ...(stack.rows.length ? {} : { empty: emptyNotice(stack.empty ?? "") }),
  rows: stack.rows.map(row => rowPiece(row, stack.reads === true)),
});
export const listPiece = (body: Extract<Body, { kind: "list" }>, language: Language): ListPiece => ({
  kind: "list",
  stacks: body.stacks.map(stack => stackPiece(stack, language)),
});
/** The options of a question, with how many are left out before the first and after the last. */
export const optionsPiece = (
  rows: readonly Row[],
  more: { readonly above: number; readonly below: number } | undefined,
  language: Language,
): OptionsPiece => ({
  kind: "options",
  keyed: keyed(rows),
  ...countedOut(more?.above, more?.below, language),
  rows: rows.map(row => rowPiece(row, false)),
});
