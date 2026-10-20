import type { HumanSurface, ValidateInput } from "../types.ts";
import type { HumanState } from "./state.ts";
import { readPresentation, mutationPresentation } from "./presentation.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { fieldFeedback } from "./field-feedback.ts";
import { presentFacts, presentTitle } from "../../interaction/fact-presentation.ts";

export function presentFrame(surface: HumanSurface, state: HumanState, validate: ValidateInput) {
  const ready = (id: string) => state.availability.journeys[id]?.dependenciesReady === true;
  if (state.view === "create") {
    const primary = mutationPresentation(surface, surface.navigation.primaryAction);
    const label = surface.commit[primary.id] === "review" ? "Review" : surface.language.journeys[primary.id]!;
    const validation = validate.inspect?.(primary.commandId, state.draft) ??
      { valid: validate(primary.commandId, state.draft), issues: [] };
    return formFrame(surface, primary, state.draft, { secondary: toolbarAction({ kind: "back" }, "Back", "back", !state.busy), primary: {
      ...toolbarAction({ kind: "journey", journey: primary.id }, label, surface.commit[primary.id] === "review" ? "review" : "save", ready(primary.id) && validation.valid),
      ...(state.busy ? { state: "pending" as const } : {}),
    }}, fieldFeedback(validation, state.touchedFields));
  }
  if ((state.view === "review" || state.view === "recovery") && state.prepared && state.mutationId) {
    const mutation = mutationPresentation(surface, state.mutationId);
    const previous = state.detail?.id === state.prepared.object.id && state.detail.version === state.prepared.object.expectedVersion &&
      readPresentation(surface).subject === mutation.object ? state.detail.facts : undefined;
    return reviewFrame(surface, mutation, state.prepared.facts, state.uncertain, state.busy, ready(mutation.id),
      { pendingAction: state.pendingAction, receiptMissing: state.receiptMissing, ...(previous ? { previous } : {}) });
  }
  const read = readPresentation(surface);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "context",
    top: { title: state.detail ? presentTitle(state.detail.facts[read.collection[0]!]) : surface.language.journeys[read.id]! },
    content: state.detail ? { kind: "context", details: presentFacts(surface, read.subject,
      read.fields.filter(field => field !== read.collection[0]), state.detail.facts),
      actions: surface.navigation.subjectActions.map(id => ({ destination: id, label: surface.language.journeys[id]!,
        available: !state.busy && ready(id) && state.offers[id]?.eligible === true })) }
      : { kind: "message", text: ready(read.id) ? "Loading…" : "Waiting for the local controller." },
    bottom: {},
  });
}
