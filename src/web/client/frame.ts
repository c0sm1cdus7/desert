import type { HumanSurface, ValidateInput } from "../types.ts";
import { subjectActionAvailable, type HumanState } from "./state.ts";
import { mutationPresentation } from "./presentation.ts";
import { referenceScopeSurface, requireReadScope, type ModelScope } from "./model-scope.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { fieldFeedback } from "./field-feedback.ts";
import { presentFacts, presentTitle } from "../../interaction/fact-presentation.ts";
import { inspectMutationDraft } from "./draft-validation.ts";
import { rendererLocale } from "../../messages/renderer-locale.ts";
import { Messages, m } from "../../messages/keys.ts";

// Every sentence this module shows a person is a key of the `frame` namespace it owns (plan §14).
const bundle = Messages.bundle(rendererLocale);

export function presentFrame(surface: HumanSurface, state: HumanState, validate: ValidateInput,
  scope: ModelScope) {
  surface=referenceScopeSurface(surface,scope);
  const ready = (id: string) => state.availability.journeys[id]?.dependenciesReady === true;
  if (state.view === "create" || state.view === "edit") {
    if (state.view === "edit" && !state.editing) throw new Error("EDIT_CONTEXT_REQUIRED");
    const id = state.editing?.journeyId ?? state.creationJourneyId;
    if (!id) throw new Error("FORM_JOURNEY_REQUIRED");
    const primary = mutationPresentation(surface, id);
    const label = surface.commit[primary.id] === "review" ? bundle.text(m.frame.review) : surface.language.journeys[primary.id]!;
    const validation = inspectMutationDraft(surface, primary, state.draft, validate);
    return formFrame(surface, primary, state.draft, { secondary: toolbarAction({ kind: "back" }, bundle.text(m.frame.back), "back", !state.busy), primary: {
      ...toolbarAction({ kind: "journey", journey: primary.id }, label, surface.commit[primary.id] === "review" ? "review" : "save",
        ready(primary.id) && validation.valid && (!state.editing || subjectActionAvailable(surface, state, primary.id, state.editing.subject, undefined, scope))),
      ...(state.busy ? { state: "pending" as const } : {}),
    }}, fieldFeedback(validation, state.touchedFields,
      primary.inputFields.filter(field => surface.fieldKinds?.[`${primary.object}.${field}`] === "labels")), state.references,state.mediaReferences);
  }
  if ((state.view === "review" || state.view === "recovery") && state.prepared && state.mutationId) {
    const mutation = mutationPresentation(surface, state.mutationId);
    const previous = state.editing?.journeyId === mutation.id && state.editing.expectedVersion === state.prepared.object.expectedVersion
      ? state.editing.facts : state.detail?.id === state.prepared.object.id && state.detail.version === state.prepared.object.expectedVersion &&
      requireReadScope(scope).read.subject === mutation.object ? state.detail.facts : undefined;
    return reviewFrame(surface, mutation, state.prepared.facts,
      state.uncertain ? { kind: "recovery", method: "same-confirmation" } : { kind: "review" }, state.busy, ready(mutation.id),
      { pendingAction: state.pendingAction, receiptMissing: state.receiptMissing, ...(previous ? { previous } : {}) });
  }
  const { read, subjectActions } = requireReadScope(scope);
  const identity = state.detail?.facts[read.collection[0]!];
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "context",
    top: { title: state.detail ? typeof identity === "object" ? bundle.text(m.frame.media) : presentTitle(identity) : surface.language.journeys[read.id]! },
    content: state.detail ? { kind: "context", details: presentFacts(surface, read.subject,
      read.fields.filter(field => field !== read.collection[0]), state.detail.facts, state.references),
      actions: subjectActions.map(({ id }) => ({ destination: id, label: surface.language.journeys[id]!,
        available: subjectActionAvailable(surface, state, id, undefined, undefined, scope) })) }
      : { kind: "message", text: ready(read.id) ? bundle.text(m.frame.loading) : bundle.text(m.frame.waiting) },
    bottom: {},
  });
}
