import type { HouseEvent } from "../../house/facts.ts";
import type { Decision, Execution, ExecutionResult } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import type { ToolCapabilities } from "../capabilities-contract.ts";
import { targetTool } from "../../house/attendance.ts";
import { noCapabilities } from "./capabilities.ts";
import type { RunningAct } from "./running-acts.ts";
type CapabilityOrigin = Pick<HouseEvent<"act">, "by"> & { data: { object: string } };
/** Revocable capabilities last through completion, including drafts, synchronous throws and interruption. */
export function usingCapabilities<X extends Program>(
  ports: Execution<X>,
  origin: CapabilityOrigin,
  work: (ports: Execution<X>, capabilities: ToolCapabilities) => ExecutionResult<X>,
): ExecutionResult<X> {
  const { active, lease, close } = scopedCapabilities(ports, origin);
  try {
    const scoped = { ...ports, active, ...(lease ? { credentialEffects: lease } : {}) };
    const result = work(scoped, lease ?? noCapabilities);
    const finish = (decision: Decision<X>): Decision<X> => {
      const anchorPending = lease?.anchorPending?.();
      close();
      return {
        ...decision,
        ...(lease?.cleanupPending?.() ? { cleanupPending: true } : {}),
        ...(anchorPending || lease?.anchorPending?.() ? { anchorPending: true } : {}),
      };
    };
    if (result.status === "processing")
      return {
        ...result,
        completion: result.completion.then(finish, (error: unknown) => {
          close();
          throw error;
        }),
      };
    return finish(result);
  } catch (error) {
    close();
    throw error;
  }
}

function scopedCapabilities<X extends Program>(ports: Execution<X>, origin: CapabilityOrigin) {
  const parent = ports.active?.controller.signal;
  const target = origin.data.object;
  const tool = targetTool(ports.registry, ports.state(), target)?.id ?? target;
  const active: RunningAct = { controller: new AbortController(), writing: false };
  const abort = () => active.controller.abort(parent?.reason);
  const lease = ports.capabilities?.({ actor: origin.by, tool, target }, active.controller.signal);
  parent?.addEventListener("abort", abort, { once: true });
  if (parent?.aborted) abort();
  const close = () => {
    parent?.removeEventListener("abort", abort);
    if (active.origin) ports.running?.delete(active.origin.id);
    lease?.close();
  };
  return { active, lease, close };
}
