import type { ObjectDefinition } from "./contracts.ts";
import type { CommandDefinition } from "./program-grammar.ts";
import { checkAssignments, checkLiteral } from "./check-assignments.ts";
import { requireField } from "./references.ts";
import { emitObject } from "./schema.ts";

export function checkCommand(command: CommandDefinition, object: ObjectDefinition, ownerField: string) {
  const facts = Object.fromEntries(command.input.map(name => {
    const field = requireField(object, name);
    if (field.kind === "principal") throw new Error(`Principal cannot be command input: ${name}`);
    return [name, field];
  }));
  if (command.kind === "create") {
    if (command.values[ownerField]?.kind !== "actor") throw new Error("Owner must come from actor");
    for (const name of Object.keys(object.facts)) {
      if (!Object.hasOwn(command.values, name)) throw new Error(`Missing create assignment: ${name}`);
    }
    checkAssignments(object, command.input, command.values);
  } else {
    if (Object.hasOwn(command.set, ownerField)) throw new Error("Owner cannot be changed");
    for (const [name, value] of Object.entries(command.when)) checkLiteral(requireField(object, name), value, name);
    checkAssignments(object, command.input, command.set);
  }
  return emitObject({ id: command.id, facts });
}
