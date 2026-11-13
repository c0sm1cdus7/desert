// The journals a program keeps of what organizations wrote with it: each still opens with the program of today.
// Every fact is read and folds from the first, and every thing is read as whoever administers it reads it.
import { deepStrictEqual, ok } from "node:assert/strict";
import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { journalKept } from "../adapters/storage/journal-store.ts";
import { houseTools } from "../surface/bridge/house-tools.ts";
import type { Shown } from "../surface/bridge/house-ports.ts";
import { stacksOf } from "../surface/lists.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import type { Composition } from "../tools/promises.ts";
import type { KeyStore, Program } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { localPorts, startHouse } from "./house-runtime.ts";
import { breadthFirst, keptWalkLimits, type WalkCoverage } from "./kept-walk.ts";
import { keptPath, type Path } from "./kept-path.ts";
import type { Check } from "./promised-stage.ts";

/** A kept journal is read, never used: no service of its house is reached, and no credential of it is there. */
const noKeys: KeyStore = {
  get: () => Promise.resolve(undefined),
  set: () => Promise.reject(new Error(said.keptKeys)),
  remove: () => Promise.reject(new Error(said.keptKeys)),
};
type Kept<X extends Program> = Readonly<{ program: Composition<X>; shown: Shown<X> }>;
/** It was opened with nothing folded beforehand, so every fact was read and folded from the first by the program
 * of today; folding it once more gives the same. And everything it has is read where a person reads it: the Menu,
 * each tool, each thing of each tool. */
function read<X extends Program>({ program, shown }: Kept<X>, house: ReturnType<typeof startHouse<X>>, now: number) {
  const runner = house.tools.state().by;
  const again = house.journal.replay(startState<X>(program.slices, runner), (state, event) =>
    toolsStep<X>(state, event, program.slices),
  );
  deepStrictEqual(again.tools, house.tools.state().tools);
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
  const home = mkdtempSync(join(tmpdir(), "desert-kept-"));
  try {
    copyFileSync(file, join(home, "journal.sqlite"));
    const { runner, last } = journalKept(join(home, "journal.sqlite"));
    ok(runner, said.keptEmpty);
    const now = last + 1;
    const creation = { admin: runner, assignments: [] };
    const time = { now: () => now, wait: () => () => {} };
    const house = startHouse<X>(home, { by: runner, creation, keys: noKeys, ...kept.program }, time);
    try {
      return await use(house, now);
    } finally {
      house.close();
    }
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
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
/** Two checks for each journal kept in a folder of the program; none, where the program keeps none. */
export function keptChecks<X extends Program>(program: Composition<X>, shown: Shown<X>, folder: string): Check[] {
  if (!existsSync(folder)) return [];
  const kept = readdirSync(folder).filter(name => name.endsWith(".sqlite"));
  return kept.sort().flatMap(name => {
    const source = { program, shown };
    const file = join(folder, name);
    const opens = () => opened(source, file, (house, now) => read(source, house, now));
    return [{ name: said.keptOpens(name), run: opens }, walk(source, file, name)];
  });
}
