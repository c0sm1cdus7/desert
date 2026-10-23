/** Trusted host infrastructure; not part of product authoring or surface exports. */
export { fixedProcessAdapter } from "./execution/adapter.ts";
export { openExecutionQueue } from "./execution/queue.ts";
export { runNextExecution } from "./execution/worker.ts";
export type { ExecutionActor, ExecutionEnvironment, ExecutionJob, ExecutionQueue, ExecutionResult,
  ExecutionSnapshot, ExecutionState, FixedProcessAdapter, ProcessAdapterDefinition } from "./execution/types.ts";
