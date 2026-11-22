// Keeps the program boundary when starting its listeners and closing its resources.
import { startProgram } from "./tool-startup.ts";
import type { Execution } from "../execute.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
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
