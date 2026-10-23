import { randomUUID } from "node:crypto";
import { executionTransaction, requireActor, type QueueContext } from "./context.ts";
import { executionDigest, executionInput, requireAdapter } from "./adapter.ts";
import type { ExecutionActor, ExecutionResult, ExecutionState, JobRow } from "./types.ts";

export type Claim = { id: string; token: string; input: unknown };
export async function claimNext(context: QueueContext, actor: ExecutionActor): Promise<Claim | undefined> {
  const adapter = requireAdapter(requireActor(context, actor));
  return executionTransaction(context, async client => {
    const { rows: [binding] } = await client.query("SELECT * FROM desert_execution.actors WHERE id=$1 FOR UPDATE", [actor.id]);
    if (!binding || binding.adapter_digest !== adapter.digest) throw new Error("EXECUTION_ACTOR_BINDING_CONFLICT");
    await client.query(`UPDATE desert_execution.jobs SET state='uncertain', reason='worker-lease-expired'
      WHERE actor_id=$1 AND state IN ('leased','running') AND lease_until<=clock_timestamp()`, [actor.id]);
    const { rows: [active] } = await client.query(`SELECT count(*)::int AS count FROM desert_execution.jobs
      WHERE actor_id=$1 AND state IN ('leased','running','uncertain')`, [actor.id]);
    if (active.count >= binding.concurrency) return undefined;
    const { rows: [job] } = await client.query<JobRow>(`SELECT * FROM desert_execution.jobs
      WHERE actor_id=$1 AND state='queued' ORDER BY sequence FOR UPDATE SKIP LOCKED LIMIT 1`, [actor.id]);
    if (!job) return undefined;
    const input = executionInput(adapter, job.input);
    if (executionDigest(input) !== job.input_digest) throw new Error("EXECUTION_STORED_INPUT_MISMATCH");
    const token = randomUUID();
    await client.query(`UPDATE desert_execution.jobs SET state='leased', claim_token=$2,
      lease_until=clock_timestamp()+($3::integer * interval '1 millisecond') WHERE id=$1`, [job.id, token, context.leaseMs]);
    return { id: job.id, input, token };
  });
}

export async function startClaim(context: QueueContext, claim: Claim) {
  return executionTransaction(context, async client => (await client.query(`UPDATE desert_execution.jobs SET state='running'
    WHERE id=$1 AND claim_token=$2 AND state='leased' AND NOT cancel_requested AND lease_until>clock_timestamp() RETURNING id`,
  [claim.id, claim.token])).rowCount === 1);
}
export async function renewClaim(context: QueueContext, claim: Claim) {
  return executionTransaction(context, async client => {
    const { rows: [record] } = await client.query<{ cancel_requested: boolean }>(`UPDATE desert_execution.jobs
      SET lease_until=clock_timestamp()+($3::integer * interval '1 millisecond')
      WHERE id=$1 AND claim_token=$2 AND state='running' AND lease_until>clock_timestamp() RETURNING cancel_requested`,
    [claim.id, claim.token, context.leaseMs]);
    if (!record) throw new Error("EXECUTION_CLAIM_LOST");
    return record.cancel_requested;
  });
}
export async function finishClaim(context: QueueContext, claim: Claim,
  outcome: { state: Extract<ExecutionState, "succeeded" | "failed" | "uncertain">; reason: string | null; result: ExecutionResult }) {
  return executionTransaction(context, async client => {
    const { rows: [record] } = await client.query<JobRow & { live: boolean }>(`SELECT *, lease_until>clock_timestamp() AS live
      FROM desert_execution.jobs WHERE id=$1 FOR UPDATE`, [claim.id]);
    if (!record || record.claim_token !== claim.token || record.state !== "running") return false;
    const reason = !record.live ? "worker-lease-expired" : record.cancel_requested ? "cancelled-after-start" : outcome.reason;
    const state = !record.live || record.cancel_requested ? "uncertain" : outcome.state;
    await client.query(`UPDATE desert_execution.jobs SET state=$2, reason=$3, result=$4, lease_until=NULL WHERE id=$1`,
      [claim.id, state, reason, JSON.stringify(outcome.result)]);
    return true;
  });
}
