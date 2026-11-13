// Failures of program rules and effects use the same diagnostic as a failed body, before any public result.
import type { HouseEvent } from "../../journal/events.ts";
import { BaseFailure, baseEntry } from "../failures/base-failure.ts";
import { targetTool } from "../attendance.ts";
import { OutsideDefect } from "../outside.ts";
import { programDefect } from "../program-defect.ts";
import { isProgram } from "./program-causes.ts";
import type { Program, State, ToolRegistry } from "../tool-contract.ts";

export function executionFailure<X extends Program>(
  registry: ToolRegistry<X>,
  state: State<X>,
  act: HouseEvent<"act">,
  error: unknown,
) {
  const { object, option } = act.data;
  const tool = targetTool(registry, state, object);
  const declared = tool?.acts[option];
  if (!(error instanceof BaseFailure) && (error instanceof OutsideDefect || (declared && isProgram(declared))))
    return programDefect(
      error instanceof OutsideDefect ? error : new OutsideDefect(error),
      act,
      tool?.id ?? object,
      declared,
    );
  const entry = baseEntry(error, act.by, tool?.id ?? object, object, option, declared);
  return { status: "rejected" as const, reason: entry.data.text, defect: true as const, effects: [entry] };
}
