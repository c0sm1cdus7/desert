import type { Static, TSchema } from "@sinclair/typebox";
import type { jobsTable } from "../storage/tables/execution.ts";

declare const environmentBrand: unique symbol;
declare const actorBrand: unique symbol;
declare const jobBrand: unique symbol;
declare const adapterBrand: unique symbol;

export type ExecutionEnvironment = Readonly<{ id: string; name: string; label: string; [environmentBrand]: true }>;
export type ExecutionActor<S extends TSchema = TSchema> = Readonly<{
  id: string; name: string; label: string; environment: ExecutionEnvironment;
  [actorBrand]: S;
}>;
export type ExecutionJob = Readonly<{ id: string; [jobBrand]: true }>;
export type FixedProcessAdapter<S extends TSchema = TSchema> = Readonly<{ name: string; [adapterBrand]: S }>;
export type ProcessAdapterDefinition<S extends TSchema> = Readonly<{
  name: string; executable: string; arguments: readonly string[]; workingDirectory: string;
  input: S; timeoutMs: number; maxOutputBytes: number;
}>;
export type ExecutionState = JobRow["state"];
export type ExecutionResult = Readonly<{ exitCode: number | null; signal: string | null; stdout: string; stderr: string }>;
export type ExecutionSnapshot = Readonly<{
  job: ExecutionJob; state: ExecutionState; cancellationRequested: boolean;
  reason: string | null; result: ExecutionResult | null;
}>;
export type ExecutionQueue = Readonly<{
  registerEnvironment(definition: { name: string; label: string }): Promise<ExecutionEnvironment>;
  registerActor<S extends TSchema>(environment: ExecutionEnvironment, definition: {
    name: string; label: string; concurrency: number; adapter: FixedProcessAdapter<S>;
  }): Promise<ExecutionActor<S>>;
  enqueue<S extends TSchema>(actor: ExecutionActor<S>, submission: { key: string; input: Static<NoInfer<S>> }): Promise<ExecutionJob>;
  lookup(actor: ExecutionActor, key: string): Promise<ExecutionJob | undefined>;
  jobs(actor: ExecutionActor): Promise<readonly ExecutionJob[]>;
  inspect(job: ExecutionJob): Promise<ExecutionSnapshot>;
  cancel(job: ExecutionJob): Promise<ExecutionSnapshot>;
  close(): Promise<void>;
}>;

export type JobRow = Static<typeof jobsTable.row>;
