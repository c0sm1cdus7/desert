// Reconstruye asistentes y cruza su delegación con el permiso actual y la capacidad asignada.
import { migrateKit } from "../kit-migration.ts";
import { holderKit } from "../kit-history.ts";
import { covers, expandKit, explicitKit, kitLayout, type SelectionKit } from "../kit-selection.ts";
import { Value } from "@sinclair/typebox/value";
import type { Capability } from "../../fields/capabilities.ts";
import { assistantOf, isMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import type { House } from "../members.ts";
import type { HouseEvent } from "../facts.ts";
import { identityAllowedAct } from "../identities/identity-permissions.ts";
import { assistantFacts, type DelegatedKit } from "./assistant-facts.ts";
export type AssistantState = Readonly<{
  owner: string;
  name: string;
  enabled: boolean;
  kit: DelegatedKit;
  selections?: SelectionKit;
  legacy?: string;
}>;
export type MindTools = readonly Readonly<{
  id: string;
  actionTools?: Readonly<Record<string, string>>;
  acts?: Readonly<Record<string, Readonly<{ needs?: readonly Capability[] }>>>;
}>[];
export function assistantOfIdentity(house: House, owner: string): AssistantState | undefined {
  requireMind(house, "house");
  requireMind(typeof owner === "string" && owner.length > 0, "owner");
  return house.assistants.get(owner);
}
export function effectiveAssistantKit(house: House, owner: string, registry: MindTools): DelegatedKit {
  requireMind(house, "house");
  requireMind(registry, "registry");
  const assistant = house.assistants.get(owner);
  const assignment = house.mindAssignments.get(assistantOf(owner));
  if (!assistant?.enabled || !house.grants.has(owner) || !assignment) return [];
  return expandKit(
    migrateKit(assistant.selections ?? explicitKit(assistant.kit), house.kitMigration),
    registry,
  ).flatMap(({ tool, acts }) => {
    const declared = registry.find(each => each.id === tool);
    const permitted = acts.filter(act => {
      const definition = declared?.acts && Object.hasOwn(declared.acts, act) ? declared.acts[act] : undefined;
      return (
        definition !== undefined &&
        identityAllowedAct(house, owner, tool, act, kitLayout(registry)) &&
        (definition.needs ?? []).every(need => assignment.capabilities.includes(need))
      );
    });
    return permitted.length ? [{ tool, acts: permitted }] : [];
  });
}
export function assistantStep(house: House, event: HouseEvent): House {
  if (!(event.kind in assistantFacts)) return house;
  if (
    event.kind !== "assistant-enabled" &&
    event.kind !== "assistant-disabled" &&
    event.kind !== "assistant-kit-set" &&
    event.kind !== "assistant-adopted"
  )
    return house;
  requireMind(Value.Check(assistantFacts[event.kind], event.data), event.kind);
  const { owner } = event.data;
  const previous = house.assistants.get(owner);
  requireMind(!isMindActor(owner), "owner");
  if (event.kind !== "assistant-disabled") requireMind(house.grants.has(owner), "owner.present");
  requireMind(event.by === (event.kind === "assistant-kit-set" ? owner : house.admin), "authority");
  let next: AssistantState;
  if (event.kind === "assistant-enabled") {
    requireMind(!previous?.enabled || previous.name === event.data.name, "assistant.name");
    next = {
      ...previous,
      owner,
      name: event.data.name,
      enabled: true,
      kit: previous?.enabled ? previous.kit : [],
      selections: previous?.enabled ? (previous.selections ?? explicitKit(previous.kit)) : explicitKit([]),
    };
  } else {
    requireMind(previous, "assistant");
    next = changedAssistant(house, previous, event);
  }
  return { ...house, assistants: new Map(house.assistants).set(owner, next) };
}
function changedAssistant(
  house: House,
  previous: AssistantState,
  event: HouseEvent<"assistant-disabled" | "assistant-kit-set" | "assistant-adopted">,
): AssistantState {
  if (event.kind === "assistant-disabled") return { ...previous, enabled: false, kit: [], selections: explicitKit([]) };
  if (event.kind === "assistant-kit-set") return delegatedAssistant(house, previous, event);
  const { legacy } = event.data;
  requireMind(
    legacy !== previous.owner && legacy !== house.admin && house.removed.has(legacy) && !house.grants.has(legacy),
    "adoption.legacy",
  );
  requireMind(!previous.legacy || previous.legacy === legacy, "adoption.collision");
  requireMind(
    ![...house.assistants.values()].some(other => other.owner !== previous.owner && other.legacy === legacy),
    "adoption.collision",
  );
  return { ...previous, legacy };
}

function delegatedAssistant(
  house: House,
  previous: AssistantState,
  event: HouseEvent<"assistant-kit-set">,
): AssistantState {
  requireMind(previous.enabled, "assistant.enabled");
  if ("version" in event.data) {
    requireMind(
      event.data.kit.selections.every(
        selection =>
          selection.program !== "identities" &&
          (previous.owner === house.admin ||
            (selection.kind === "action"
              ? identityAllowedAct(house, previous.owner, selection.program, selection.action)
              : holderKit(house, previous.owner).selections.some(
                  parent => covers(parent, selection) || covers(selection, parent),
                ))),
      ),
      "kit.permission",
    );
    return { ...previous, kit: [], selections: event.data.kit };
  }
  const { kit } = event.data;
  requireMind(new Set(kit.map(each => each.tool)).size === kit.length, "kit.tools");
  requireMind(
    kit.every(
      ({ tool, acts }) =>
        tool !== "identities" && acts.every(act => identityAllowedAct(house, previous.owner, tool, act)),
    ),
    "kit.permission",
  );
  return { ...previous, kit, selections: explicitKit(kit) };
}
