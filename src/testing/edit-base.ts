import type { JourneyDefinition } from "../program-grammar.ts";
import type { PrepareOptions } from "../prepare-options.ts";
import { VerificationGap, type Snapshot } from "./types.ts";

/** The caller captures this observation before admission; preparation cannot refresh it. */
export function observedEditBase(journey: JourneyDefinition, before: Snapshot, subject?: string): PrepareOptions | undefined {
  if (journey.kind !== "mutation" || journey.command.kind !== "update") return undefined;
  const record = before.objects.find(item => item.id === subject && item.object_type === journey.command.object);
  if (!record) throw new VerificationGap("NO_OBSERVED_EDIT_BASE");
  return { expectedVersion: record.version };
}
