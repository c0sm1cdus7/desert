import type { HumanSurface, RecordView, Prepared, Offer } from "../types.ts";
import type { AvailabilitySnapshot } from "../../availability-types.ts";
import { blockedSnapshot } from "./connection.ts";
import type { ModelScope } from "./model-scope.ts";
import type { Draft } from "../../interaction/draft.ts";
import { emptyInputDraft } from "./input-draft.ts";
import type { ReferenceState,MediaReferenceState } from '../../interaction/labels-control.ts';

type DraftSnapshot = { draft: Draft; draftRevision: number; touchedFields: readonly string[] };
export type EditingState = {
  journeyId: string; subject: string; expectedVersion: number; facts: RecordView["facts"];
  creationDraft: DraftSnapshot;
};
export type HumanState = {
  references?:Readonly<Record<string,ReferenceState>>;
  mediaReferences?:Readonly<Record<string,MediaReferenceState>>;
  view: "list" | "create" | "edit" | "detail" | "review" | "recovery";
  creationOrigin: "list" | "detail";
  creationJourneyId: string | null;
  records: readonly RecordView[];
  loaded: boolean;
  detail: RecordView | null;
  selectedId: string | null;
  offers: Record<string, Offer>;
  draft: Draft;
  draftRevision: number;
  touchedFields: readonly string[];
  prepared: Prepared | null;
  preparedRevision: number;
  mutationId: string | null;
  busy: boolean;
  pendingAction: "invoke" | "accept" | "recover" | null;
  uncertain: boolean;
  receiptMissing: boolean;
  notice: string;
  error: string | null;
  availability: AvailabilitySnapshot;
  editing: EditingState | null;
};

/** Closing an object editor must not overwrite an unfinished creation draft. */
export function restoreCreationDraft(state: HumanState): Partial<HumanState> {
  return state.editing ? { ...state.editing.creationDraft, editing: null } : {};
}

/** One readiness projection for subject toolbars, editor entry and invocation. */
export function subjectActionAvailable(surface: HumanSurface, state: HumanState, journeyId: string,
  subject = state.detail?.id, expectedVersion = state.detail?.id === subject ? state.detail?.version : undefined,
  scope: ModelScope): boolean {
  const journey = surface.journeys.find(item => item.id === journeyId), offer = state.offers[journeyId];
  return !state.busy && !state.uncertain && journey?.kind === "mutation" && Boolean(journey.subject) && Boolean(subject) &&
    scope.kind === "read" && scope.subjectActions.some(item => item.id === journeyId) && state.availability.journeys[journeyId]?.dependenciesReady === true &&
    offer?.eligible === true && offer.journeyId === journeyId && offer.subject === subject &&
    (expectedVersion === undefined || offer.version === expectedVersion);
}

export function humanState(surface: HumanSurface, scope: ModelScope) {
  const primary = scope.kind === "read" ? scope.primaryCreation : undefined;
  const draft = primary ? emptyInputDraft(surface, primary) : {};
  let value: HumanState = { view: "list", creationOrigin: "list", creationJourneyId: primary?.id ?? null,
    records: [], loaded: false, detail: null, selectedId: null,
    offers: {}, draft, draftRevision: 0, touchedFields: [], prepared: null, preparedRevision: 0, mutationId: null,
    busy: false, pendingAction: null, uncertain: false, receiptMissing: false,
    notice: "", error: null, availability: blockedSnapshot(surface, "unknown"), editing: null };
  const listeners = new Set<(state: HumanState) => void>();
  const initial = value;
  let disposed = false;
  return {
    get: () => value,
    update(patch: Partial<HumanState>) { if (disposed) return; value = { ...value, ...patch }; for (const listener of listeners) listener(value); },
    dispose() { disposed = true; value = initial; listeners.clear(); },
    subscribe(listener: (state: HumanState) => void) { listeners.add(listener); listener(value); return () => { listeners.delete(listener); }; },
  };
}
export type HumanStore = ReturnType<typeof humanState>;
