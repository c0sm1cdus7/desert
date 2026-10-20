import type { ProductDefinition } from "./contracts.ts";
import { checkCommand } from "./check-command.ts";
import { checkSurface } from "./check-surface.ts";
import { requireField, requireReference, uniqueById } from "./references.ts";
import { compileDependencies } from "./compile-dependencies.ts";

export function compileProgram(definition: ProductDefinition) {
  const objects = uniqueById(definition.objects, "object");
  const dependencies = compileDependencies(definition);
  const journeyDependencies = new Map<string, string[]>();
  const policies = new Map<string, string>();
  for (const policy of definition.policies ?? []) {
    const object = requireReference(objects, policy.object, "object");
    if (requireField(object, policy.field).kind !== "principal") throw new Error("Owner field must be principal");
    if (policies.has(object.id)) throw new Error(`Duplicate ownership policy: ${object.id}`);
    policies.set(object.id, policy.field);
  }
  const journeys = uniqueById(definition.journeys ?? [], "journey");
  const commands = new Map<string, { definition: object, inputSchema: ReturnType<typeof checkCommand> }>();
  for (const journey of journeys.values()) {
    const objectId = journey.kind === "read" ? journey.object : journey.command.object;
    const object = requireReference(objects, objectId, "object");
    journeyDependencies.set(journey.id, dependencies.forJourney(journey));
    const owner = policies.get(objectId);
    if (!owner) throw new Error(`Missing ownership policy: ${objectId}`);
    if (journey.kind === "read") {
      for (const name of [...journey.fields, ...journey.collection]) requireField(object, name);
    } else {
      const command = journey.command;
      const existing = commands.get(command.id);
      if (existing && JSON.stringify(existing.definition) !== JSON.stringify(command)) throw new Error(`Conflicting command: ${command.id}`);
      commands.set(command.id, { definition: command, inputSchema: checkCommand(command, object, owner) });
    }
  }
  const surfaces = uniqueById(definition.surfaces ?? [], "surface");
  for (const surface of surfaces.values()) checkSurface(surface, journeys, objects);
  return { journeys, commands, surfaces, dependencies: dependencies.definitions, journeyDependencies };
}
