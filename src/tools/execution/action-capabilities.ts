import type { HouseEvent } from "../../journal/events.ts";
import type { Execution, ExecutionResult } from "../execute.ts";
import type { Program } from "../tool-contract.ts";
import type { ToolCapabilities } from "../capabilities-contract.ts";
import { targetTool } from "../attendance.ts";
import { noCapabilities } from "./capabilities.ts";
/** Revocable capabilities last through completion, including drafts, synchronous throws and interruption. */
export function usingCapabilities<X extends Program>(
  ports: Execution<X>,
  origin: Pick<HouseEvent<"act">, "by"> & { data: { object: string } },
  work: (ports: Execution<X>, capabilities: ToolCapabilities) => ExecutionResult<X>,
): ExecutionResult<X> {
  const target = origin.data.object;
  const tool = targetTool(ports.registry, ports.state(), target)?.id ?? target;
  const lease = ports.capabilities?.({ actor: origin.by, tool, target });
  try {
    const scoped = lease ? { ...ports, credentialEffects: lease } : ports;
    const result = work(scoped, lease ?? noCapabilities);
    if (result.status === "processing")
      return { ...result, completion: result.completion.finally(() => lease?.close()) };
    lease?.close();
    return result;
  } catch (error) {
    lease?.close();
    throw error;
  }
}
