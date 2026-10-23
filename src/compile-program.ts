import type { ProductDefinition } from "./contracts.ts";
import { checkCommand } from "./check-command.ts";
import { checkSurface } from "./check-surface.ts";
import { requireField, requireReference, uniqueById } from "./references.ts";
import { compileDependencies } from "./compile-dependencies.ts";
import { checkLiteral } from "./check-assignments.ts";

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
  for (const object of objects.values()) for (const field of Object.values(object.facts)) {
    if (field.kind !== 'labels' || !field.reference) continue;
    const target = requireReference(objects,field.reference.object,'reference target');
    if (!policies.has(target.id) || ('media' in field.reference ? requireField(target,field.reference.media).kind !== 'asset'
      : requireField(target,field.reference.label).kind !== 'text' || field.reference.color !== undefined && requireField(target,field.reference.color).kind !== 'enum')) throw new Error('INVALID_REFERENCE_TARGET');
    if ('media' in field.reference && field.reference.memberOf) {
      const membership=requireField(target,field.reference.memberOf);
      if (membership.kind!=='labels' || membership.reference?.object!==object.id) throw new Error('INVALID_REFERENCE_MEMBERSHIP');
    }
    if ('media' in field.reference) for(const [name,value]of Object.entries(field.reference.where ?? {})) checkLiteral(requireField(target,name),value,name);
  }
  const commands = new Map<string, { definition: object, inputSchema: ReturnType<typeof checkCommand> }>();
  for (const journey of journeys.values()) {
    const objectId = journey.kind === "read" ? journey.object : journey.command.object;
    const object = requireReference(objects, objectId, "object");
    journeyDependencies.set(journey.id, dependencies.forJourney(journey));
    const owner = policies.get(objectId);
    if (!owner) throw new Error(`Missing ownership policy: ${objectId}`);
    if (journey.kind === "read") {
      for (const name of [...journey.fields, ...journey.collection]) requireField(object, name);
      for (const [name, value] of Object.entries(journey.where ?? {})) checkLiteral(requireField(object, name), value, name);
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
