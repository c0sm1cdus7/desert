// What the harness reads back from the bytes a program wrote to its terminal.
import { describe, expect, it } from "vitest";
import { screenOf } from "./real-terminal.ts";

describe("the screen read back from what a terminal was sent", () => {
  it("is each row as it was last written, and empty after it was cleared", () => {
    expect(screenOf("\x1b[1;1H\x1b[1mMenú\x1b[0m  \x1b[2;1Huno\x1b[1;1HVentas", 3)).toEqual(["Ventas", "uno", ""]);
    expect(screenOf("\x1b[1;1Huno\x1b[2J\x1b[2;1Hdos", 2)).toEqual(["", "dos"]);
  });
});
