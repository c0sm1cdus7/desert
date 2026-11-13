// Run by the gate of every program on DESERT, from where the program stands: what it promises is checked without
// the program asking for it. The program says once, in its package.json, where it composes itself.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, it } from "vitest";
import { keptChecks } from "../../src/programs/kept-journals.ts";
import { programChecks } from "../../src/programs/program-checks.ts";
import type { Shown } from "../../src/surface/bridge/house-ports.ts";
import type { Composition } from "../../src/tools/promises.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import { field } from "../contract/json.ts";

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const isProgram = (value: unknown): value is Composition<Program> =>
  isRecord(value) && Array.isArray(value.registry) && isRecord(value.slices) && isRecord(value.words);
const isShown = (value: unknown): value is Shown<Program> =>
  isRecord(value) && isRecord(value.words) && isRecord(value.locale);
const pkg: unknown = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
const where = field(field(pkg, "desert"), "program");
if (typeof where !== "string") throw new Error('package.json must say where the program is composed: "desert.program"');
const composed: unknown = await import(pathToFileURL(join(process.cwd(), where)).href);
const program = field(composed, "program");
const shown = field(composed, "shown");
if (!isProgram(program) || !isShown(shown)) throw new Error(`${where} must export \`program\` and \`shown\``);

describe(`what the program composed in ${where} promises`, () => {
  for (const check of programChecks(program, shown)) it(check.name, check.run);
});
/** Where the program keeps journals that organizations wrote with it, when it says so: "desert.journals". */
const journals = field(field(pkg, "desert"), "journals");
describe("the journals the program keeps", () => {
  const kept = keptChecks(program, shown, typeof journals === "string" ? join(process.cwd(), journals) : undefined);
  it("checks upgrade evidence even when the program names no journal folder", () => {
    if (typeof journals === "string" && !kept.length) throw new Error(`${journals} keeps no journal`);
  });
  /** What the walk of a kept journal covered, and what it left unwalked, is said where the gate is read: written
   * straight to its output, which is there whoever runs it (what a passing test logs is hidden from an agent). */
  for (const check of kept)
    it(check.name, async () => {
      try {
        await check.run();
      } finally {
        const covered = check.report?.();
        if (covered) process.stdout.write(`${covered}\n`);
      }
    });
});
