// Every fact is read and folds from the first, and every thing is read as whoever administers it reads it.
// The journals a program keeps of what organizations wrote with it: each still opens with the program of today.
import { stateResult } from "../../journal/readonly-state.ts";
import { inspectKept } from "./kept-inspection.ts";
import { deepStrictEqual } from "node:assert/strict";
import { join } from "node:path";
import { houseTools } from "../../surface/bridge/assembly/house-tools.ts";
import type { Shown } from "../../surface/bridge/ports/house-ports.ts";
import { stacksOf } from "../../surface/menus/lists.ts";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { Composition } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
import { startState, toolsStep } from "../../house/state.ts";
import { codeUpgradeCheck } from "../code/code-upgrade-check.ts";
import { CodeProjectionVersion } from "../../runtime/calculation-version.ts";
import { keptNames } from "./kept-names.ts";
import { keptUpgrade, upgradeEvidence } from "./kept-upgrade.ts";
import { localPorts, startHouse } from "../../runtime/house-runtime.ts";
import { breadthFirst, keptWalkLimits, type WalkCoverage } from "./kept-walk.ts";
import { keptPath, type Path } from "./kept-path.ts";
import type { Check } from "../promises/promised-stage.ts";
type Kept<X extends Program> = Readonly<{ program: Composition<X>; shown: Shown<X> }>;
/** It was opened with nothing folded beforehand, so every fact was read and folded from the first by the program
 * of today; folding it once more gives the same. And everything it has is read where a person reads it: the Menu,
 * each tool, each thing of each tool. */
function read<X extends Program>({ program, shown }: Kept<X>, house: ReturnType<typeof startHouse<X>>, now: number) {
  const runner = house.tools.state().by;
  const again = house.journal.replay(startState<X>(program.slices, runner, program.identities), (state, event) =>
    toolsStep<X>(state, event, program.slices),
  );
  deepStrictEqual(again.tools, stateResult(house.tools.state().tools));
  const admin = house.tools.state().house.admin;
  const tools = houseTools(
    localPorts(house, admin, { recentLines: 100 }, () => now),
    shown,
  );
  stacksOf({ kind: "menu", at: 0 }, tools);
  for (const tool of program.registry) {
    const things = tool.targets(house.tools.state()).map(target => ({ target }));
    for (const on of [{}, ...things]) stacksOf({ kind: "view", tool: tool.id, ...on, at: 0 }, tools);
  }
}
/** One kept journal, opened as a copy, a moment after its last fact, with time standing still. */
async function opened<X extends Program, R>(
  kept: Kept<X>,
  file: string,
  use: (house: ReturnType<typeof startHouse<X>>, now: number) => R | Promise<R>,
): Promise<R> {
  return inspectKept(kept.program, file, use);
}
/** The walk of one kept journal. What it covered and what it left unwalked is kept for whoever runs it to say. */
function walk<X extends Program>(source: Kept<X>, file: string, name: string): Check {
  let walked: WalkCoverage | undefined;
  const { program, shown } = source;
  const replay = (path: Path) => opened(source, file, (house, now) => keptPath(program, shown, house, now, path));
  return {
    name: said.keptWalks(name, keptWalkLimits),
    run: async () => {
      walked = undefined;
      walked = await breadthFirst(replay);
    },
    report: () => walked && said.keptWalked(name, walked),
  };
}
/** Three checks per kept journal, plus mandatory evidence for the explicitly composed version mode. */
export function keptChecks<X extends Program>(program: Composition<X>, shown: Shown<X>, folder?: string): Check[] {
  const kept = keptNames(folder);
  const upgrades = kept.map(name => keptUpgrade(program, join(folder ?? "", name), name));
  const checks = kept.flatMap((name, index) => {
    const source = { program, shown };
    const file = join(folder ?? "", name);
    const opens = () => opened(source, file, (house, now) => read(source, house, now));
    return [
      { name: said.keptOpens(name), run: opens },
      walk(source, file, name),
      upgrades[index] ?? keptUpgrade(program, file, name),
    ];
  });
  return program.projectionVersion instanceof CodeProjectionVersion
    ? [...checks, codeUpgradeCheck(program)]
    : [...checks, upgradeEvidence(upgrades)];
}
