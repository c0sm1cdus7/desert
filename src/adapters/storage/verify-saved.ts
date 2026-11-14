import type { FoldWarning } from "../../journal/snapshot-format.ts";
// Validate saved house folds before their tail can use any cached authority.
import type { ProjectionGroup } from "../../journal/projections.ts";
import type { Event, Foreign } from "../../journal/events.ts";
import type { SqliteJournal } from "./journal-store.ts";
export function verifiedAfter<P extends Foreign>(
  projections: ProjectionGroup<Event<P>>,
  journal: SqliteJournal<P>,
  verify: boolean,
): number {
  projections.after();
  if (verify)
    projections.verify(visit =>
      journal.replay(null, (_, event) => {
        visit(event);
        return null;
      }),
    );
  return projections.after();
}

export function restorationOf(
  projections: { caches: ReadonlyMap<string, { readonly reused: boolean }> },
  warnings: readonly FoldWarning[],
) {
  return { reused: [...projections.caches.values()].every(cache => cache.reused), warnings: [...warnings] };
}
