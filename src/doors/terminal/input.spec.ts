// The keys of a terminal as they really come: cut between chunks, pasted, and with keys this surface has no word for.
import { describe, expect, it } from "vitest";
import type { Intent } from "../../surface/contract.ts";
import { keyReader, keysOf, pasteLimit } from "./input.ts";

const arrows = { "\x1b[A": "up", "\x1b[B": "down", "\x1b[C": "right", "\x1b[D": "left" } as const;
const application = { "\x1bOA": "up", "\x1bOB": "down", "\x1bOC": "right", "\x1bOD": "left" } as const;
/** Everything a reader says of some chunks that came one after another, and then nothing more. */
function read(chunks: readonly string[]): readonly Intent[] {
  const keys = keyReader();
  return [...chunks.flatMap(chunk => keys.read(chunk)), ...keys.settle()];
}
/** Every way of cutting a text in two. */
const cuts = (text: string): readonly (readonly string[])[] =>
  Array.from({ length: text.length - 1 }, (_, at) => [text.slice(0, at + 1), text.slice(at + 1)]);
const typed = (text: string): readonly Intent[] => Array.from(text, char => ({ kind: "type", text: char }));

describe("the keys of a terminal", () => {
  it("reads each arrow whole, however it is cut between two chunks", () => {
    for (const [bytes, kind] of Object.entries({ ...arrows, ...application }))
      for (const pieces of [[bytes], ...cuts(bytes)]) expect(read(pieces)).toEqual([{ kind }]);
  });
  it("reads an arrow cut in three, and what was typed before and after it", () => {
    expect(read(["a\x1b", "[", "Bb"])).toEqual([...typed("a"), { kind: "down" }, ...typed("b")]);
  });
  it("takes an escape that stays alone for the escape key, and only once nothing more came", () => {
    const keys = keyReader();
    expect(keys.read("\x1b")).toEqual([]);
    expect(keys.waiting()).toBe("key");
    expect(keys.settle()).toEqual([{ kind: "cancel" }]);
    expect(keys.waiting()).toBeUndefined();
  });
  it("reads what comes after an escape taken for the escape key as keys of its own: the criterion is time", () => {
    const keys = keyReader();
    expect([...keys.read("\x1b"), ...keys.settle(), ...keys.read("[A")]).toEqual([{ kind: "cancel" }, ...typed("[A")]);
  });
  it("takes for the start of a paste only what the wait cut from one: the same bytes, later, are typed", () => {
    const keys = keyReader();
    expect([...keys.read("\x1b"), ...keys.settle()]).toEqual([{ kind: "cancel" }]);
    expect(keys.read("[200~c\r\x1b[201~")).toEqual([{ kind: "paste", text: "c\r" }]);
    expect(keys.read("[200~")).toEqual(typed("[200~"));
  });
  it("reads two escapes as two", () => {
    expect(read(["\x1b\x1b"])).toEqual([{ kind: "cancel" }, { kind: "cancel" }]);
  });
  it("types nothing for a key held with alt, nor for a key it has no word for", () => {
    expect(read(["\x1ba"])).toEqual([]);
    expect(read(["\x1b[3~", "\x1b[1;5C", "\x1b[I", "\x1bOP"])).toEqual([]);
    expect(read(["\x1b[1;", "5C"])).toEqual([]);
  });
  it("leaves nothing typed by a sequence that never ended", () => {
    expect(read(["\x1b[1;"])).toEqual([]);
  });
  it("keeps each key its own word when nothing is pasted", () => {
    expect(keysOf("a\rñ\x7f\t\x0f")).toEqual([
      { kind: "type", text: "a" },
      { kind: "confirm" },
      { kind: "type", text: "ñ" },
      { kind: "erase" },
      { kind: "switch" },
      { kind: "menu" },
    ]);
    expect(keysOf("\x03")).toEqual([{ kind: "quit" }]);
  });
});
describe("what is pasted in a terminal", () => {
  const pasted = "\x1b[200~uno\r\ndos\ttres\x1b[201~";
  const text = "uno\r\ndos\ttres";
  it("is one text, with its line breaks, and never a key", () => {
    expect(keysOf(pasted)).toEqual([{ kind: "paste", text }]);
  });
  it("is the same text however it is cut between two chunks", () => {
    for (const pieces of cuts(pasted)) expect(read(pieces)).toEqual([{ kind: "paste", text }]);
  });
  it("lets the keys before and after it be keys", () => {
    expect(keysOf(`a${pasted}\r`)).toEqual([...typed("a"), { kind: "paste", text }, { kind: "confirm" }]);
  });
  it("goes on until its end comes, however late: what comes meanwhile is its text, never a key", () => {
    const keys = keyReader();
    expect(keys.read("\x1b[200~IGNORADO")).toEqual([]);
    expect(keys.waiting()).toBe("paste");
    expect(keys.settle()).toEqual([]);
    expect(keys.waiting()).toBeUndefined();
    expect(keys.read("c\r")).toEqual([]);
    expect(keys.settle()).toEqual([]);
    expect(keys.read("\x1b[201~")).toEqual([{ kind: "paste", text: "IGNORADOc\r" }]);
    expect(keys.read("\r")).toEqual([{ kind: "confirm" }]);
  });
  it("is that text wherever the wait cuts it; cut after its first byte, that escape was the escape key", () => {
    for (const [first = "", rest = ""] of cuts(pasted)) {
      const keys = keyReader();
      const read = [...keys.read(first), ...keys.settle(), ...keys.read(rest)];
      expect(read).toEqual(
        first === "\x1b" ? [{ kind: "cancel" }, { kind: "paste", text }] : [{ kind: "paste", text }],
      );
    }
  });
  it("lets the person leave one that never ends, once it was given its time: before that, ctrl c in it is text", () => {
    const keys = keyReader();
    expect(keys.read("\x1b[200~uno\x03")).toEqual([]);
    expect(keys.settle()).toEqual([]);
    expect(keys.read("x\r\x1b")).toEqual([]);
    expect(keys.read("\x03")).toEqual([{ kind: "quit" }]);
  });
  it("is not there, in a text that is whole, when its end is not in it", () => {
    expect(keysOf("a\x1b[200~uno\r")).toEqual(typed("a"));
  });
  it("keeps no more of it than its limit", () => {
    const [kept] = keysOf(`\x1b[200~${"x".repeat(pasteLimit + 5)}\x1b[201~`);
    expect(kept?.kind === "paste" && kept.text.length).toBe(pasteLimit);
  });
  it("keeps what looks like a key inside it as text", () => {
    expect(keysOf("\x1b[200~a\x1b[Ab\x03\x1b[201~")).toEqual([{ kind: "paste", text: "a\x1b[Ab\x03" }]);
  });
});
