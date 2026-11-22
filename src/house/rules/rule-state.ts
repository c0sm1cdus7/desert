// Rebuilds immutable versions, validity and retirements from facts without erasing any proposal.
import type { HouseEvent } from "../facts.ts";
import { deepFreeze } from "../../journal/vocabulary.ts";
import type { RuleVersion } from "./rule-schema.ts";
export type RulesState = Readonly<{
  versions: ReadonlyMap<string, readonly RuleVersion[]>;
  active: ReadonlyMap<string, number>;
  approved: ReadonlyMap<string, readonly number[]>;
  retired: ReadonlyMap<string, readonly number[]>;
}>;
export const emptyRules: RulesState = {
  versions: new Map(),
  active: new Map(),
  approved: new Map(),
  retired: new Map(),
};
export function rulesStep(state: RulesState, event: HouseEvent, admin: string): RulesState {
  if (event.kind === "rule-versioned") {
    const { definition, version, previous } = event.data;
    const versions = state.versions.get(definition.id) ?? [];
    if (version !== versions.length + 1 || previous !== (versions.at(-1)?.version ?? null))
      throw new Error("Invalid rule version sequence");
    const saved = { definition, version, previous, author: event.by, at: event.at, fact: event.id };
    deepFreeze(saved);
    const next = { ...state, versions: new Map(state.versions).set(definition.id, [...versions, saved]) };
    return event.by === admin ? activate(next, definition.id, version) : next;
  }
  if (event.kind !== "rule-approved" && event.kind !== "rule-retired") return state;
  if (event.by !== admin) throw new Error("Only the administrator changes rule validity");
  const { id, version } = event.data;
  if (!state.versions.get(id)?.some(item => item.version === version)) throw new Error("Unknown rule version");
  if (event.kind === "rule-approved") {
    if (state.approved.get(id)?.includes(version)) throw new Error("Rule version already approved");
    return activate(state, id, version);
  }
  if (state.active.get(id) !== version) throw new Error("Rule version is not active");
  const active = new Map(state.active);
  active.delete(id);
  return { ...state, active, retired: new Map(state.retired).set(id, [...(state.retired.get(id) ?? []), version]) };
}
function activate(state: RulesState, id: string, version: number): RulesState {
  return {
    ...state,
    active: new Map(state.active).set(id, version),
    approved: new Map(state.approved).set(id, [...(state.approved.get(id) ?? []), version]),
  };
}
export function activeRules(state: RulesState): readonly RuleVersion[] {
  return [...state.active].flatMap(
    ([id, version]) => state.versions.get(id)?.filter(item => item.version === version) ?? [],
  );
}
