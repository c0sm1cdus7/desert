// Declara el puerto contractual que el core presta a una acción sin exponer el ejecutor.
import type { Act } from "../house/own-acts.ts";
export type ContractFailureReason = "forbidden" | "interrupted" | "invalid-reference" | "defect" | "inconclusive";
export type CoreFailure = Readonly<{ status: "core-failure"; reason: ContractFailureReason }>;
export type ContractResponse = Readonly<{ status: "accepted" | "rejected"; value: unknown }> | CoreFailure;
export type ContractCut = Readonly<{ sequence: number }>;
export type ContractReference = Readonly<{ provider: string; artifact: string; key: unknown }>;
export type ContractReading =
  | CoreFailure
  | Readonly<{ status: "unavailable"; sequence: number }>
  | Readonly<{ status: "found"; sequence: number; value: unknown; reference: ContractReference }>;
export type ContractPublicNotice = Readonly<{
  id: string;
  sequence: number;
  author: string;
  causes: readonly string[];
  value: unknown;
  cut: ContractCut;
}>;
export type ContractPort = Readonly<{
  actions: Readonly<Record<string, (input: unknown) => Promise<ContractResponse>>>;
  objects: Readonly<
    Record<
      string,
      Readonly<{
        read: (key: unknown, cut: ContractCut) => ContractReading;
        readReference: (reference: ContractReference, cut: ContractCut) => ContractReading;
      }>
    >
  >;
  notices: Readonly<Record<string, (cut: ContractCut) => readonly ContractPublicNotice[] | CoreFailure>>;
}>;
export type ContractAccess = Readonly<{ contracts: Readonly<Record<string, ContractPort>>; cut: ContractCut }>;
export type ContractExecution = Readonly<{
  status: string;
  value?: unknown;
  coreFailure?: ContractFailureReason;
}>;
export type ContractInvocation = Readonly<{
  tool: string;
  by: string;
  signal?: AbortSignal | undefined;
  alive?: () => boolean;
  execute: (act: Act) => Promise<ContractExecution>;
}>;
export type ContractFactory = (invocation: ContractInvocation) => ContractAccess;
