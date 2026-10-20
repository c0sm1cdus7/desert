import type { HumanSurface, Evidence } from "../types.ts";
import type { AvailabilitySnapshot, BlockedReason } from "../../availability-types.ts";
import { TransportError, type Transport } from "./transport.ts";

export function blockedSnapshot(surface: HumanSurface, reason: BlockedReason): AvailabilitySnapshot {
  return { contractDigest: surface.contractDigest, journeys: Object.fromEntries(surface.journeys.map(journey =>
    [journey.id, { dependenciesReady: false, blockers: journey.dependencies.map(dependency => ({ dependency, reason })) }])) };
}

function verifyEvidence(surface: HumanSurface, evidence: Evidence) {
  if (evidence.snapshot?.contractDigest !== surface.contractDigest) throw new TransportError("CONTRACT_MISMATCH");
  if (!Number.isFinite(evidence.validForMs) || evidence.validForMs < 0 || evidence.validForMs > 60000) throw new TransportError("INVALID_RESPONSE");
  const journeys = evidence.snapshot.journeys;
  if (!journeys || Object.keys(journeys).length !== surface.journeys.length) throw new TransportError("INVALID_RESPONSE");
  for (const definition of surface.journeys) {
    const value = journeys[definition.id];
    if (!value || typeof value.dependenciesReady !== "boolean" || !Array.isArray(value.blockers) ||
      value.dependenciesReady !== (value.blockers.length === 0) || value.blockers.some(blocker =>
        !definition.dependencies.includes(blocker.dependency) ||
        !["unknown", "stale", "incompatible", "unreachable", "session-required", "unavailable", "disposed"].includes(blocker.reason))) {
      throw new TransportError("INVALID_RESPONSE");
    }
  }
}

export function observeWebConnection(surface: HumanSurface, transport: Transport,
  publish: (snapshot: AvailabilitySnapshot) => void) {
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let expiry: ReturnType<typeof setTimeout> | undefined;
  async function poll() {
    const started = performance.now();
    try {
      const evidence = await transport.evidence();
      if (disposed) return;
      verifyEvidence(surface, evidence);
      clearTimeout(expiry);
      const remaining = Math.floor(evidence.validForMs - (performance.now() - started));
      const anyReady = Object.values(evidence.snapshot.journeys).some(journey => journey.dependenciesReady);
      publish(anyReady && remaining <= 0 ? blockedSnapshot(surface, "stale") : evidence.snapshot);
      if (anyReady && remaining > 0) expiry = setTimeout(() => publish(blockedSnapshot(surface, "stale")), remaining);
    } catch (error) {
      if (disposed) return;
      clearTimeout(expiry);
      const code = error instanceof TransportError ? error.code : "INVALID_RESPONSE";
      publish(blockedSnapshot(surface, code === "CONTRACT_MISMATCH" ? "incompatible" :
        ["UNAUTHENTICATED", "BROWSER_SESSION_REQUIRED"].includes(code) ? "session-required" : "unreachable"));
    } finally { if (!disposed) timer = setTimeout(poll, 250); }
  }
  void poll();
  return () => { disposed = true; clearTimeout(timer); clearTimeout(expiry); };
}
