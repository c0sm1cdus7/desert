import {
  longFiles,
  repeatedClasses,
  longLines,
  unsafeCasts,
  switchedOffChecks,
  looseCompiler,
} from "../../src/checks/laws/size.ts";
import { describe, expect, it } from "vitest";
import { root } from "../support/sources.ts";
const repo = { root, code: ["src"] };

describe("law 11: one file per stage, and none over 300 lines", () => {
  it("no file has more than 300 lines", () => {
    expect(longFiles(repo, 300)).toEqual([]);
  });
  it("no process name repeats anywhere in the repository", () => {
    expect(repeatedClasses(repo)).toEqual([]);
  });
});

describe("law 12: simple, typed, and a gate that cannot be cheated", () => {
  it("no line is longer than 120 characters, so a file cannot be compacted into fewer lines", () => {
    expect(longLines(repo)).toEqual([]);
  });
  it("no unsafe cast in the source, its specs or its tests", () => {
    expect(unsafeCasts(repo)).toEqual([]);
  });
  it("no comment switches a check off", () => {
    expect(switchedOffChecks(repo)).toEqual([]);
  });
  it("the compiler stays strict", () => {
    expect(looseCompiler(repo)).toEqual([]);
  });
});
