// A terminal's keys, in the words of the surface; anything else does nothing.
import type { Intent } from "../../surface/contract/contract.ts";
import { pasteLimit } from "../../surface/contract/limits.ts";
type Pressed = Exclude<Intent["kind"], "type" | "paste" | "choose">;
const sequences: Readonly<Record<string, Pressed>> = {
  "\x1b[A": "up",
  "\x1b[B": "down",
  "\x1b[C": "right",
  "\x1b[D": "left",
  "\x1bOA": "up",
  "\x1bOB": "down",
  "\x1bOC": "right",
  "\x1bOD": "left",
};
const controls: Readonly<Record<string, Pressed>> = {
  "\r": "confirm",
  "\n": "confirm",
  "\x1b": "cancel",
  "\x7f": "erase",
  "\b": "erase",
  "\x0f": "menu",
  "\t": "switch",
  "\x03": "quit",
  "\x04": "quit",
};
/** What a terminal puts around what is pasted, once it is asked to; and how it is asked, and told to stop. */
const brackets = { start: "\x1b[200~", end: "\x1b[201~" } as const;
export const pasteBrackets = { on: "\x1b[?2004h", off: "\x1b[?2004l" } as const;
/** The start of a paste after its escape: what may still come once that escape was taken for the escape key. */
const startRest = brackets.start.slice(1);
/** The keys that leave: ctrl c and ctrl d. */
const leaves = /[\x03\x04]/u;
/** One key: a whole escape sequence, an escape with the key it modifies, or one character. */
const pieces = /\x1b\[[0-9;]*[A-Za-z~]|\x1bO[A-Za-z]|\x1b[^\x1b[O]|[\s\S]/gu;
/** An escape sequence the chunk left unfinished: its rest may come in the next one. */
const unfinished = /\x1b(?:\[[0-9;]*|O)?$/u;

interface KeyReader {
  /** The keys a chunk brings; what may be the start of a longer key waits for the next chunk. */
  read(chunk: string): readonly Intent[];
  /** What is still given time: an escape that is alone so far, or a paste whose end has not come. */
  waiting(): "key" | "paste" | undefined;
  /** The time of what waits is up. An escape alone is the escape key. A paste goes on until its end comes, however
   * late: what comes meanwhile is its text, and from then on leaving is the one key that is heard. */
  settle(): readonly Intent[];
}
const pressed = (piece: string): Intent | undefined => {
  const kind = sequences[piece] ?? controls[piece];
  if (kind) return { kind };
  return piece >= " " && !piece.startsWith("\x1b") ? { kind: "type", text: piece } : undefined;
};
/** What comes between the start of a paste and its end, kept as it comes: a text, whatever it holds. */
function pasteOf() {
  let text: string | undefined;
  /** It was given its time and its end did not come. */
  let late = false;
  return {
    open: (): boolean => text !== undefined,
    waits: (): boolean => text !== undefined && !late,
    start: (): void => void (text = ""),
    /** Its time is up: it goes on until its end comes, and from then on leaving is the one key that is heard. */
    overdue: (): void => void (late = true),
    late: (): boolean => late,
    take(piece: string): readonly Intent[] {
      const held = text ?? "";
      if (piece === brackets.end) {
        text = undefined;
        late = false;
        return [{ kind: "paste", text: held }];
      }
      text = (held + piece).slice(0, pasteLimit);
      return [];
    },
  };
}
/** Reads keys across chunks: a key that comes in pieces is one key, and what is pasted is a text, never keys.
 * Only an escape that is alone is given a time: a sequence that started waits for its end, however long it takes
 * and in however many pieces it comes, so no piece of it is ever read as a key of its own. */
export function keyReader(): KeyReader {
  let pending = "";
  const paste = pasteOf();
  /** After an escape that was taken for the escape key, the rest of a paste's start may still come: how much of it
   * came so far. It is kept, in however many pieces, until it is whole (a paste starts) or it is not that. */
  let after: string | undefined;
  const take = (piece: string): readonly Intent[] => {
    if (paste.open()) return paste.take(piece);
    if (piece === brackets.start) paste.start();
    const key = piece === brackets.start ? undefined : pressed(piece);
    return key ? [key] : [];
  };
  const keys = (text: string): readonly Intent[] => {
    pending = text.match(unfinished)?.[0] ?? "";
    const whole = text.slice(0, text.length - pending.length);
    return Array.from(whole.matchAll(pieces)).flatMap(([piece]) => take(piece));
  };
  return {
    read: chunk => {
      /** Leaving is heard wherever it comes in a paste that is late, whatever was left waiting before it. */
      if (paste.late() && leaves.test(chunk)) return [{ kind: "quit" }];
      if (after === undefined) return keys(pending + chunk);
      const came = after + chunk;
      after = startRest.startsWith(came) && came !== startRest ? came : undefined;
      if (after !== undefined) return [];
      return keys(came.startsWith(startRest) ? `\x1b${came}` : came);
    },
    waiting: () => {
      if (paste.open()) return paste.waits() ? "paste" : undefined;
      return pending === "\x1b" ? "key" : undefined;
    },
    settle: () => {
      /** What waits inside a paste may be the start of its end: it stays. */
      if (paste.open()) paste.overdue();
      if (paste.open() || pending !== "\x1b") return [];
      pending = "";
      after = "";
      return [{ kind: "cancel" }];
    },
  };
}
/** The keys of a text that is whole: nothing is left waiting, and a paste that has no end in it is not there. */
export function keysOf(chunk: string): readonly Intent[] {
  const keys = keyReader();
  return [...keys.read(chunk), ...keys.settle()];
}
