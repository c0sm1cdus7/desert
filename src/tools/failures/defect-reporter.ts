// Surface failures leave the same scrubbed support entry as failures of an action body.
import { requireAvailable } from "./inspection-unavailable.ts";
import { baseEntry, lostDiagnostic } from "./base-failure.ts";
import { failureEntry } from "../boundaries/failure-entry.ts";
import { defectEntry } from "../program-defect.ts";
import type { Program, ToolRegistry } from "../tool-contract.ts";
type Entry = ReturnType<typeof defectEntry>;
export const defectReporter =
  <X extends Program>(
    registry: ToolRegistry<X>,
    by: string,
    write: (entry: Entry) => void,
    scrub: <T>(value: T) => T,
  ) =>
  (error: unknown, tool: string, target: string, option: string): string => {
    requireAvailable(error);
    const declared = registry.find(known => known.id === tool)?.acts[option];
    const entry = scrub(failureEntry(scrub(error), by, tool, target, option, declared));
    try {
      write(entry);
      return entry.data.text;
    } catch (failure) {
      const failed = scrub(baseEntry(scrub(failure), by, tool, target, option, declared));
      lostDiagnostic(entry, failed);
      return failed.data.text;
    }
  };
