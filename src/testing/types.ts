import type { compile } from "../compile.ts";
import type { openLocalController } from "../local.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { Facts, StoredObject, Receipt } from "../local/types.ts";

export type { Facts, StoredObject, Receipt };
export type Application = ReturnType<typeof compile>;
export type Controller = Awaited<ReturnType<typeof openLocalController>>;
export type Mutation = Extract<JourneyDefinition, { kind: "mutation" }>;
export type Step = { journey: Mutation, surfaceId: string, input: Facts };
export type Snapshot = { objects: StoredObject[], receipts: Receipt[] };
export type Obligation = "success" | "inputs" | "authority" | "guards" | "atomicity" | "concurrency" | "recovery";
export type VerificationCase = { id: string, journeyId: string, surfaceId: string, obligation: Obligation };
export type CaseResult = VerificationCase & { status: "passed" | "failed" | "blocked", reason?: string };
export type VerificationReport = {
  scope: "local-controller-sessions", contractDigest: string, planDigest: string,
  revisionBefore: string, revisionAfter: string, hostRevision: string, seed: number,
  completed: boolean, cases: CaseResult[],
};
export interface TestSandbox {
  controller: Controller;
  snapshot(): Promise<Snapshot>;
  rejectReceipts(enabled: boolean): Promise<void>;
  stop(): void;
  start(): void;
  close(): Promise<void>;
}
export interface VerificationHost {
  revision(): string;
  open(application: Application, role: string): Promise<TestSandbox>;
  close(): Promise<void>;
}
export type HostFactory = () => VerificationHost;

export class VerificationGap extends Error {}
