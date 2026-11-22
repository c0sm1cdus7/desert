// The terminal does not change a cell: every golden and hand-built screen paints, at every size, the frozen frames.
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { framesPath, terminalFrames } from "../support/write-terminal-frames.ts";

/** The screens of a frames text, by name, with their hashes. */
const screensOf = (text: string): readonly string[] => text.split("\n").filter(line => line.startsWith("["));
const nameOf = (line: string): string => line.slice(2, line.indexOf('"', 2));
it("paints every screen at every size in every theme as the untouched painter froze it", () => {
  const frozen = readFileSync(framesPath, "utf8");
  const now = terminalFrames();
  const before = new Set(screensOf(frozen));
  expect(
    screensOf(now)
      .filter(line => !before.has(line))
      .map(nameOf),
  ).toEqual([]);
  expect(now).toBe(frozen);
});
