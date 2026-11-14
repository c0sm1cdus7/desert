import type { CredentialScope, SecretRefs, SecretRef } from "../../../tools/capabilities-contract.ts";
export type { CredentialScope, SecretRefs, SecretRef, Credential } from "../../../tools/capabilities-contract.ts";
export type CredentialFact = Readonly<{
  authentication?: string;
  batchSize?: number;
  batchIndex?: number;
  id: string;
  kind: "credential-bound" | "credential-released" | "credential-cleanup-pending" | "credential-purged";
  actor: string;
  tool: string;
  target: string;
  slot: string;
  revision: number;
  refs: SecretRefs;
  cause: string;
}>;
/** append must commit all-or-nothing before returning; facts returns only committed batches, in order. */
export interface CredentialLedger {
  append(fact: CredentialFact): void;
  facts(): readonly CredentialFact[];
  appendBatch?(facts: readonly CredentialFact[]): void;
  pending?(): boolean;
  afterCommit?(work: () => void): void;
}
export type CustodyRow = Readonly<{ ref: SecretRef; payload: string | null; owner: string | null; retained: boolean }>;
export type CredentialIngress = Readonly<{ id: string; scope: CredentialScope }>;
export const sameScope = (a: CredentialScope, b: CredentialScope): boolean =>
  a.actor === b.actor && a.tool === b.tool && a.target === b.target;
