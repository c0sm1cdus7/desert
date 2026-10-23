import type { HumanSurface, Evidence } from "../types.ts";
import type { AvailabilitySnapshot, BlockedReason } from "../../availability-types.ts";
import { TransportError, type ControllerTransport } from "./transport.ts";
import { freezeDeep } from "../../json.ts";

export type ConnectionObserver = (publish: (snapshot: AvailabilitySnapshot) => void) => () => void;
type ConnectionDiagnostic = { readonly code: "CONNECTION_SUBSCRIBER_FAILED"; readonly subscriptions: number };
type SharedConnectionObserver = ConnectionObserver & { diagnostics(): readonly ConnectionDiagnostic[] };

export function sharedWebConnection(surface: HumanSurface, transport: ControllerTransport): SharedConnectionObserver {
  const subscribers = new Set<{ publish: (snapshot: AvailabilitySnapshot) => void; reported: boolean }>();
  let stop: (() => void) | undefined;
  let failedSubscriptions = 0;
  const subscribe: ConnectionObserver = publish => {
    const subscriber = { publish, reported: false };
    subscribers.add(subscriber);
    stop ??= observeWebConnection(surface, transport, snapshot => {
      const observation = freezeDeep(structuredClone(snapshot));
      for (const current of [...subscribers]) if (subscribers.has(current)) {
        // A broken consumer must still receive future invalidations and cannot poison other scopes.
        try { current.publish(observation); }
        catch {
          if (!current.reported) { current.reported = true; failedSubscriptions++; }
        }
      }
    });
    return () => {
      subscribers.delete(subscriber);
      if (!subscribers.size) { stop?.(); stop = undefined; }
    };
  };
  return Object.assign(subscribe, { diagnostics: (): readonly ConnectionDiagnostic[] => freezeDeep(failedSubscriptions
    ? [{ code: "CONNECTION_SUBSCRIBER_FAILED", subscriptions: failedSubscriptions }] : []) });
}

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

export function observeWebConnection(surface: HumanSurface, transport: ControllerTransport,
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
      if (!disposed && anyReady && remaining > 0) expiry = setTimeout(() => {
        if (!disposed) publish(blockedSnapshot(surface, "stale"));
      }, remaining);
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
