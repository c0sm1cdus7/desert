import type { HumanSurface, RecordView, Prepared, Offer } from "../types.ts";
import type { AvailabilitySnapshot } from "../../availability-types.ts";
import { blockedSnapshot } from "./connection.ts";

export type HumanState = {
  view: "list" | "create" | "detail" | "review" | "recovery";
  creationOrigin: "list" | "detail";
  records: readonly RecordView[];
  loaded: boolean;
  detail: RecordView | null;
  selectedId: string | null;
  offers: Record<string, Offer>;
  draft: Record<string, string>;
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
};

export function humanState(surface: HumanSurface) {
  const primary = surface.journeys.find(journey => journey.id === surface.navigation.primaryAction);
  const draft = Object.fromEntries(primary?.kind === "mutation" ? primary.inputFields.map(name => [name, ""]) : []);
  let value: HumanState = { view: "list", creationOrigin: "list", records: [], loaded: false, detail: null, selectedId: null,
    offers: {}, draft, draftRevision: 0, touchedFields: [], prepared: null, preparedRevision: 0, mutationId: null,
    busy: false, pendingAction: null, uncertain: false, receiptMissing: false,
    notice: "", error: null, availability: blockedSnapshot(surface, "unknown") };
  const listeners = new Set<(state: HumanState) => void>();
  return {
    get: () => value,
    update(patch: Partial<HumanState>) { value = { ...value, ...patch }; for (const listener of listeners) listener(value); },
    subscribe(listener: (state: HumanState) => void) { listeners.add(listener); listener(value); return () => { listeners.delete(listener); }; },
  };
}
export type HumanStore = ReturnType<typeof humanState>;
