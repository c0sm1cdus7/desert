import type { ObjectDefinition } from "./contracts.ts";
import type { JourneyDefinition, ExposureDefinition } from "./program-grammar.ts";
import { requireReference } from "./references.ts";
import { surfaceFieldKinds, surfaceFields } from "./surface-fields.ts";
import { requireFieldPresentation } from "./field-representation.ts";

export function checkSurface(surface: ExposureDefinition, journeys: Map<string, JourneyDefinition>, objects: Map<string, ObjectDefinition>) {
  const exposed = new Map(surface.journeys.map(id => [id, requireReference(journeys, id, "journey")]));
  if (surface.kind === "agent") return;
  const { presented } = surfaceFields([...exposed.values()]);
  requireFieldPresentation(surface.fieldRepresentations, surfaceFieldKinds(presented, objects), presented.keys());
  for (const journey of exposed.values()) {
    if (journey.kind === "mutation" && !Object.hasOwn(surface.commit, journey.id)) {
      throw new Error(`Missing commit mode: ${journey.id}`);
    }
  }
  for (const id of Object.keys(surface.commit)) {
    if (requireReference(exposed, id, "commit journey").kind !== "mutation") throw new Error("Only mutations have commit modes");
  }
  for (const journey of exposed.values()) {
    if (!Object.hasOwn(surface.language.journeys, journey.id)) throw new Error(`Missing journey label: ${journey.id}`);
  }
  for (const name of presented.keys()) {
    if (!Object.hasOwn(surface.language.fields, name)) throw new Error(`Missing field label: ${name}`);
  }
  for (const id of Object.keys(surface.language.journeys)) requireReference(exposed, id, "labeled journey");
  for (const name of Object.keys(surface.language.fields)) {
    if (!presented.has(name)) throw new Error(`Unknown field label: ${name}`);
  }
}
