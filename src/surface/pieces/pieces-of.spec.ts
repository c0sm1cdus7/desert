// The bank is a pure function of the screen, and its pieces are data: the same twice, and the same after a wire.
import { describe, expect, it } from "vitest";
import { paintedScreens } from "../../../tests/support/painted-screens.ts";
import { goldenScreens } from "../../../tests/support/write-terminal-frames.ts";
import type { Screen } from "../contract/contract.ts";
import { piecesOf } from "./pieces-of.ts";

/** A screen no one can change: nothing the bank does may write into what it was handed. */
function frozen<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    for (const inner of Object.values(value)) frozen(inner);
    Object.freeze(value);
  }
  return value;
}
/** Every golden screen and every hand-built one. */
const screens = (): readonly Screen[] => [...goldenScreens(), ...paintedScreens].map(entry => entry.screen);
describe("piecesOf", () => {
  it("gives the same pieces for the same screen, and writes nothing into it", () => {
    for (const screen of screens()) {
      const copy: unknown = JSON.parse(JSON.stringify(screen));
      const still = frozen(structuredClone(screen));
      expect(piecesOf(still)).toEqual(piecesOf(still));
      expect(still).toEqual(copy);
    }
  });
  it("survives a JSON round trip unchanged: pieces are data", () => {
    for (const screen of screens()) {
      const pieces = piecesOf(screen);
      expect(JSON.parse(JSON.stringify(pieces))).toStrictEqual(pieces);
    }
  });
});
