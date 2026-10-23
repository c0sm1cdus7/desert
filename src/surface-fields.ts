import type { Frozen } from "./json.ts";
import type { JourneyDefinition } from "./program-grammar.ts";
import { commandInputTargets } from "./command-input-targets.ts";
import type { ObjectDefinition } from "./contracts.ts";

export type SurfaceField = { readonly object: string; readonly field: string };
export function surfaceFieldKinds(fields: ReadonlyMap<string, SurfaceField>, objects: ReadonlyMap<string, ObjectDefinition>) {
  return Object.fromEntries([...fields].map(([key, reference]) =>
    [key, objects.get(reference.object)!.facts[reference.field]!.kind]));
}

export function surfaceFields(journeys: readonly Frozen<JourneyDefinition>[]) {
  const identities = new Map<string, SurfaceField>();
  const presented = new Map<string, SurfaceField>();
  const editable = new Map<string, SurfaceField>();
  function register(target: Map<string, SurfaceField>, object: string, field: string) {
    const key = `${object}.${field}`;
    const existing = identities.get(key);
    if (existing && (existing.object !== object || existing.field !== field)) {
      throw new Error("AMBIGUOUS_SURFACE_FIELD_KEY");
    }
    const reference = existing ?? { object, field };
    identities.set(key, reference);
    target.set(key, reference);
  }
  for (const journey of journeys) {
    const object = journey.kind === "read" ? journey.object : journey.command.object;
    const fields = journey.kind === "read" ? [...journey.fields, ...journey.collection]
      : [...journey.command.input, ...(journey.command.kind === "create"
        ? commandInputTargets(journey.command) : Object.keys(journey.command.set))];
    for (const field of fields) register(presented, object, field);
    if (journey.kind === "mutation") {
      for (const field of journey.command.input) register(editable, object, field);
    }
  }
  return { presented, editable };
}
