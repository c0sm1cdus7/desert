// Registration keeps loading failures visible, and a walk's coverage reaches the gate's actual output.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, expect, it, vi } from "vitest";
import { loadProgram } from "../program/load.ts";
import { programGroups, registerPart } from "../program/registration.ts";
import { programPartCount } from "../program/parts.ts";
import { program, shown } from "../support/shop-program.ts";
import { root } from "../support/sources.ts";
import * as journals from "../../src/programs/kept-journals.ts";
import type { Check } from "../../src/programs/promised-stage.ts";

const temporary = mkdtempSync(join(tmpdir(), "desert-parts-spec-"));
afterAll(() => rmSync(temporary, { recursive: true, force: true }));
afterEach(() => vi.restoreAllMocks());
const fixture = (pkg: unknown, code = "export const unrelated = true;") => {
  const folder = mkdtempSync(join(temporary, "program-"));
  writeFileSync(join(folder, "package.json"), JSON.stringify(pkg));
  writeFileSync(join(folder, "program.mjs"), code);
  return folder;
};
const source = { program, shown, where: "shop" };

it("still fails when the program does not say where it is composed", async () => {
  await expect(loadProgram(fixture({}))).rejects.toThrow("package.json must say where the program is composed");
});
it.each(["export const program = {};", "export const shown = {};", "export const unrelated = true;"])(
  "still rejects missing or malformed exports: %s",
  async code => {
    const folder = fixture({ desert: { program: "program.mjs" } }, code);
    await expect(loadProgram(folder)).rejects.toThrow("must export `program` and `shown`");
  },
);
it("loads the composition relative to the program and resolves its journal folder there", async () => {
  const shop = pathToFileURL(join(root, "tests/support/shop-program.ts")).href;
  const code = `export { program, shown } from ${JSON.stringify(shop)};`;
  const folder = fixture({ desert: { program: "program.mjs", journals: "journals" } }, code);
  const loaded = await loadProgram(folder);
  expect(loaded.where).toBe("program.mjs");
  expect(loaded.journals).toBe(join(folder, "journals"));
  expect(loaded.program.registry.map(tool => tool.id)).toEqual(program.registry.map(tool => tool.id));
});
it.each(["missing", "empty"])("still fails a named journal folder that is %s", async kind => {
  const folder = join(temporary, kind);
  if (kind === "empty") mkdirSync(folder);
  const groups = programGroups({ ...source, journals: folder });
  const checks = groups.flatMap(group => group.checks);
  const guard = checks.find(check => check.name.startsWith("are read from the folder"));
  expect(guard).toBeDefined();
  await expect(guard?.run()).rejects.toThrow("keeps no journal");
});
it("collects all saved-journal openings and walks without opening or changing their files", () => {
  const folder = join(temporary, "kept");
  mkdirSync(folder);
  for (const name of ["c", "a", "b"]) writeFileSync(join(folder, `${name}.sqlite`), "not opened while collecting");
  const original = journals.keptChecks(program, shown, folder);
  const groups = programGroups({ ...source, journals: folder });
  const registered: string[] = [];
  for (let part = 0; part < programPartCount; part++) {
    registerPart(groups, part, (name, checks) => {
      if (name === "the journals the program keeps") registered.push(...checks.map(check => check.name));
    });
  }
  expect(original).toHaveLength(6);
  expect(registered.sort()).toEqual(
    [
      ...original.map(check => check.name),
      "are read from the folder the program names, or the program names none",
    ].sort(),
  );
});
it("writes paths walked to stdout after the walk, and preserves its failure on a later run", async () => {
  const run = vi.fn(async () => {});
  const report = vi.fn(() => "shop: 12 paths walked");
  vi.spyOn(journals, "keptChecks").mockReturnValue([{ name: "walk", run, report }]);
  const output = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  const groups = programGroups({ ...source, journals: temporary });
  const registered: Check[] = [];
  for (let part = 0; part < programPartCount; part++) {
    registerPart(groups, part, (name, checks) => {
      if (name === "the journals the program keeps") registered.push(...checks);
    });
  }
  const walk = registered.find(check => check.name === "walk");
  expect(report).not.toHaveBeenCalled();
  await walk?.run();
  expect(run).toHaveBeenCalledTimes(1);
  expect(report).toHaveBeenCalledTimes(1);
  expect(output).toHaveBeenCalledExactlyOnceWith("shop: 12 paths walked\n");
  run.mockRejectedValueOnce(new Error("interrupted walk"));
  await expect(walk?.run()).rejects.toThrow("interrupted walk");
  expect(output).toHaveBeenCalledTimes(1);
  await walk?.run();
  expect(run).toHaveBeenCalledTimes(3);
  expect(report).toHaveBeenCalledTimes(2);
  expect(output).toHaveBeenCalledTimes(2);
});
