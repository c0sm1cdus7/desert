// Where a derived check runs: a real house on disk at a fixed instant, its three people, an act done as anyone does.
import { ok } from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { systemTool } from "../../house/system-tools.ts";
import { caseInstant, type TimeSource } from "../../journal/clock.ts";
import { MemoryHouseKeys } from "../../keychain/custody/house-keys.ts";
import { checkReopenedState } from "../calculations/reopened-state.ts";
import { promiseHome } from "../promise-temporaries.ts";
import { coreRegistry } from "../../tools/identities/identities.ts";
import { coreStep } from "./core-step.ts";

import { startHouse } from "../../runtime/house-runtime.ts";
import { promiseTexts as said } from "../../texts/promises.texts.ts";
import type { Composition, Did, ProgramAct, ProgramTool, Step } from "../../tools/promises.ts";
import type { Program } from "../../tools/tool-contract.ts";
export type Check = Readonly<{
  name: string;
  run: () => Promise<void>;
  report?: () => string | undefined;
  timeoutMs?: number;
}>;
/** Who lives in the house a case runs in: ana administers it, beto holds every tool, carla holds none. */
export const cast = { admin: "ana", member: "beto", outsider: "carla" } as const;
const dayMs = 24 * 3_600_000;
/** The time of the house a case runs in: it stands still at the instant of every case, until the case says that
 * days passed. */
type Clock = Readonly<{ time: TimeSource; pass: (days: number) => void; setTime: (at: number) => void }>;
function stillClock(): Clock {
  let at = caseInstant;
  const time = { now: () => at, wait: () => () => {} };
  const setTime = (instant: number): void => {
    if (!Number.isSafeInteger(instant) || instant < 0) throw new Error(`Invalid case instant: ${instant}`);
    at = instant;
  };
  return { time, pass: days => void (at += days * dayMs), setTime };
}
/** The house a case runs in runs as itself. */
export const runner = "house";
function open<X extends Program>(
  program: Composition<X>,
  home: string,
  { time, pass, setTime }: Clock,
  secretKeys: MemoryHouseKeys,
) {
  const tools = program.registry.filter(tool => !systemTool(tool.id)).map(tool => tool.id);
  const holding = [cast.admin, cast.member].map(identity => ({ identity, tools }));
  const assignments = [...holding, { identity: cast.outsider, tools: [] }];
  const creation = { admin: cast.admin, assignments };
  return {
    ...startHouse<X>(home, { by: runner, creation, ...withoutMinds(program), secretKeys }, time),
    pass,
    setTime,
    now: () => time.now(),
  };
}
/** A check that brings no model resources proves what the acts promise with every mind off: a mind is proven by its
 * role's cases on the bench. A check that brings them keeps its minds. */
function withoutMinds<X extends Program>(program: Composition<X>): Composition<X> {
  return program.minds && !("modelMinds" in program)
    ? {
        ...program,
        registry: coreRegistry(
          program.registry,
          runner,
          program.identities,
          program.minds.assistants,
          program.minds.programs,
        ),
        minds: { assistants: false, programs: [] },
      }
    : program;
}
export type House<X extends Program> = ReturnType<typeof open<X>>;
type Stage<X extends Program> = Readonly<{ house: () => House<X>; reopen: () => void }>;
/** A fresh house on disk for one check, closed and removed when the check ends, however it ends. */
export async function staged<X extends Program>(program: Composition<X>, use: (stage: Stage<X>) => Promise<void>) {
  const home = promiseHome();
  const clock = stillClock();
  const secretKeys = new MemoryHouseKeys();
  let active: House<X> | undefined;
  try {
    let house = open(program, home, clock, secretKeys);
    active = house;
    const reopen = (): void => {
      house.close();
      active = undefined;
      house = open(program, home, clock, secretKeys);
      active = house;
    };
    await use({ house: () => house, reopen });
    house.close();
    active = undefined;
    checkReopenedState<X>(join(home, "journal.sqlite"), { ...program, by: runner });
  } finally {
    try {
      active?.close();
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  }
}
export type Doing = Did & Readonly<{ attends?: boolean }>;
/** One act as anyone does it: the target in view first, then the act; the answer is what the house decided. */
export async function perform<X extends Program>(house: House<X>, tool: string, doing: Doing) {
  const { by = cast.admin, on: target = tool, act, input, destination, attends = true } = doing;
  if (attends) house.tools.act({ act: "attend", input: { target } }, 0, by);
  const started = house.tools.act(
    { act, target, input, ...(destination ? { destination } : {}) },
    house.tools.state().through,
    by,
  );
  return started.status === "processing" ? started.completion : started;
}
export type Decided<X extends Program> = Awaited<ReturnType<typeof perform<X>>>;
/** Every fact of the program written since a point of the journal: its kind and everything it says. */
export const wroteSince = <X extends Program>(house: House<X>, seq: number) =>
  house.journal.replay<{ kind: string; data: unknown }[]>(
    [],
    (facts, event) => (event.layer === "program" ? [...facts, { kind: event.kind, data: event.data }] : facts),
    seq,
  );
/** What a case says already happened, done act by act, with the days it says passed in between; a step the house
 * refuses is a case that cannot start. */
export async function given<X extends Program>(
  house: House<X>,
  tool: string,
  steps: readonly Step[] = [],
  at?: number,
): Promise<void> {
  if (at !== undefined) house.setTime(at);
  for (const step of steps) {
    if (coreStep(house, step)) continue;
    if ("days" in step) {
      house.pass(step.days);
      continue;
    }
    if (!("act" in step)) throw new Error("Unsupported case step");
    const done = await perform(house, tool, step);
    ok(done.status === "accepted", said.givenRefused(step.act, done.reason ?? done.status));
  }
}
export type Aim<X extends Program> = Readonly<{ tool: ProgramTool<X>; name: string; act: ProgramAct<X> }>;
export const label = <X extends Program>({ tool, name }: Aim<X>, promise: string): string =>
  `${tool.id} · ${name} · ${promise}`;
