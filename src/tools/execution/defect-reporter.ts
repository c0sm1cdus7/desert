// Surface failures leave the same scrubbed support entry as failures of an action body.
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
    const declared = registry.find(known => known.id === tool)?.acts[option];
    const entry = scrub(defectEntry(error, by, tool, target, option, declared));
    write(entry);
    return entry.data.text;
  };
