// Declares program artifacts, bindable offers and cases independent of whoever requests them.
import type { ContractAction, ContractInterface, ContractNotice, ContractObject } from "./contract-types.ts";
export type ContractCaseStep =
  | Readonly<{ kind: "action"; name: string; input: unknown; expect: unknown }>
  | Readonly<{ kind: "read"; name: string; key: unknown; at: "current" | "notice"; expect: unknown }>
  | Readonly<{ kind: "notices"; name: string; expect: unknown }>;
export type ContractCase = Readonly<{
  id: string;
  actor: string;
  prepare: unknown;
  steps: readonly ContractCaseStep[];
}>;
export type ContractRequest = ContractInterface & Readonly<{ cases: readonly ContractCase[] }>;
export type ContractOffer = Readonly<{
  version: string;
  actions: Readonly<Record<string, ContractAction & Readonly<{ route: string }>>>;
  objects: Readonly<Record<string, ContractObject & Readonly<{ projector: string }>>>;
  notices: Readonly<Record<string, ContractNotice & Readonly<{ fact: string }>>>;
}>;
export type ContractProjector = (own: Readonly<Record<string, unknown>>, key: unknown) => unknown;
export type ContractPackage = Readonly<{
  id: string;
  version: string;
  artifact: string;
  desert: number;
  tools: Readonly<Record<string, readonly string[]>>;
  facts: readonly string[];
  projectors: Readonly<Record<string, ContractProjector>>;
  offers: Readonly<Record<string, ContractOffer>>;
  requests: Readonly<Record<string, ContractRequest>>;
}>;
