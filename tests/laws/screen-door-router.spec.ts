// In a door a house router is built one way: only open-house-router.ts imports houseRouter, so no door makes its own.
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { filesUnder, fromRoot, importsOf, isSpec, src } from "../support/sources.ts";

const houseRouter = "src/surface/bridge/assembly/house-router.ts";
/** Every production file under a folder that imports the house router, types and re-exports included. */
const importersIn = (folder: string): readonly string[] =>
  filesUnder(folder)
    .filter(file => !isSpec(file))
    .filter(file => importsOf(file).some(specifier => fromRoot(resolve(dirname(file), specifier)) === houseRouter))
    .map(fromRoot);

describe("one way to build a house router in a door", () => {
  it("has open-house-router.ts as the only file under src/doors that imports the house router", () => {
    expect(importersIn(resolve(src, "doors"))).toEqual(["src/doors/socket/client/open-house-router.ts"]);
  });
  it("leaves the terminal to build its router through it", () => {
    expect(importersIn(resolve(src, "doors/terminal"))).toEqual([]);
  });
});
