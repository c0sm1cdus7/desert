// A failed initial journal write has no act id; keep its diagnostic directly, or report the lost record.
import type { HouseEmission } from "../../journal/events.ts";
import type { Execution } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import { failureEntry } from "../boundaries/failure-entry.ts";
import { baseEntry, lostDiagnostic } from "./base-failure.ts";

export function startAct<X extends Program>(ports: Execution<X>, emission: HouseEmission<"act">) {
  try {
    return { act: ports.bus.emit(emission) };
  } catch (error) {
    const { object, option } = emission.data;
    const entry = ports.secrets.scrub(failureEntry(error, emission.by, object, object, option));
    try {
      ports.bus.emit(entry);
    } catch (failure) {
      lostDiagnostic(entry, ports.secrets.scrub(baseEntry(failure, emission.by, object, object, option)));
    }
    return {
      failed: { status: "rejected" as const, reason: entry.data.text, defect: true as const, effects: [entry] },
    };
  }
}
