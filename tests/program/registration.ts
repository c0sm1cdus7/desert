// Keep the old group and check names while registering independent, interleaved parts of both lists.
import { keptNames } from "../../src/checks/kept/kept-names.ts";
import { keptChecks } from "../../src/checks/kept/kept-journals.ts";
import { programChecks } from "../../src/checks/program-checks.ts";
import type { Check } from "../../src/checks/promises/promised-stage.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import type { Composed } from "./load.ts";
import { checksInPart } from "./parts.ts";
import { programLaws } from "../../src/checks/laws/program-laws.ts";
import { programSecretBoundaries } from "../laws/program-secret-boundaries.ts";

export type Group = Readonly<{ name: string; checks: readonly Check[] }>;
type Register = (name: string, checks: readonly Check[]) => void;

/** Write coverage straight to the gate's output: passing-test logs may be hidden from its reader. */
const reported = (check: Check): Check => ({
  ...check,
  run: async () => {
    try {
      await check.run();
    } finally {
      const covered = check.report?.();
      if (covered) process.stdout.write(`${covered}\n`);
    }
  },
});

export function programGroups<X extends Program>({ program, shown, where, journals }: Composed<X>): readonly Group[] {
  const kept = keptChecks(program, shown, journals);
  const folder: Check = {
    name: "checks upgrade evidence even when the program names no journal folder",
    run: () => {
      if (journals !== undefined && !keptNames(journals).length)
        return Promise.reject(new Error(`${journals} keeps no journal`));
      return Promise.resolve();
    },
  };
  /** Law 212 runs once in the program's own gate, as one more check of its parts. */
  const boundaries: Check = {
    name: "tools cannot import secret custody, factories or direct I/O",
    run: () => {
      const found = programSecretBoundaries(process.cwd());
      return found.length ? Promise.reject(new Error(found.join("\n"))) : Promise.resolve();
    },
  };
  return [
    { name: `what the program composed in ${where} promises`, checks: programChecks(program, shown) },
    { name: "the journals the program keeps", checks: [folder, ...kept.map(reported)] },
    { name: "the secret boundaries of the program", checks: [boundaries] },
    {
      name: "the repository laws of the program",
      checks: [
        {
          name: "obeys every repository law with the options declared by the program",
          run: async () => {
            const found = await programLaws(process.cwd());
            if (found.length) throw new Error(found.join("\n"));
          },
        },
      ],
    },
  ];
}

export function registerPart(groups: readonly Group[], part: number, register: Register): void {
  let count = 0;
  for (const group of groups) {
    const checks = checksInPart(group.checks, part);
    count += checks.length;
    if (checks.length) register(group.name, checks);
  }
  if (!count) register("derived checks", [{ name: "this part has no derived checks", run: async () => {} }]);
}
