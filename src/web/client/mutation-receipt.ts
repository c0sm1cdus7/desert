import type { HumanSurface, Receipt } from "../types.ts";
import type { HumanState } from "./state.ts";
import { TransportError } from "./transport.ts";

export function requireMutationReceipt(prepared: HumanState["prepared"],
  journey: HumanSurface["journeys"][number] | undefined, receipt: Receipt): Receipt {
  if (!prepared || journey?.kind !== "mutation" || prepared.journeyId !== journey.id ||
    prepared.object.type !== journey.object || !Number.isSafeInteger(prepared.object.expectedVersion) ||
    (journey.subject ? prepared.object.expectedVersion < 1 : prepared.object.expectedVersion !== 0) ||
    receipt?.id !== prepared.id || receipt.runId !== prepared.runId || receipt.commandId !== journey.commandId ||
    receipt.status !== "completed" || receipt.object?.id !== prepared.object.id || receipt.object.type !== prepared.object.type ||
    !Number.isSafeInteger(receipt.object.version) || receipt.object.version !== prepared.object.expectedVersion + 1) {
    throw new TransportError("INVALID_RESPONSE");
  }
  return receipt;
}
