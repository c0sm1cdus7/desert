// A program's result writes atomically; a broken fold or listener remains a diagnostic, never a refusal string.
import { failureOrigin } from "../boundaries/failure-origin.ts";
import type { Emission, HouseEvent } from "../../journal/events.ts";
import type { Execution } from "../execute.ts";
import { making } from "../made.ts";
import type { Program } from "../tool-contract.ts";

export function writtenEffects<X extends Program>(
  ports: Execution<X>,
  act: HouseEvent<"act">,
  effects: readonly Emission<X["fact"]>[],
  accepted = false,
): Readonly<{ error: unknown }> | undefined {
  const made = making(ports);
  try {
    const write = () =>
      effects.forEach(each => {
        if (!ports.credentialEffects?.apply(each, accepted))
          ports.bus.emit({ ...made(each), process: act.process, cause: [act.id] });
      });
    ports.bus.together(() => (ports.credentialEffects ? ports.credentialEffects.together(write) : write()));
    return undefined;
  } catch (error) {
    return { error: failureOrigin(error) };
  }
}
