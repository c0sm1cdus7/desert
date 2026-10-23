import type { Frozen } from "./json.ts";
import type { CommandDefinition } from "./program-grammar.ts";

export function commandInputTargets(command: Frozen<CommandDefinition>): string[] {
  const assignments = command.kind === "create" ? command.values : command.set;
  return Object.entries(assignments).flatMap(([target, expression]) =>
    expression.kind === "input" && command.input.includes(expression.field) ? [target] : []);
}
