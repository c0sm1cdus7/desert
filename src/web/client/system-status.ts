import type { HumanSurface } from "../types.ts";
import type { AvailabilitySnapshot, BlockedReason } from "../../availability-types.ts";
import type { ViewStack } from "../../views/schema.ts";
import { freezeDeep } from "../../json.ts";
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";

// Every sentence this module shows a person is a key of the `systemStatus` namespace it owns (plan §14).
const bundle = Messages.bundle(rendererLocale);

const reasonLabels: Readonly<Record<BlockedReason, string>> = Object.freeze({
  unknown: bundle.text(m.systemStatus.notObserved), stale: bundle.text(m.systemStatus.expired), incompatible: bundle.text(m.systemStatus.incompatible),
  unreachable: bundle.text(m.systemStatus.unreachable), "session-required": bundle.text(m.systemStatus.sessionRequired),
  unavailable: bundle.text(m.systemStatus.unavailable), disposed: bundle.text(m.systemStatus.stopped),
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
    return fact(dependency, reason ? reasonLabels[reason] : bundle.text(m.systemStatus.available));
  });
  const operations = surface.journeys.map(journey => {
    const observation = availability.journeys[journey.id];
    const reason = !compatible ? "incompatible" : observation?.blockers[0]?.reason ?? "unknown";
    return fact(surface.language.journeys[journey.id] ?? journey.id,
      compatible && observation?.dependenciesReady ? bundle.text(m.systemStatus.dependenciesAvailable) : reasonLabels[reason]);
  });
  return freezeDeep([
    { kind: "stack", id: `${id}.dependencies`, title: bundle.text(m.systemStatus.dependencies),
      items: dependencies.length ? dependencies : [{ kind: "text", text: bundle.text(m.systemStatus.noDependencies) }] },
    { kind: "stack", id: `${id}.operations`, title: bundle.text(m.systemStatus.operations),
      items: operations.length ? operations : [{ kind: "text", text: bundle.text(m.systemStatus.noOperations) }] },
    { kind: "stack", id: `${id}.contract`, title: bundle.text(m.systemStatus.contract), items: [
      fact(bundle.text(m.systemStatus.product), surface.productId), fact(bundle.text(m.systemStatus.surface), surface.id),
      fact(bundle.text(m.systemStatus.protocol), surface.protocol), fact(bundle.text(m.systemStatus.catalogVersion), surface.catalog!.version),
      fact(bundle.text(m.systemStatus.digest), surface.contractDigest),
    ] },
  ]);
}
