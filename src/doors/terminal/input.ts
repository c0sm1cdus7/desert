// A terminal's keys, in the words of the surface; anything else does nothing.
import type { Intent } from "../../surface/contract.ts";

const sequences: Readonly<Record<string, Exclude<Intent["kind"], "type">>> = {
  "\x1b[A": "up",
  "\x1b[B": "down",
  "\x1b[C": "right",
  "\x1b[D": "left",
  "\x1bOA": "up",
  "\x1bOB": "down",
  "\x1bOC": "right",
  "\x1bOD": "left",
};
const controls: Readonly<Record<string, Exclude<Intent["kind"], "type">>> = {
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

/** A chunk can hold several keys, and a paste is many characters. */
export function keysOf(chunk: string): readonly Intent[] {
  const keys: Intent[] = [];
  for (const [piece] of chunk.matchAll(/\x1b(?:\[[0-9;]*[A-Za-z~]|O[A-D])|[\s\S]/gu)) {
    const kind = sequences[piece] ?? controls[piece];
    if (kind) keys.push({ kind });
    else if (piece >= " " && !piece.startsWith("\x1b")) keys.push({ kind: "type", text: piece });
  }
  return keys;
}
