// One edit of what is being written: the caret moves past everything a key wrote, however many characters.
import { describe, expect, it } from "vitest";
import { edited } from "./talk.ts";

const typing = (typed: string, caret: number, text: string) => edited({ typed, caret }, { kind: "type", text });
describe("an edit of what is being written", () => {
  it("puts the caret after the whole text one key wrote", () => {
    const first = typing("", 0, "ab");
    expect(first).toEqual({ typed: "ab", caret: 2 });
    expect(first && typing(first.typed, first.caret, "c")).toEqual({ typed: "abc", caret: 3 });
  });
  it("counts an astral character as one place", () => {
    const first = typing("", 0, "a😀");
    expect(first).toEqual({ typed: "a😀", caret: 2 });
    expect(first && typing(first.typed, first.caret, "c")).toEqual({ typed: "a😀c", caret: 3 });
  });
  it("writes in the middle and leaves the caret after what it wrote", () => {
    expect(typing("ad", 1, "bc")).toEqual({ typed: "abcd", caret: 3 });
  });
});
