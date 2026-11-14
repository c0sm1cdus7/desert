import type { TSchema } from "@sinclair/typebox";
import type { SecretRef, SecretRefs } from "../../tools/capabilities-contract.ts";
export interface SecretResolver {
  capture(value: Uint8Array): SecretRef;
  use<T>(refs: SecretRefs, body: (material: Readonly<Record<string, Uint8Array>>) => T | Promise<T>): Promise<T>;
}
export type AdapterMethod = Readonly<{
  input: TSchema;
  output: TSchema;
  permissions: Readonly<{ tools: readonly string[]; slots: readonly string[]; capture: boolean }>;
}>;
/** Only this factory receives a resolver. Its methods remain behind schema and permission checks. */
export type AdapterDeclaration = Readonly<{
  methods: Readonly<Record<string, AdapterMethod>>;
  open(resolver: SecretResolver): Readonly<Record<string, (input: unknown) => unknown>>;
}>;
export type AdapterComposition = Readonly<{
  adapters?: Readonly<Record<string, AdapterDeclaration>>;
  credentialSlots?: Readonly<Record<string, readonly string[]>>;
}>;
export type AdapterCode =
  "E-ADAPTER-DECLARATION" | "E-ADAPTER-DENIED" | "E-ADAPTER-INPUT" | "E-ADAPTER-OUTPUT" | "E-ADAPTER-FAILED";
export class AdapterFailure extends Error {
  readonly code: AdapterCode;
  constructor(code: AdapterCode) {
    super(code);
    this.name = "AdapterFailure";
    this.code = code;
    this.stack = code;
  }
}
