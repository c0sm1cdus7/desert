import type { HumanSurface } from "../types.ts";
import type { AvailabilitySnapshot, BlockedReason } from "../../availability-types.ts";
import type { ViewStack } from "../../views/schema.ts";
import { freezeDeep } from "../../json.ts";

const reasonLabels: Readonly<Record<BlockedReason, string>> = Object.freeze({
  unknown: "Not yet observed", stale: "Evidence expired", incompatible: "Incompatible controller",
  unreachable: "Controller unreachable", "session-required": "Identity session required",
  unavailable: "Unavailable", disposed: "Observation stopped",
});
const fact = (label: string, value: string) => ({ kind: "fact" as const, label, value });

/** Inventory comes from the compiled exposure; availability comes only from current controller evidence. */
export function systemStatusContent(id: string, surface: HumanSurface, availability: AvailabilitySnapshot): readonly ViewStack[] {
  const compatible = availability.contractDigest === surface.contractDigest;
  const dependencyIds = [...new Set(surface.journeys.flatMap(journey => journey.dependencies))];
  const dependencies = dependencyIds.map(dependency => {
    const consumers = surface.journeys.filter(journey => journey.dependencies.includes(dependency));
    const observations = consumers.map(journey => availability.journeys[journey.id]);
    const blocker = observations.flatMap(observation => observation?.blockers ?? []).find(item => item.dependency === dependency);
    const reason = !compatible ? "incompatible" : observations.some(observation => !observation) ? "unknown" : blocker?.reason;
    return fact(dependency, reason ? reasonLabels[reason] : "Available");
  });
  const operations = surface.journeys.map(journey => {
    const observation = availability.journeys[journey.id];
    const reason = !compatible ? "incompatible" : observation?.blockers[0]?.reason ?? "unknown";
    return fact(surface.language.journeys[journey.id] ?? journey.id,
      compatible && observation?.dependenciesReady ? "Dependencies available" : reasonLabels[reason]);
  });
  return freezeDeep([
    { kind: "stack", id: `${id}.dependencies`, title: "Execution dependencies",
      items: dependencies.length ? dependencies : [{ kind: "text", text: "No execution dependencies are exposed." }] },
    { kind: "stack", id: `${id}.operations`, title: "Exposed operations",
      items: operations.length ? operations : [{ kind: "text", text: "No operations are exposed to this surface." }] },
    { kind: "stack", id: `${id}.contract`, title: "Installed contract", items: [
      fact("Product", surface.productId), fact("Surface", surface.id),
      fact("Interaction protocol", surface.protocol), fact("Visual catalog version", surface.catalog!.version),
      fact("Contract digest", surface.contractDigest),
    ] },
  ]);
}
