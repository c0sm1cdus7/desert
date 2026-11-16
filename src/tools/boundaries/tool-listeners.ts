// A program's startup, returned cleanup, and event reactions remain its code after registration.
import { startProgram } from "./tool-startup.ts";
import type { Emission, Event } from "../../journal/facts.ts";
import type { Execution } from "../execute.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
import { programRule } from "../../fields/program-call.ts";
import { closeResources } from "./close-resources.ts";
export function startPrograms<X extends Program>(registry: ToolRegistry<X>, ports: Execution<X>) {
  const shutdown: (() => void)[] = [];

  try {
    for (const tool of registry) shutdown.push(startProgram(tool, ports));
  } catch (error) {
    closeResources(shutdown, undefined, [error]);
  }
  return () => closeResources(shutdown);
}
export const programEffects = <X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  event: Event<X["fact"]>,
) => registry.flatMap((tool): Emission<X["fact"]>[] => [...programRule(() => tool.effects?.(state, event) ?? [])]);
