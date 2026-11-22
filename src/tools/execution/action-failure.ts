// Tells the cut's cause from an independent defect before scrubbing and recording its diagnostic.
import type { HouseEvent } from "../../house/facts.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
import type { Decision, Execution } from "../execute.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import type { Program } from "../tool-contract.ts";
import { executionFailure } from "./execution-failure.ts";
/** Classify the signal's own rejection before scrubbing; unrelated defects keep their normal diagnostic. */
export function actionFailure<X extends Program>(
  ports: Execution<X>,
  act: HouseEvent<"act">,
  error: unknown,
): Decision<X> {
  const signal = ports.active?.controller.signal;
  let cause = error;
  while (cause instanceof OutsideDefect) cause = cause.detail;
  if (signal?.aborted && cause === signal.reason)
    return { status: "interrupted", reason: toolTexts.withdrawn, effects: [] };
  return executionFailure(ports.registry, ports.state(), act, ports.secrets.scrub(error));
}
