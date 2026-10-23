import type { ActivityDefinition } from "./authoring.ts";
import type { ActivityJourney } from "./references.ts";
import type { ReadJourneyTarget } from "../modules/authored-types.ts";

export function activityExperience<const J extends ActivityJourney, const S extends ReadJourneyTarget>(activity: ActivityDefinition<J>, source: S) {
  return Object.freeze({ id: activity.journey.id, kind: "activity" as const, source, activity,
    preferredDock: "right" as const, outputs: [] as const });
}
