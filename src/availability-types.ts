export type UnavailableReason = "unreachable" | "session-required" | "unavailable";
export type BlockedReason = UnavailableReason | "unknown" | "stale" | "incompatible" | "disposed";
export type Observation = { state: "ready", expiresAt: number } | { state: BlockedReason };
export type AvailabilityTarget = {
  readonly contractDigest: string;
  readonly bindings: readonly { readonly dependency: string }[];
  readonly interaction: {
    readonly journeys: readonly { readonly id: string, readonly dependencies: readonly string[] }[];
  };
};
export type AvailabilityClock = {
  now(): number;
  schedule(callback: () => void, delay: number): () => void;
};
export type JourneyAvailability = {
  readonly dependenciesReady: boolean;
  readonly blockers: readonly { readonly dependency: string, readonly reason: BlockedReason }[];
};
export type AvailabilitySnapshot = {
  readonly contractDigest: string;
  readonly journeys: Readonly<Record<string, JourneyAvailability>>;
};

export const runtimeClock: AvailabilityClock = {
  now: () => performance.now(),
  schedule(callback, delay) {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  },
};
