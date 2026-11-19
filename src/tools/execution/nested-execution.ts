// Conserva actor, journey y destino de acciones anidadas al volver al ejecutor común.
import type { execute, Execution } from "../execute.ts";
import type { Act } from "../../house/own-acts.ts";
import type { HouseEvent } from "../../house/facts.ts";
import type { ActResult, Program } from "../tool-contract.ts";
import type { ContractFailureReason } from "../contract-port.ts";
import { targetTool } from "../../house/attendance.ts";
import { identityView } from "../../house/members.ts";
import { toolTexts } from "../../texts/tools.texts.ts";
type Origin = HouseEvent<"act">;
export async function executeNested<X extends Program>(
  ports: Execution<X>,
  origin: Origin,
  nested: Act,
  run: typeof execute,
): Promise<ActResult<X>> {
  if (ports.active?.closed || ports.active?.controller.signal.aborted)
    return { status: "interrupted", reason: toolTexts.withdrawn };
  const { by, id, process } = origin;
  const tool = targetTool(ports.registry, identityView(ports.state(), by), nested.target ?? "");
  const unknown: ActResult<X> = { status: "rejected", reason: toolTexts.unknown };
  if (!tool) return { ...unknown, coreFailure: "invalid-reference" };
  const parent = process ? (ports.state().house.journeys.get(process)?.opened ?? process) : undefined;
  const cause = [id, ...(parent ? [parent] : [])];
  const started = run(ports, nested, origin.data.through ?? 0, by, cause);
  const result = started.status === "processing" ? await started.completion : started;
  let done: ActResult<X>;
  if (result.status === "accepted") done = { status: "accepted" };
  else if (result.status === "inconclusive") done = { status: "inconclusive" };
  else
    done = {
      status: result.status === "interrupted" ? "interrupted" : "rejected",
      reason: result.reason ?? toolTexts.invalid,
    };
  const failure: ContractFailureReason | undefined = result.defect ? "defect" : result.coreFailure;
  return {
    ...done,
    ...(result.value !== undefined ? { value: result.value } : {}),
    ...(failure ? { coreFailure: failure } : {}),
    ...(result.cleanupPending ? { cleanupPending: true } : {}),
    ...(result.anchorPending ? { anchorPending: true } : {}),
  };
}
