import { freezeDeep } from "./json.ts";
import type { AvailabilitySnapshot, AvailabilityTarget, BlockedReason, Observation } from "./availability-types.ts";

export function projectAvailability(target: AvailabilityTarget, observations: Map<string, Observation>,
  time: number, disposed: boolean): AvailabilitySnapshot {
  const journeys = target.interaction.journeys.map(journey => {
    const blockers = journey.dependencies.flatMap(dependency => {
      const observation = observations.get(dependency);
      let reason: BlockedReason | undefined;
      if (disposed) reason = "disposed";
      else if (!observation) reason = "unknown";
      else if (observation.state !== "ready") reason = observation.state;
      else if (observation.expiresAt <= time) reason = "stale";
      return reason ? [{ dependency, reason }] : [];
    });
    return [journey.id, { dependenciesReady: blockers.length === 0, blockers }];
  });
  return freezeDeep({ contractDigest: target.contractDigest, journeys: Object.fromEntries(journeys) });
}
