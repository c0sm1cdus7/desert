// The one check every served artifact passes first: it was built behind the catalog gate (plan 3.5). An older format or
// a missing or unknown gate version is UNQUALIFIED_ARTIFACT, before any schema-generic check can name it otherwise.
import { catalogGateEvidence } from "../authoring/catalog/gate/build-gate.ts";

export const gateVersion = catalogGateEvidence.version;
const field = (from: unknown, key: string) => from && typeof from === "object" ? Reflect.get(from, key) : undefined;

export function requireGateEvidence(manifest: unknown, format: string, artifact: string): void {
  const found = field(manifest, "format");
  if (found !== format) throw new Error(`UNQUALIFIED_ARTIFACT: ${artifact} format ${String(found)} is not ${format}`);
  if (field(field(manifest, "gate"), "version") !== gateVersion) throw new Error(`UNQUALIFIED_ARTIFACT: no evidence of ${gateVersion}`);
}
