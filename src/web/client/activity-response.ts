import type { ActivityExperience, ActivitySnapshot } from "./activity-state.ts";
import { TransportError } from "./transport.ts";
import { jsonSnapshot } from "../../json.ts";

export function requireActivityResponse(activity: ActivitySnapshot, experience: ActivityExperience,
  expectedId?: string, intentId?: string): ActivitySnapshot {
  if (expectedId !== undefined && activity.id !== expectedId) throw new TransportError("INVALID_RESPONSE");
  if (JSON.stringify(jsonSnapshot(activity.plan)) !== JSON.stringify(jsonSnapshot(experience.activity))) {
    throw new TransportError("ACTIVITY_CATALOG_CHANGED");
  }
  if (activity.prepared && (activity.prepared.id !== activity.intentId || activity.prepared.journeyId !== experience.id)
    || intentId !== undefined && (activity.intentId !== intentId || activity.prepared?.id !== intentId)) {
    throw new TransportError("INVALID_RESPONSE");
  }
  return activity;
}
