// Every check a program's promises derive: nobody writes them. Each case is a check; so is each law of every act.
import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { caseInstant } from "../catalogs/time.ts";
import { identityView } from "../house/house.ts";
import type { TimeSource } from "../journal/clock.ts";
import { promiseTexts as said } from "../texts/promises.texts.ts";
import { toolTexts } from "../texts/tools.texts.ts";
import type { Case, Composition, ProgramAct, ProgramTool, Step } from "../tools/promises.ts";
import { outsideOf } from "../tools/schema-breaks.ts";
import type { KeyStore, Program } from "../tools/tool-contract.ts";
import { startState, toolsStep } from "../tools/tools.ts";
import { startHouse } from "./house-runtime.ts";

export type Check = Readonly<{ name: string; run: () => Promise<void> }>;
/** Who lives in the house a case runs in: ana administers it, beto holds every tool, carla holds none. */
export const cast = { admin: "ana", member: "beto", outsider: "carla" } as const;
const stillTime: TimeSource = { now: () => caseInstant, wait: () => () => {} };
/** The house a case runs in runs as itself. */
const runner = "house";
const kept = new Map<string, string>();
const keys: KeyStore = {
  get: provider => Promise.resolve(kept.get(provider)),
  set: (provider, value) => Promise.resolve(void kept.set(provider, value)),
  remove: provider => Promise.resolve(void kept.delete(provider)),
};
function open<X extends Program>(program: Composition<X>, home: string) {
  const tools = program.registry.map(tool => tool.id);
  const holding = [cast.admin, cast.member].map(identity => ({ identity, tools }));
  const assignments = [...holding, { identity: cast.outsider, tools: [] }];
  const creation = { admin: cast.admin, assignments };
  return startHouse<X>(home, { by: runner, creation, keys, ...program }, stillTime);
}
export type House<X extends Program> = ReturnType<typeof open<X>>;
type Stage<X extends Program> = Readonly<{ house: () => House<X>; reopen: () => void }>;
/** A fresh house on disk for one check, closed and removed when the check ends, however it ends. */
export async function staged<X extends Program>(program: Composition<X>, use: (stage: Stage<X>) => Promise<void>) {
  const home = mkdtempSync(join(tmpdir(), "desert-promise-"));
  let house = open(program, home);
  const reopen = (): void => {
    house.close();
    house = open(program, home);
  };
  try {
    await use({ house: () => house, reopen });
  } finally {
    house.close();
    rmSync(home, { recursive: true, force: true });
  }
}
type Doing = Step & Readonly<{ attends?: boolean }>;
/** One act as anyone does it: the target in view first, then the act; the answer is what the house decided. */
async function perform<X extends Program>(house: House<X>, tool: string, doing: Doing) {
  const { by = cast.admin, on: target = tool, act, input, attends = true } = doing;
  if (attends) house.tools.act({ act: "attend", input: { target } }, 0, by);
  const started = house.tools.act({ act, target, input }, house.tools.state().through, by);
  return started.status === "processing" ? started.completion : started;
}
type Decided<X extends Program> = Awaited<ReturnType<typeof perform<X>>>;
export const wroteSince = <X extends Program>(house: House<X>, seq: number) =>
  house.journal.replay<{ kind: string; data: unknown }[]>(
    [],
    (facts, event) => (event.layer === "program" ? [...facts, { kind: event.kind, data: event.data }] : facts),
    seq,
  );
/** Whom the house called for attention since a point of the journal, each identity once, in order. */
const calledSince = <X extends Program>(house: House<X>, seq: number): string[] => [
  ...new Set(
    house.journal.replay<string[]>(
      [],
      (called, event) => (event.layer === "house" && event.kind === "stimulus" ? [...called, event.by] : called),
      seq,
    ),
  ),
];
const saidBy = <X extends Program>(decided: Decided<X>): string | undefined => {
  for (const effect of decided.effects)
    if (effect.layer === "house" && effect.kind === "tool-entry") return effect.data.text;
  return undefined;
};
export async function given<X extends Program>(
  house: House<X>,
  tool: string,
  steps: readonly Step[] = [],
): Promise<void> {
  for (const step of steps) {
    const done = await perform(house, tool, step);
    ok(done.status === "accepted", said.givenRefused(step.act, done.reason ?? done.status));
  }
}
/** What every tool keeps, folded again from the first fact: the journal alone has to be enough. */
const rebuilt = <X extends Program>(program: Composition<X>, house: House<X>): X["tools"] =>
  house.journal.replay(startState<X>(program.slices, runner), (state, event) =>
    toolsStep<X>(state, event, program.slices),
  ).tools;
