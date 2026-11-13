export type SecretRef = `secret:${string}`;
export type CredentialScope = Readonly<{ actor: string; tool: string; target: string }>;
export type SecretRefs = Readonly<Record<string, SecretRef>>;
export type Credential = Readonly<{ revision: number; refs: SecretRefs }>;
export type CredentialFact = Readonly<{
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
}
export type CustodyRow = Readonly<{ ref: SecretRef; payload: string | null; owner: string | null; retained: boolean }>;
export type CredentialIngress = Readonly<{ id: string; scope: CredentialScope }>;
export const sameScope = (a: CredentialScope, b: CredentialScope): boolean =>
  a.actor === b.actor && a.tool === b.tool && a.target === b.target;
