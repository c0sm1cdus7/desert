// Keep the old group and check names while registering independent, interleaved parts of both lists.
import { keptNames } from "../../src/programs/kept-names.ts";
import { keptChecks } from "../../src/programs/kept-journals.ts";
import { programChecks } from "../../src/programs/program-checks.ts";
import type { Check } from "../../src/programs/promised-stage.ts";
import type { Program } from "../../src/tools/tool-contract.ts";
import type { Composed } from "./load.ts";
import { checksInPart } from "./parts.ts";

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
  return [
    { name: `what the program composed in ${where} promises`, checks: programChecks(program, shown) },
    { name: "the journals the program keeps", checks: [folder, ...kept.map(reported)] },
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
