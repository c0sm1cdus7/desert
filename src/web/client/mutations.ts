import type { HumanSurface, Mutation, ValidateInput, Receipt } from "../types.ts";
import type { HumanStore } from "./state.ts";
import { TransportError, type Transport } from "./transport.ts";

export function mutationFlow(surface: HumanSurface, store: HumanStore, transport: Transport,
  validate: ValidateInput, refresh: () => Promise<void>) {
  function ready(id: string) { return store.get().availability.journeys[id]?.dependenciesReady === true; }
  function failure(error: unknown) { store.update({ error: error instanceof TransportError ? error.code : "OPERATION_FAILED" }); }
  async function completed(receipt: Receipt) {
    const current = store.get();
    if (!current.prepared || receipt.id !== current.prepared.id || receipt.object.id !== current.prepared.object.id) {
      throw new TransportError("INVALID_RESPONSE");
    }
    const wasCreate = current.mutationId === surface.navigation.primaryAction;
    store.update({ prepared: null, uncertain: false, receiptMissing: false, view: "detail", selectedId: receipt.object.id,
      detail: null, offers: {},
      notice: "Saved", ...(wasCreate && current.preparedRevision === current.draftRevision ? { draft: {}, touchedFields: [] } : {}) });
    await refresh();
  }
  async function invoke(journey: Mutation, subject?: string) {
    const current = store.get();
    const input = subject ? {} : { ...current.draft };
    if (current.busy || current.uncertain || !ready(journey.id) || !validate(journey.commandId, input)) return;
    store.update({ busy: true, pendingAction: "invoke", receiptMissing: false, error: null, notice: "" });
    try {
      const run = await transport.call("begin", { journeyId: journey.id, ...(subject ? { subject } : {}) });
      const prepared = await transport.call("prepare", { runId: run.id, input });
      if (prepared.runId !== run.id || prepared.journeyId !== journey.id) throw new TransportError("INVALID_RESPONSE");
      if (!subject && current.draftRevision !== store.get().draftRevision) return;
      store.update({ prepared, mutationId: journey.id, preparedRevision: current.draftRevision });
      if (surface.commit[journey.id] === "review") store.update({ view: "review" });
      else if (surface.commit[journey.id] === "submit") await acceptPrepared();
      else throw new TransportError("INVALID_COMMIT_MODE");
    } catch (error) { failure(error); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  async function acceptPrepared() {
    const current = store.get();
    if (!current.prepared || !current.mutationId) throw new TransportError("INVALID_OPERATION");
    try {
      if (!ready(current.mutationId)) throw new TransportError("CONTROLLER_UNAVAILABLE");
      store.update({ pendingAction: "accept", receiptMissing: false });
      const receipt = await transport.call("accept", { intentId: current.prepared.id,
        confirmationDigest: current.prepared.confirmationDigest });
      await completed(receipt);
    } catch (error) {
      const code = error instanceof TransportError ? error.code : "OPERATION_FAILED";
      const uncertain = current.uncertain || ["CONNECTION_LOST", "COMMIT_UNCERTAIN", "CONTROLLER_UNAVAILABLE", "INVALID_RESPONSE"].includes(code);
      store.update({ uncertain, ...(uncertain ? { view: "recovery" } : {}) });
      failure(error);
    }
  }
  async function accept() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    if (current.view !== "review" && current.view !== "recovery") return;
    store.update({ busy: true, pendingAction: "accept", receiptMissing: false, error: null, notice: "" });
    try { await acceptPrepared(); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  async function recover() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    store.update({ busy: true, pendingAction: "recover", receiptMissing: false, error: null, notice: "" });
    try {
      const receipt = await transport.call("receipt", { intentId: current.prepared.id });
      if (receipt) await completed(receipt);
      else store.update({ receiptMissing: true });
    } catch (error) { failure(error); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  return { invoke, accept, recover };
}
