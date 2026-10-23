import { requireAdapter } from "./adapter.ts";
import { claimNext, finishClaim, startClaim } from "./claims.ts";
import { issueJob, queueContext, requireActor } from "./context.ts";
import { executeFixedProcess } from "./process.ts";
import type { ExecutionActor, ExecutionQueue, ExecutionSnapshot } from "./types.ts";

export async function runNextExecution(queue: ExecutionQueue, actor: ExecutionActor): Promise<ExecutionSnapshot | undefined> {
  const context = queueContext(queue);
  const adapter = requireAdapter(requireActor(context, actor));
  const claim = await claimNext(context, actor);
  if (!claim) return undefined;
  const job = issueJob(context, claim.id);
  if (await startClaim(context, claim)) {
    const outcome = await executeFixedProcess(context, claim, adapter.definition);
    await finishClaim(context, claim, outcome);
  }
  return queue.inspect(job);
}