export type Aim<X extends Program> = Readonly<{ tool: ProgramTool<X>; name: string; act: ProgramAct<X> }>;
export const label = <X extends Program>({ tool, name }: Aim<X>, promise: string): string =>
  `${tool.id} · ${name} · ${promise}`;
/** What the tool reads on a target, as whoever acted reads it: each line of its view, parsed when it is JSON. */
function readOn<X extends Program>(house: House<X>, aim: Aim<X>, kase: Case<X>, on = kase.on ?? aim.tool.id) {
  const state = identityView(house.tools.state(), kase.by ?? cast.admin);
  const lines = aim.tool.view(state, on, { recentLines: 100 }).split("\n").filter(Boolean);
  return lines.map((line): unknown => {
    try {
      return JSON.parse(line);
    } catch {
      return line;
    }
  });
}
/** A case, checked on a real house: what it says and writes, or its refusal; and the same house after reopening. */
function caseCheck<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check {
  const run = (): Promise<void> =>
    staged(program, async ({ house, reopen }) => {
      await given(house(), aim.tool.id, kase.given);
      const before = house().tools.state();
      const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name });
      const wrote = wroteSince(house(), before.through);
      if ("refused" in kase.then) {
        deepStrictEqual([done.status, done.reason], ["rejected", kase.then.refused]);
        deepStrictEqual(wrote, []);
        deepStrictEqual(house().tools.state().tools, before.tools);
      } else {
        strictEqual(done.status, "accepted", done.reason);
        deepStrictEqual(wrote, kase.then.facts);
        strictEqual(saidBy(done), kase.then.says);
        if (kase.then.reads) deepStrictEqual(readOn(house(), aim, kase, kase.then.reads.on), kase.then.reads.lines);
        if (kase.then.calls) deepStrictEqual(calledSince(house(), before.through), kase.then.calls);
      }
      const after = house().tools.state().tools;
      deepStrictEqual(rebuilt(program, house()), after);
      reopen();
      deepStrictEqual(house().tools.state().tools, after);
    });
  return { name: label(aim, kase.promise), run };
}
/** The laws every act of every program keeps, checked from a case of its own that the house accepts. */
function lawChecks<X extends Program>(program: Composition<X>, aim: Aim<X>, kase: Case<X>): Check[] {
  const refusal = (promise: string, doing: Partial<Doing>, cause: string, input = kase.input): Check => ({
    name: label(aim, promise),
    run: () =>
      staged(program, async ({ house }) => {
        await given(house(), aim.tool.id, kase.given);
        const before = house().tools.state().through;
        const done = await perform(house(), aim.tool.id, { ...kase, act: aim.name, input, ...doing });
        deepStrictEqual([done.status, done.reason], ["rejected", cause]);
        deepStrictEqual(wroteSince(house(), before), []);
      }),
  });
  return [
    ...outsideOf(aim.act.input, kase.input).map((input, index) =>
      refusal(said.outside(index + 1), {}, toolTexts.invalid, input),
    ),
    refusal(said.notHeld, { by: cast.outsider }, toolTexts.unassigned),
    refusal(said.unseen, { by: cast.member, attends: false }, toolTexts.unattended),
  ];
}
/** What an act declares has to add up: a case the house accepts, and a case for each cause it may refuse with. */
function coverage<X extends Program>(aim: Aim<X>): Check {
  const refused = aim.act.cases.flatMap(kase => ("refused" in kase.then ? [kase.then.refused] : []));
  const run = (): Promise<void> =>
    Promise.resolve().then(() => {
      const does = aim.act.cases.some(kase => !("refused" in kase.then));
      ok(does, said.nothingDone);
      deepStrictEqual([...new Set(refused)].sort(), [...aim.act.refuses].sort());
    });
  return { name: label(aim, said.covered), run };
}
export function promisedChecks<X extends Program>(program: Composition<X>): readonly Check[] {
  return program.registry.flatMap(tool =>
    Object.entries(tool.acts).flatMap(([name, act]) => {
      const aim = { tool, name, act };
      const accepted = act.cases.find(kase => !("refused" in kase.then));
      return [
        coverage(aim),
        ...act.cases.map(kase => caseCheck(program, aim, kase)),
        ...(accepted ? lawChecks(program, aim, accepted) : []),
      ];
    }),
  );
}
