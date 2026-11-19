// Store administrator assignments and invalidate bank publications on each boot.
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { capabilities, type Capability } from "../../fields/capabilities.ts";
import { mindActor, parseMindActor } from "../../fields/mind-actor.ts";
import { requireMind } from "../../fields/mind-errors.ts";
import { object } from "../../fields/visible-text.ts";
import { mindName } from "../assistants/assistant-facts.ts";
import type { HouseEvent } from "../facts.ts";
import type { House } from "../members.ts";
const assignment = object({
  card: mindName,
  version: mindName,
  capabilities: Type.Array(Type.Union(capabilities.map(value => Type.Literal(value))), { uniqueItems: true }),
});
export const mindSettingsFacts = {
  "mind-cards-published": object({ mind: mindActor, cards: Type.Array(assignment) }),
  "mind-card-assigned": object({
    mind: mindActor,
    card: mindName,
    version: mindName,
    capabilities: Type.Array(Type.Union(capabilities.map(value => Type.Literal(value))), { uniqueItems: true }),
  }),
};
export type MindAssignment = Readonly<{ card: string; version: string; capabilities: readonly Capability[] }>;
export function mindSettingsStep(house: House, event: HouseEvent): House {
  if (event.kind === "boot") return { ...house, mindCards: new Map() };
  if (event.kind === "mind-cards-published") {
    requireMind(event.by === house.admin, "card.admin");
    return { ...house, mindCards: new Map(house.mindCards).set(event.data.mind, event.data.cards) };
  }
  if (event.kind !== "mind-card-assigned") return house;
  requireMind(Value.Check(mindSettingsFacts[event.kind], event.data), event.kind);
  requireMind(event.by === house.admin, "card.admin");
  const actor = parseMindActor(event.data.mind);
  requireMind(actor, "card.mind");
  if (actor.kind === "assistant") requireMind(house.assistants.get(actor.owner)?.enabled, "card.assistant");
  return { ...house, mindAssignments: new Map(house.mindAssignments).set(event.data.mind, event.data) };
}
