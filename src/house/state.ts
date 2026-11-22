// Starts and folds the house with its program slices; declares the options passed when opening it.
import type { KitMigration } from "./kit-migration.ts";
import { kitLayout } from "./kit-selection.ts";
import type { CalculationVersion } from "../tools/calculation-contract.ts";
import type { HouseKeyProvider } from "../keychain/custody/house-keys.ts";
import { type Creation, emptyHouse, houseStep, type Attention } from "./members.ts";
import { type Vocabulary, processOf, type Event } from "../journal/vocabulary.ts";
import type { Execution } from "../tools/execute.ts";
import type { Program, ContractSetup, Slices, ToolRegistry, HouseState, State } from "../tools/tool-contract.ts";
import type { AdapterComposition } from "../tools/adapter-contract.ts";
/** What a program hands a house to live in it: its vocabulary, its tools, and what each of them keeps. */
export type HouseOptions<X extends Program> = AdapterComposition &
  Readonly<{ by: string; projectionVersion: CalculationVersion; creation: Creation }> &
  Readonly<{ words: Vocabulary<X["fact"]>; registry: ToolRegistry<X>; slices: Slices<X> }> &
  Partial<Pick<Execution<X>, "own" | "process">> &
  Readonly<{
    secretKeys?: HouseKeyProvider;
    founderDoorKeys?: Readonly<{
      read: () => ReadonlyMap<string, import("./doors/door-material.ts").DoorIdentity>;
      present: () => boolean;
      warn?: (message: string) => void;
    }>;
    contractSetup?: ContractSetup<X>;
    identities?: boolean;
    kitMigration?: KitMigration;
    minds?: Readonly<{ assistants: boolean; programs: readonly string[] }>;
  }>;
import { readonlyState, stateResult } from "../journal/readonly-state.ts";
import { openActs } from "../tools/execution/open-acts.ts";
import { programRule } from "../fields/program-call.ts";

import { emptyMap, initial, listOf } from "../journal/projections.ts";
import { attendsStep, lookedStep } from "./attendance.ts";

import { attentionStep } from "./attention.ts";
export const emptyHouseState: HouseState = initial({
  by: "",
  house: emptyHouse,
  attendance: emptyMap<readonly string[]>(),
  processing: emptyMap(),
  acts: emptyMap(),
  wakeOwners: emptyMap(),
  attentionBy: emptyMap<ReadonlyMap<string, Attention>>(),
  looked: emptyMap<ReadonlyMap<string, number>>(),
  entries: listOf(),
  attends: listOf<string>(),
  attention: emptyMap<Attention>(),
  through: 0,
});
/** Where a house starts for one identity: nothing in the house yet, and each tool as it begins. */
export const startState = <X extends Program>(
  slices: Slices<X>,
  by: string,
  identities = false,
  registry: ToolRegistry<X> = [],
  kitMigration?: KitMigration,
): State<X> => ({
  ...emptyHouseState,
  house: {
    ...emptyHouse,
    identities,
    kitLayout: kitLayout(registry),
    ...talkOf(registry),
    ...(kitMigration ? { kitMigration } : {}),
  },
  by,
  tools: slices.initial,
});
/** Only a registry with talk programs adds the field, so houses folded before 20/11 keep their exact shape. */
function talkOf<X extends Program>(registry: ToolRegistry<X>): { talk?: readonly string[] } {
  const talk = registry.filter(tool => tool.talks).map(tool => tool.id);
  return talk.length ? { talk } : {};
}
function houseStateStep<S extends HouseState>(state: S, event: Event): S {
  const process = processOf(event);
  const attendance = new Map(state.attendance);
  const attentionBy = new Map(state.attentionBy);
  if (event.layer === "house" && (event.kind === "attended" || event.kind === "unattended"))
    attendance.set(process, attendsStep(attendance.get(process) ?? [], event));
  if (event.layer === "house" && event.kind === "attention")
    attentionBy.set(event.by, attentionStep(attentionBy.get(event.by) ?? new Map(), event));
  const entry = event.layer === "house" && event.kind === "tool-entry" ? [event] : [];
  return {
    ...state,
    ...openActs(state, event),
    attentionBy,
    attendance,
    looked: lookedStep(state.looked, event),
    house: houseStep(state.house, event),
    entries: entry.length ? [...state.entries, ...entry] : state.entries,
    attends: attendance.get(state.by) ?? [],
    attention: attentionBy.get(state.by) ?? new Map(),
    through: event.seq,
  };
}
/** Every fact moves the house, and each tool moves what it keeps: the house never reads a tool's part. */
export function toolsStep<X extends Program>(state: State<X>, event: Event<X["fact"]>, slices: Slices<X>): State<X> {
  const tools: { -readonly [K in keyof State<X>["tools"]]: State<X>["tools"][K] } = { ...state.tools };
  for (const key in slices.step)
    tools[key] = programRule(() =>
      stateResult(slices.step[key](readonlyState(state.tools[key]), event, readonlyState(state))),
    );
  return { ...houseStateStep(state, event), tools };
}
