// Failures of program rules and effects use the same diagnostic as a failed body, before any public result.
import { requireAvailable } from "../failures/inspection-unavailable.ts";
import { failureOrigin } from "../boundaries/failure-origin.ts";
import type { HouseEvent } from "../../house/facts.ts";
import { baseEntry } from "../failures/base-failure.ts";
import { targetTool } from "../../house/attendance.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import { programDefect } from "../program-defect.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";
export function executionFailure<X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  act: HouseEvent<"act">,
  error: unknown,
) {
  requireAvailable(error);
  error = failureOrigin(error);
  const { object, option } = act.data;
  const tool = targetTool(registry, state, object);
  const declared = tool?.acts[option];
  if (error instanceof OutsideDefect) return programDefect(error, act, tool?.id ?? object, declared);
  const entry = baseEntry(error, act.by, tool?.id ?? object, object, option, declared);
  return { status: "rejected" as const, reason: entry.data.text, defect: true as const, effects: [entry] };
}
