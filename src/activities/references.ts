import type { Frozen } from "../json.ts";
import type { Mutation } from "../local/types.ts";
import type { ModuleReference } from "../modules/reference-types.ts";
import { publicReference } from "../modules/references.ts";

export type ActivityJourney = Frozen<Mutation> |
  ModuleReference<"journey", string, string, { readonly execution: Frozen<Mutation> }>;
export type ActivityExecution<J extends ActivityJourney> = J extends Frozen<Mutation> ? J
  : J extends ModuleReference<"journey", string, string, { readonly execution: infer E extends Frozen<Mutation> }> ? E : never;

export function activityJourney(value: ActivityJourney): Frozen<Mutation> {
  const reference = publicReference(value, "journey");
  const execution = reference ? reference.execution as Frozen<Mutation> | undefined : value as Frozen<Mutation>;
  if (!execution || execution.kind !== "mutation") throw new Error("ACTIVITY_OPERATION_REQUIRES_MUTATION");
  return execution;
}
