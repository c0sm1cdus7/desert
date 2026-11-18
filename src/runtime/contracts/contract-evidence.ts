// Calcula huellas de las mitades y acredita sólo ejecuciones emitidas por la compuerta local.
import { createHash } from "node:crypto";
import { contractTexts } from "../../texts/contracts.texts.ts";
import type { ContractCase, ContractPackage } from "./package-contracts.ts";
export type ContractBuild = Readonly<{ core: string; executor: string }>;
export type ContractEvidence = Readonly<{
  provider: string;
  consumer: string;
  contract: string;
  case: string;
  providerArtifact: string;
  consumerArtifact: string;
  offer: string;
  request: string;
  caseHash: string;
  core: string;
  executor: string;
  observations: string;
  result: "passed" | "failed" | "environment";
  hash: string;
}>;
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, ordered(item)]),
    );
  return value;
}
export const contractHash = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(ordered(value)))
    .digest("hex");
export function evidenceIdentity(
  provider: ContractPackage,
  consumer: ContractPackage,
  name: string,
  scenario: ContractCase,
  build: ContractBuild,
) {
  const request = consumer.pide[name];
  const half = request && { acciones: request.acciones, objetos: request.objetos, avisos: request.avisos };
  return {
    provider: provider.id,
    consumer: consumer.id,
    contract: name,
    case: scenario.id,
    providerArtifact: contractHash([provider.id, provider.version, provider.artifact]),
    consumerArtifact: contractHash([consumer.id, consumer.version, consumer.artifact]),
    offer: contractHash(provider.ofrece[name]),
    request: contractHash(half),
    caseHash: contractHash(scenario),
    ...build,
  };
}
// The issuer is kept by the gate instance; an imported JSON row is not execution provenance.
export function evidenceLedger() {
  const issued = new WeakSet<ContractEvidence>();
  const record = (value: Omit<ContractEvidence, "hash">): ContractEvidence => {
    const evidence = Object.freeze({ ...value, hash: contractHash(value) });
    issued.add(evidence);
    return evidence;
  };
  const matches = (evidence: ContractEvidence, identity: ReturnType<typeof evidenceIdentity>) =>
    issued.has(evidence) &&
    evidence.result === "passed" &&
    Object.entries(identity).every(([key, value]) => Reflect.get(evidence, key) === value);
  return { record, matches };
}
export type EvidenceVerifier = ReturnType<typeof evidenceLedger>["matches"];
export const compatibilityLabel = (checked: boolean, failed = false): string => {
  if (failed) return contractTexts.failed;
  return checked ? contractTexts.passed : contractTexts.unchecked;
};
