import { randomUUID } from "node:crypto";
import { freezeDeep } from "../json.ts";
import { executionDigest, executionInput, requireAdapter, requireKeys } from "./adapter.ts";
import { executionTransaction, issueJob, requireActor, requireJob, type QueueContext } from "./context.ts";
import type { ExecutionActor, ExecutionJob, ExecutionSnapshot, JobRow } from "./types.ts";

function requireSubmissionKey(key: string) {
  if (typeof key !== "string" || !key.trim() || key.length > 200) throw new Error("EXECUTION_SUBMISSION_KEY_INVALID");
}
export async function enqueue(context: QueueContext, actor: ExecutionActor, submission: { key: string; input: unknown }) {
  const adapter = requireAdapter(requireActor(context, actor));
  requireKeys(submission, ["key", "input"]); requireSubmissionKey(submission.key);
  const input = executionInput(adapter, submission.input);
  const digest = executionDigest(input);
  const record = await executionTransaction(context, async client => {
    await client.query(`INSERT INTO desert_execution.jobs (id, actor_id, submission_key, input, input_digest, state)
      VALUES ($1,$2,$3,$4,$5,'queued') ON CONFLICT (actor_id, submission_key) DO NOTHING`,
    [randomUUID(), actor.id, submission.key, JSON.stringify(input), digest]);
    const { rows: [record] } = await client.query<JobRow>(`SELECT * FROM desert_execution.jobs WHERE actor_id=$1 AND submission_key=$2`,
      [actor.id, submission.key]);
    if (record!.input_digest !== digest) throw new Error("EXECUTION_SUBMISSION_CONFLICT");
    return record!;
  });
  return issueJob(context, record.id);
}
export async function lookup(context: QueueContext, actor: ExecutionActor, key: string) {
  requireActor(context, actor); requireSubmissionKey(key);
  const record = await executionTransaction(context, async client =>
    (await client.query<JobRow>("SELECT * FROM desert_execution.jobs WHERE actor_id=$1 AND submission_key=$2", [actor.id, key])).rows[0]);
  return record ? issueJob(context, record.id) : undefined;
}
export async function jobs(context: QueueContext, actor: ExecutionActor) {
  requireActor(context, actor);
  const records = await executionTransaction(context, async client =>
    (await client.query<JobRow>("SELECT * FROM desert_execution.jobs WHERE actor_id=$1 ORDER BY sequence", [actor.id])).rows);
  return Object.freeze(records.map(record => issueJob(context, record.id)));
}
const snapshot = (job: ExecutionJob, row: JobRow): ExecutionSnapshot => freezeDeep({ job, state: row.state,
  cancellationRequested: row.cancel_requested, reason: row.reason, result: row.result });

export async function inspect(context: QueueContext, job: ExecutionJob) {
  requireJob(context, job);
  const row = await executionTransaction(context, async client =>
    (await client.query<JobRow>("SELECT * FROM desert_execution.jobs WHERE id=$1", [job.id])).rows[0]);
  if (!row) throw new Error("EXECUTION_JOB_MISSING");
  return snapshot(job, row);
}
export async function cancel(context: QueueContext, job: ExecutionJob) {
  requireJob(context, job);
  const row = await executionTransaction(context, async client => {
    const { rows: [record] } = await client.query<JobRow>("SELECT * FROM desert_execution.jobs WHERE id=$1 FOR UPDATE", [job.id]);
    if (!record) throw new Error("EXECUTION_JOB_MISSING");
    if (!["queued", "leased", "running"].includes(record.state)) return record;
    return (await client.query<JobRow>(`UPDATE desert_execution.jobs SET cancel_requested=true,
      state=CASE WHEN state='running' THEN state ELSE 'cancelled' END WHERE id=$1 RETURNING *`, [job.id])).rows[0]!;
  });
  return snapshot(job, row);
}
