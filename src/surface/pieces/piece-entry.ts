// The Entrada: what is written, the part of its shape still to fill, and where the caret stands.
import type { Body, Row, Span } from "../contract/contract.ts";
import type { EntryPiece } from "./pieces.ts";

type ThreadEntry = NonNullable<Extract<Body, { kind: "thread" }>["entry"]>;
/** A row that is written in: its name when it has one, what is typed, and the character the caret stands on. */
export function rowEntry(title: string, entry: NonNullable<Row["entry"]>): EntryPiece {
  return {
    kind: "entry",
    ...(title ? { label: { text: title, tone: "t2" } } : {}),
    written: [{ text: entry.typed, tone: "t1" }],
    whole: false,
    caret: { at: entry.caret, under: { text: Array.from(entry.typed)[entry.caret] ?? " ", tone: "t1" } },
    // A row is written in only to search or to give another answer: free text, never a secret.
    keyboard: "text",
    secret: false,
  };
}
/** What is written, in order: the leading part of a mask not yet written, the rest, then the shape still to fill. */
function written(entry: ThreadEntry, whole: boolean): readonly Span[] {
  const { typed, remaining = "", padding = 0 } = entry;
  if (!typed) return [];
  const shaped = padding && !whole;
  return [
    ...(shaped ? [{ text: typed.slice(0, padding), tone: "t3" } as const] : []),
    { text: shaped ? typed.slice(padding) : typed, tone: "t1" },
    ...(remaining ? [{ text: remaining, tone: "t3" } as const] : []),
  ];
}
/** The Entrada of a thread. What was there when the question opened is lit whole, and then there is no caret. */
export function threadEntry(entry: ThreadEntry): EntryPiece {
  const { typed, caret, placeholder, remaining = "" } = entry;
  const whole = entry.suggested === true;
  const under = Array.from(typed)[caret] ?? Array.from(remaining)[0] ?? " ";
  return {
    kind: "entry",
    written: written(entry, whole),
    ...(typed ? {} : { placeholder: { text: placeholder, tone: "t3" } }),
    whole,
    // The tone compares a code-point index with a UTF-16 length, as the terminal always drew it.
    ...(whole ? {} : { caret: { at: caret, under: { text: under, tone: caret < typed.length ? "t1" : "t3" } } }),
    keyboard: entry.keyboard,
    secret: entry.secret === true,
  };
}
