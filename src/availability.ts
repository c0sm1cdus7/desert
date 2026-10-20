import { freezeDeep, jsonSnapshot } from "./json.ts";
import { projectAvailability } from "./project-availability.ts";
import { runtimeClock, type AvailabilityClock, type AvailabilitySnapshot,
  type AvailabilityTarget, type Observation, type UnavailableReason } from "./availability-types.ts";

export function createAvailability(target: AvailabilityTarget, options: {
  clock?: AvailabilityClock, onListenerError?: (error: unknown) => void,
} = {}) {
  const definition = freezeDeep(jsonSnapshot(target) as unknown as AvailabilityTarget);
  const clock = options.clock ?? runtimeClock;
  const observations = new Map<string, Observation>();
  const sessions = new Map<string, symbol>();
  const listeners = new Set<(snapshot: AvailabilitySnapshot) => void>();
  const dependencies = new Set(definition.bindings.map(binding => binding.dependency));
  if (dependencies.size !== definition.bindings.length) throw new Error("Duplicate binding");
  for (const journey of definition.interaction.journeys) {
    if (journey.dependencies.length === 0) throw new Error("Missing journey dependencies");
    for (const id of journey.dependencies) if (!dependencies.has(id)) throw new Error(`Missing binding: ${id}`);
  }
  let disposed = false;
  let publishing = false;
  let revision = 0;
  let cancelTimer: (() => void) | undefined;

  const snapshot = () => projectAvailability(definition, observations, clock.now(), disposed);
  function deliver(listener: (value: AvailabilitySnapshot) => void, value: AvailabilitySnapshot) {
    try { listener(value); }
    catch (error) {
      try { options.onListenerError?.(error); }
      catch { /* Diagnostic consumers cannot interrupt observation or resource cleanup. */ }
    }
  }
  function publish() {
    revision++;
    cancelTimer?.();
    cancelTimer = undefined;
    const deadlines = [...observations.values()].flatMap(observation =>
      observation.state === "ready" && observation.expiresAt > clock.now() ? [observation.expiresAt] : []);
    if (!disposed && deadlines.length) cancelTimer = clock.schedule(publish, Math.min(...deadlines) - clock.now());
    if (publishing) return;
    publishing = true;
    try {
      let deliveredRevision: number;
      do {
        deliveredRevision = revision;
        const value = snapshot();
        for (const listener of [...listeners]) {
          if (revision !== deliveredRevision) break;
          if (listeners.has(listener)) deliver(listener, value);
        }
      } while (deliveredRevision !== revision);
    } finally { publishing = false; }
  }

  function begin(dependency: string) {
    if (disposed) throw new Error("Availability is disposed");
    if (!dependencies.has(dependency)) throw new Error(`Unknown dependency: ${dependency}`);
    const session = Symbol(dependency);
    sessions.set(dependency, session);
    const active = () => !disposed && sessions.get(dependency) === session;
    function update(observation: Observation) {
      if (!active()) return false;
      observations.set(dependency, observation);
      publish();
      return true;
    }
    update({ state: "unknown" });
    return Object.freeze({
      ready(contractDigest: string, validForMs: number) {
        if (!active()) return false;
        if (!Number.isInteger(validForMs) || validForMs <= 0 || validForMs > 2147483647) throw new Error("Invalid lease");
        return update(contractDigest === definition.contractDigest
          ? { state: "ready", expiresAt: clock.now() + validForMs } : { state: "incompatible" });
      },
      unavailable(reason: UnavailableReason) {
        if (!active()) return false;
        if (!["unreachable", "session-required", "unavailable"].includes(reason)) throw new Error("Unknown availability reason");
        return update({ state: reason });
      },
      incompatible() { return update({ state: "incompatible" }); },
      close() {
        if (!active()) return false;
        sessions.delete(dependency);
        observations.set(dependency, { state: "unavailable" });
        publish();
        return true;
      },
    });
  }

  return Object.freeze({
    snapshot, begin,
    evidence() {
      const now = clock.now();
      const leases = [...observations.values()].flatMap(value =>
        value.state === "ready" && value.expiresAt > now ? [value.expiresAt - now] : []);
      return Object.freeze({ snapshot: projectAvailability(definition, observations, now, disposed),
        validForMs: Math.max(0, Math.floor(leases.length ? Math.min(...leases) : 0)) });
    },
    subscribe(listener: (value: AvailabilitySnapshot) => void) {
      if (disposed) throw new Error("Availability is disposed");
      listeners.add(listener);
      deliver(listener, snapshot());
      return () => { listeners.delete(listener); };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      sessions.clear();
      publish();
      listeners.clear();
    },
  });
}
