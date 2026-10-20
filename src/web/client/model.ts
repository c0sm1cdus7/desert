import type { HumanSurface, Mutation, ValidateInput, Offer } from "../types.ts";
import { humanState } from "./state.ts";
import { webTransport } from "./transport.ts";
import { observeWebConnection } from "./connection.ts";
import { mutationFlow } from "./mutations.ts";

export function humanProduct(surface: HumanSurface, validate: ValidateInput, options: { reading?: boolean } = {}) {
  const store = humanState(surface);
  const transport = webTransport(surface.contractDigest);
  let readEpoch = 0;
  let stopped = false;
  let reading = options.reading ?? true;
  let stopConnection: (() => void) | undefined;
  const primary = surface.journeys.find(journey => journey.id === surface.navigation.primaryAction) as Mutation;
  const ready = (id: string) => store.get().availability.journeys[id]?.dependenciesReady === true;

  async function refresh() {
    const epoch = ++readEpoch;
    if (!reading || !ready(surface.navigation.entry)) return;
    const selectedId = store.get().selectedId;
    try {
      const run = await transport.call("begin", { journeyId: surface.navigation.entry });
      const records = await transport.call("read", { runId: run.id });
      if (epoch !== readEpoch) return;
      store.update({ records, loaded: true });
      if (selectedId) {
        const detailRun = await transport.call("begin", { journeyId: surface.navigation.entry, subject: selectedId });
        const [detail] = await transport.call("read", { runId: detailRun.id });
        const offers: Record<string, Offer> = {};
        for (const journeyId of surface.navigation.subjectActions) {
          if (ready(journeyId)) offers[journeyId] = await transport.call("offer", { journeyId, subject: selectedId });
        }
        if (epoch === readEpoch) store.update({ detail: detail ?? null, offers });
      }
    } catch { /* Retain the last view; the independent observer reports dependency failures. */ }
  }
  const mutations = mutationFlow(surface, store, transport, validate, refresh);
  return {
    snapshot: store.get, subscribe: store.subscribe, ...mutations,
    async start(invitation?: string) {
      if (stopped) return;
      if (invitation) {
        try { await transport.connect(invitation); }
        catch { store.update({ error: "BROWSER_SESSION_REQUIRED" }); }
      }
      if (stopped) return;
      stopConnection = observeWebConnection(surface, transport, snapshot => {
        const wasReady = ready(surface.navigation.entry);
        store.update({ availability: snapshot });
        const isReady = ready(surface.navigation.entry);
        if (!isReady) readEpoch++;
        if (!wasReady && isReady) void refresh();
      });
    },
    stop() { stopped = true; readEpoch++; stopConnection?.(); },
    setReading(enabled: boolean) {
      if (reading === enabled) return;
      reading = enabled;
      readEpoch++;
      if (enabled) void refresh();
    },
    create() {
      if (store.get().busy || store.get().uncertain || !ready(primary.id)) return;
      const current = store.get();
      const draft = Object.fromEntries(primary.inputFields.map(name => [name, current.draft[name] ?? ""]));
      store.update({ view: "create", creationOrigin: current.view === "detail" ? "detail" : "list",
        draft, prepared: null, notice: "", error: null });
    },
    edit(field: string, value: string) {
      if (!primary.inputFields.includes(field)) return;
      const current = store.get();
      // A departing control can blur after completion; it no longer owns the draft.
      if (current.view !== "create" && current.view !== "list") return;
      store.update({ draft: { ...current.draft, [field]: value },
        draftRevision: current.draftRevision + (current.draft[field] === value ? 0 : 1),
        touchedFields: current.touchedFields.includes(field) ? current.touchedFields : [...current.touchedFields, field] });
    },
    async select(id: string) {
      if (store.get().busy || store.get().uncertain || !ready(surface.navigation.entry)) return;
      store.update({ view: "detail", selectedId: id, detail: null, offers: {}, prepared: null, notice: "" });
      await refresh();
    },
    back() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      const view = current.view === "review" ? (current.mutationId === primary.id ? "create" : "detail")
        : current.view === "create" ? current.creationOrigin : "list";
      store.update({ view, prepared: null, notice: "" });
    },
    dismissError() { store.update({ error: null }); },
    close() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      store.update({ view: current.view === "create" ? current.creationOrigin : "list", prepared: null, notice: "" });
    },
    primary,
  };
}
