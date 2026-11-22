import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { root, sourceFiles } from "../support/sources.ts";
import { virtualProgram } from "./secret-boundaries.ts";
import { programEntryExports, programEntryFiles } from "./program-entry-exports.ts";

it("286: no allowed program entry exposes host capabilities through its actual exports", () => {
  const sources = Object.fromEntries(sourceFiles().map(file => [file, readFileSync(file, "utf8")]));
  expect(programEntryExports(virtualProgram(sources, {}), root, programEntryFiles(root))).toEqual([]);
});
for (const name of [
  "startHouse",
  "localPorts",
  "maintainHouseCustody",
  "startCloudHouse",
  "environmentDoorKeys",
  "mcpDoor",
  "serveMcp",
  "houseRouter",
  "houseTools",
  "startRouter",
  "startTerminal",
  "compose",
  "startTools",
  "startClock",
  "createHouse",
  "MemoryHouseKeys",
])
  it(`rejects ${name} through renamed chained reexports`, () => {
    const sources = {
      "/base/src/host.ts": `export function ${name}() {}`,
      "/base/src/middle.ts": `export { ${name} as renamed } from "./host.ts";`,
      "/base/src/entry.ts": 'export { renamed as harmless } from "./middle.ts";',
    };
    const found = programEntryExports(virtualProgram(sources, {}), "/base", { "desert/fields": "/base/src/entry.ts" });
    expect(found).toEqual([`desert/fields → harmless → host.ts:${name}`]);
  });
it.each([
  'export * from "./middle.ts";',
  'export * as nested from "./middle.ts";',
  'export { newHostCapability as default } from "./middle.ts";',
  'import { newHostCapability } from "./middle.ts"; export const alias = newHostCapability;',
])("detects future host values by origin, not just by spelling: %s", code => {
  const sources = {
    "/base/src/runtime/host.ts": "export function newHostCapability() {}",
    "/base/src/middle.ts": 'export * from "./runtime/host.ts";',
    "/base/src/entry.ts": code,
  };
  expect(
    programEntryExports(virtualProgram(sources, {}), "/base", { "desert/fields": "/base/src/entry.ts" }),
  ).toHaveLength(1);
});
it("follows cyclic barrels without losing a host export and rejects unresolved reexports", () => {
  const sources = {
    "/base/src/runtime/host.ts": "export function futureHost() {}",
    "/base/src/entry.ts": 'export * from "./middle.ts"; export { absent } from "./missing.ts";',
    "/base/src/middle.ts": 'export * from "./entry.ts"; export * from "./runtime/host.ts";',
  };
  expect(
    programEntryExports(virtualProgram(sources, {}), "/base", { "desert/fields": "/base/src/entry.ts" }),
  ).toHaveLength(2);
});
it("expands every allowed fields entry from the export map and excludes testing", () => {
  const entries = programEntryFiles(root);
  expect(entries["desert/program"]).toBe(join(root, "src/tools/installable/program.ts"));
  expect(entries["desert/fields/messages"]).toBe(join(root, "src/fields/messages.ts"));
  expect(entries["desert/testing"]).toBeUndefined();
});
