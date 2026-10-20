import type { ObjectDefinition } from "./contracts.ts";
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import { requireReference } from "./references.ts";

export function checkSurface(surface: SurfaceDefinition, journeys: Map<string, JourneyDefinition>, objects: Map<string, ObjectDefinition>) {
  const exposed = new Map(surface.journeys.map(id => [id, requireReference(journeys, id, "journey")]));
  if (surface.kind === "agent") return;
  for (const [name] of Object.entries(surface.inputs ?? {})) {
    const match = [...exposed.values()].find(journey => journey.kind === "mutation" &&
      journey.command.input.some(field => `${journey.command.object}.${field}` === name));
    if (!match || match.kind !== "mutation") throw new Error(`Unknown input presentation: ${name}`);
    const field = name.slice(match.command.object.length + 1);
    if (objects.get(match.command.object)!.facts[field]!.kind !== "text") throw new Error(`Input presentation type mismatch: ${name}`);
  }
  for (const journey of exposed.values()) {
    if (journey.kind === "mutation" && !Object.hasOwn(surface.commit, journey.id)) {
      throw new Error(`Missing commit mode: ${journey.id}`);
    }
  }
  for (const id of Object.keys(surface.commit)) {
    if (requireReference(exposed, id, "commit journey").kind !== "mutation") throw new Error("Only mutations have commit modes");
  }
  for (const id of [surface.entry, surface.primaryAction, ...surface.subjectActions]) requireReference(exposed, id, "exposed journey");
  if (exposed.get(surface.entry)?.kind !== "read") throw new Error("Human entry must be a read journey");
  const primary = exposed.get(surface.primaryAction)!;
  if (primary.kind !== "mutation" || primary.command.kind !== "create") throw new Error("Primary action must create");
  for (const id of surface.subjectActions) {
    const action = exposed.get(id)!;
    if (action.kind !== "mutation" || action.command.kind !== "update") throw new Error("Subject action must update");
    const entry = exposed.get(surface.entry)!;
    if (entry.kind === "read" && entry.object !== action.command.object) throw new Error("Subject action object mismatch");
  }
  const requiredFields = new Set<string>();
  for (const journey of exposed.values()) {
    if (!Object.hasOwn(surface.language.journeys, journey.id)) throw new Error(`Missing journey label: ${journey.id}`);
    const objectId = journey.kind === "read" ? journey.object : journey.command.object;
    const object = objects.get(objectId)!;
    const fields = journey.kind === "read" ? [...journey.fields, ...journey.collection]
      : journey.command.kind === "create" ? journey.command.input : Object.keys(journey.command.set);
    for (const name of fields) requiredFields.add(`${object.id}.${name}`);
  }
  for (const name of requiredFields) {
    if (!Object.hasOwn(surface.language.fields, name)) throw new Error(`Missing field label: ${name}`);
  }
  for (const id of Object.keys(surface.language.journeys)) requireReference(exposed, id, "labeled journey");
  for (const name of Object.keys(surface.language.fields)) {
    if (!requiredFields.has(name)) throw new Error(`Unknown field label: ${name}`);
  }
}
