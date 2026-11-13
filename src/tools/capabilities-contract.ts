import type { HouseEmission } from "../journal/events.ts";
/** Public capabilities contain references and declared operations, never a way to read material. */
export type SecretRef = `secret:${string}`;
export type SecretRefs = Readonly<Record<string, SecretRef>>;
export type Credential = Readonly<{ revision: number; refs: SecretRefs }>;
export type CredentialScope = Readonly<{ actor: string; tool: string; target: string }>;
export type PublicMethod = (input: unknown) => Promise<unknown>;
export type PublicPorts = Readonly<Record<string, Readonly<Record<string, PublicMethod>>>>;
export interface CredentialOperations {
  current(slot: string): Credential | undefined;
  revision(slot: string): number;
  replace(slot: string, refs: SecretRefs, expected: number): HouseEmission<"tool-entry">;
  release(slot: string, expected: number): HouseEmission<"tool-entry">;
}
export type ToolCapabilities = Readonly<{ ports: PublicPorts; credentials: CredentialOperations }>;
