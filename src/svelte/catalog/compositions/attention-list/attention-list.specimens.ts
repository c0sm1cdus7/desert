// One witness of AttentionList: a loaded snapshot with one item to resume and one that needs a compatible version.
import type { CatalogSpecimen } from "../../types.d.ts";

export const AttentionListSpecimens = [
  { state: "default", props: { resume: () => {}, state: { loaded: true, error: null, objectSignals: {}, items: [
    { id: "draft", journey: "note", title: "Finish your note", description: "Continue where you left off.", available: true,
      signals: [{ version: "desert.attention/1", recipient: "specimen", reason: "activity.resume", resolution: "producer",
        source: { kind: "activity", id: "10000000-0000-4000-8000-000000000001", revision: 1, journey: "note" },
        target: { kind: "activity", id: "10000000-0000-4000-8000-000000000001" } }] },
    { id: "unavailable", journey: "note", title: "Saved activity", description: "This activity needs a compatible version.", available: false,
      signals: [{ version: "desert.attention/1", recipient: "specimen", reason: "activity.compatibility", resolution: "producer",
        source: { kind: "activity", id: "10000000-0000-4000-8000-000000000002", revision: 1, journey: "note" },
        target: { kind: "activity", id: "10000000-0000-4000-8000-000000000002" } }] },
  ] } } },
] as const satisfies readonly CatalogSpecimen<"attention-list">[];
