import { Check } from "@sinclair/typebox/value";
import type { Static } from "@sinclair/typebox";
import { RuntimeConnectionPolicy } from "../connection-policy.ts";
import { jsonSnapshot, type Frozen } from "../json.ts";
import { ViewSurfaceSchema, type JourneyDefinition } from "../program-grammar.ts";
import type { AuthoredHumanExposure, AuthoredSurfaceSchema } from "../human-exposure.ts";
import { surfaceFields } from "../surface-fields.ts";
import type { OwnedDefinitions } from "./types.ts";
import type { FieldRepresentation } from "../field-representation.ts";

type Exposure = Frozen<Static<typeof AuthoredSurfaceSchema>>;

function compileHumanExposure(surface: AuthoredHumanExposure, owners: readonly OwnedDefinitions[]) {
  const registrations = new Map(owners.flatMap(owner => (owner.journeys ?? []).flatMap(registration =>
    registration.execution ? [[registration.execution.id, registration] as const] : [])));
  const objects = new Map(owners.flatMap(owner => (owner.objects ?? []).map(object => [object.id, object] as const)));
  const journeys: Frozen<JourneyDefinition>[] = [];
  const journeyLabels: Record<string, string> = Object.create(null);
  const commit: Record<string, "submit" | "review" | "confirm"> = Object.create(null);
  for (const id of surface.journeys) {
    const registration = registrations.get(id);
    if (!registration?.execution) throw new Error("UNKNOWN_SURFACE_JOURNEY");
    if (!registration.label) throw new Error("JOURNEY_LABEL_REQUIRED");
    const journey = registration.execution;
    journeys.push(journey);
    journeyLabels[id] = registration.label;
    if (journey.kind === "mutation") {
      if (!registration.humanReview) throw new Error("HUMAN_REVIEW_REQUIRED");
      commit[id] = registration.humanReview === "required" ? "review" : registration.humanReview === "confirmation" ? "confirm" : "submit";
    }
  }
  const { presented } = surfaceFields(journeys);
  const fields: Record<string, string> = Object.create(null);
  const fieldRepresentations: Record<string, FieldRepresentation> = Object.create(null);
  for (const [key, reference] of presented) {
    const field = objects.get(reference.object)?.presentation?.fields?.find(item => item.fact.field === reference.field);
    if (!field) throw new Error("FIELD_PRESENTATION_REQUIRED");
    fields[key] = field.label;
    fieldRepresentations[key] = field.representation;
  }
  return {
    id: surface.id, kind: "human" as const, journeys: surface.journeys,
    fieldRepresentations, commit,
    language: { locale: surface.locale, fields, journeys: journeyLabels }, connection: RuntimeConnectionPolicy,
  };
}

export function compileSurfaceExposures(surfaces: readonly Exposure[], owners: readonly OwnedDefinitions[]) {
  return surfaces.map(surface => {
    const compiled = jsonSnapshot(surface.kind === "human" ? compileHumanExposure(surface, owners) : surface);
    if (!Check(ViewSurfaceSchema, compiled)) throw new Error("INVALID_COMPILED_EXPOSURE");
    return compiled;
  });
}
