import { Check } from "@sinclair/typebox/value";
import { ViewJourneySchema, ViewDestinationSchema, type ViewJourney, type ViewDestination } from "../views/program-schema.ts";
import { viewIndex } from "../views/view-index.ts";
import type { OwnedDefinitions } from "./types.ts";
import { ownershipRegistry } from "./ownership.ts";

export function resolvePresentation(owner: OwnedDefinitions, caller: string, ownership: ReturnType<typeof ownershipRegistry>) {
  const resolve = ownership.resolve;
  const journeys = (owner.journeys ?? []).flatMap(({ presentation }) => {
    if (!presentation) return [];
    const resolved = {
      ...presentation, ...("view" in presentation ? { view: resolve(presentation.view, "view", caller) } : {}),
      ...(presentation.kind === "read" ? { detailView: resolve(presentation.detailView, "view", caller) } : {}),
      ...(presentation.kind === "read" && presentation.related ? { related: presentation.related.map(binding => ({
        ...binding, read: resolve(binding.read, "journey", caller),
        ...(binding.membership ? { membership: { ...binding.membership, update: ownership.resolveExecution(binding.membership.update, caller) } } : {}) })) } : {}),
      ...("source" in presentation ? { source: resolve(presentation.source, "journey", caller) } : {}),
      ...(presentation.kind === "create" && presentation.initializeFrom ? { initializeFrom: { ...presentation.initializeFrom,
        source: resolve(presentation.initializeFrom.source, "journey", caller) } } : {}),
      ...(presentation.kind === "presentation" && presentation.collections ? { collections: presentation.collections.map(binding => ({
        ...binding, read: resolve(binding.read, "journey", caller),
        ...(binding.preview ? { preview: { ...binding.preview, read: resolve(binding.preview.read, "journey", caller) } } : {}) })) } : {}),
      ...(presentation.kind === "activity" ? { activity: { ...presentation.activity,
        journey: resolve(presentation.activity.journey, "journey", caller),
        review: resolve(presentation.activity.review, "view", caller),
        steps: presentation.activity.steps.map(step => ({ ...step, view: resolve(step.view, "view", caller) })) } } : {}),
      outputs: presentation.outputs.map(output => ({
        ...output, view: resolve(output.view, "view", caller), action: output.action.kind === "journey"
          ? { ...output.action, journey: resolve(output.action.journey, "journey", caller) } : output.action,
      })),
    };
    if (!Check(ViewJourneySchema, resolved)) throw new Error("INVALID_MODULE_JOURNEY");
    return [resolved as ViewJourney];
  });
  const destinations = (owner.destinations ?? []).map(destination => {
    const resolved = { ...destination, entryJourney: resolve(destination.entryJourney, "journey", caller) };
    if (!Check(ViewDestinationSchema, resolved)) throw new Error("INVALID_MODULE_DESTINATION");
    return resolved as ViewDestination;
  });
  for (const view of owner.views ?? []) for (const dock of [view.leftDock, view.rightDock]) {
    if (dock) resolve(dock.view, "view", caller);
  }
  if (owner.views?.length) viewIndex(owner.views);
  return { journeys, destinations };
}
