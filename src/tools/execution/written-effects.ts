// A program's result writes atomically; a broken fold or listener remains a diagnostic, never a refusal string.
import type { Emission, HouseEvent } from "../../journal/events.ts";
import type { Execution } from "../execute.ts";
import { making } from "../made.ts";
import type { Program } from "../tool-contract.ts";

export function writtenEffects<X extends Program>(
  ports: Execution<X>,
  act: HouseEvent<"act">,
  effects: readonly Emission<X["fact"]>[],
): Readonly<{ error: unknown }> | undefined {
  const made = making(ports);
  try {
    ports.bus.together(() =>
      effects.forEach(each => ports.bus.emit({ ...made(each), process: act.process, cause: [act.id] })),
    );
    return undefined;
  } catch (error) {
    const failures: readonly unknown[] = error instanceof AggregateError ? error.errors : [error];
    return { error: failures[0] };
  }
}
