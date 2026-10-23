import type { Offer } from "../types.ts";
import type { ModelScope } from "./model-scope.ts";
import type { HumanState, HumanStore } from "./state.ts";
import type { ControllerTransport } from "./transport.ts";
import { readRefresh } from "./read-refresh.ts";
import { readRequest, readRuns } from "./read-runs.ts";
import { samePublishedData } from "./published-data.ts";

export function modelReads(scope: ModelScope, store: HumanStore, transport: ControllerTransport,
  active: () => boolean, generation: () => number) {
  const read = scope.kind === "read" ? scope.read : undefined;
  const runs = read ? readRuns(transport, read.id) : undefined;
  const ready = (id: string) => store.get().availability.journeys[id]?.dependenciesReady === true;
  const selected = () => store.get().view === "list" ? null : store.get().selectedId;
  const eligible = () => active() && Boolean(read && ready(read.id)) && !store.get().busy && !store.get().uncertain;
  async function readLatest(signal: AbortSignal) {
    if (!read || !runs || scope.kind !== "read") return;
    const epoch = generation(), selectedId = selected();
    const current = () => !signal.aborted && eligible() && epoch === generation() && selected() === selectedId;
    for (let attempt = 0; attempt < 2 && current(); attempt++) {
      try {
        const records = await runs.read(undefined, signal);
        if (!current()) return;
        let detail = null;
        const offers: Record<string, Offer> = {};
        if (selectedId) {
          [detail = null] = await runs.read(selectedId, signal);
          for (const { id: journeyId } of detail ? scope.subjectActions : []) {
            if (!current()) return;
            if (ready(journeyId)) offers[journeyId] = await readRequest(transport, signal, "offer", { journeyId, subject: selectedId });
          }
        }
        if (current()) {
          const before = store.get(), patch: Partial<HumanState> = {};
          if (!before.loaded) patch.loaded = true;
          if (!samePublishedData(before.records, records)) patch.records = records;
          if (selectedId) {
            if (!samePublishedData(before.detail, detail)) patch.detail = detail;
            if (!samePublishedData(before.offers, offers)) patch.offers = offers;
            if (!detail && before.view === "detail") { patch.view = "list"; patch.selectedId = null; }
          }
          if (before.error === "READ_REFRESH_FAILED") patch.error = null;
          if (Object.keys(patch).length) store.update(patch);
        }
        return;
      } catch {
        if (!current()) return;
        runs.clear();
        if (attempt === 1) store.update({ error: store.get().error ?? "READ_REFRESH_FAILED" });
      }
    }
  }
  const refresh = readRefresh(readLatest, eligible);
  return { request: refresh.request, observe: refresh.observe,
    invalidate() { refresh.invalidate(); runs?.clear(); },
    stop() { refresh.stop(); runs?.clear(); } };
}
