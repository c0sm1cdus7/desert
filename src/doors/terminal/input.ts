// A terminal's keys, in the words of the surface; anything else does nothing.
import type { Intent } from "../../surface/contract.ts";

type Pressed = Exclude<Intent["kind"], "type" | "paste">;
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
/** One key: a whole escape sequence, an escape with the key it modifies, or one character. */
const pieces = /\x1b\[[0-9;]*[A-Za-z~]|\x1bO[A-Za-z]|\x1b[^\x1b[O]|[\s\S]/gu;
/** An escape sequence the chunk left unfinished: its rest may come in the next one. */
const unfinished = /\x1b(?:\[[0-9;]*|O)?$/u;

export interface KeyReader {
  /** The keys a chunk brings; what may be the start of a longer key waits for the next chunk. */
  read(chunk: string): readonly Intent[];
  /** What waits for more, if anything: a key that may go on, or a paste that has not ended. */
  waiting(): "key" | "paste" | undefined;
  /** What waits, taken as it stands: an escape alone is the escape key, and what was pasted so far is pasted. */
  settle(): readonly Intent[];
}
const pressed = (piece: string): Intent | undefined => {
  const kind = sequences[piece] ?? controls[piece];
  if (kind) return { kind };
  return piece >= " " && !piece.startsWith("\x1b") ? { kind: "type", text: piece } : undefined;
};
/** Reads keys across chunks: a key that comes in two pieces is one key, and what is pasted is a text, never keys. */
export function keyReader(): KeyReader {
  let pending = "";
  let pasting: string | undefined;
  const take = (piece: string): readonly Intent[] => {
    if (pasting === undefined) {
      if (piece === brackets.start) pasting = "";
      const key = piece === brackets.start ? undefined : pressed(piece);
      return key ? [key] : [];
    }
    if (piece !== brackets.end) {
      pasting += piece;
      return [];
    }
    const text = pasting;
    pasting = undefined;
    return [{ kind: "paste", text }];
  };
  return {
    read: chunk => {
      const text = pending + chunk;
      pending = text.match(unfinished)?.[0] ?? "";
      const whole = text.slice(0, text.length - pending.length);
      return Array.from(whole.matchAll(pieces)).flatMap(([piece]) => take(piece));
    },
    waiting: () => {
      if (pasting !== undefined) return "paste";
      return pending ? "key" : undefined;
    },
    settle: () => {
      const text = pasting;
      const alone = pending === "\x1b" && text === undefined;
      pending = "";
      pasting = undefined;
      if (alone) return [{ kind: "cancel" }];
      return text ? [{ kind: "paste", text }] : [];
    },
  };
}
/** The keys of a text that is whole: nothing is left waiting. */
export function keysOf(chunk: string): readonly Intent[] {
  const keys = keyReader();
  return [...keys.read(chunk), ...keys.settle()];
}
