// Ownership comes from the failing boundary, never from the action that happened to be running.
import { failureOrigin } from "./failure-origin.ts";
import { OutsideDefect } from "../../fields/program-call.ts";
import { defectEntry } from "../program-defect.ts";
import { baseEntry } from "../failures/base-failure.ts";
import { PortFailure } from "../failures/port-failure.ts";
export function failureEntry(...args: Parameters<typeof defectEntry>) {
  args[0] = failureOrigin(args[0]);
  const [error] = args;
  if (error instanceof OutsideDefect) return defectEntry(...args);
  if (!(error instanceof PortFailure)) return baseEntry(...args);
  const entry = defectEntry(...args);
  return { ...entry, data: { ...entry.data, text: error.reason } };
}
