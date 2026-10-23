import type { HumanSurface, Mutation, ValidateInput, Receipt } from "../types.ts";
import { restoreCreationDraft, subjectActionAvailable, type HumanState, type HumanStore } from "./state.ts";
import { TransportError, acceptanceOutcomeUnknown, type ControllerTransport } from "./transport.ts";
import type { ModelScope } from "./model-scope.ts";
import { inspectMutationDraft } from "./draft-validation.ts";
import { isImageFileSelection, releaseDraftFiles, type DraftFileHost } from "../../interaction/image-input.ts";
import type { Facts } from "../../fact-values.ts";
import { requireMutationReceipt } from "./mutation-receipt.ts";

export function mutationFlow(surface: HumanSurface, store: HumanStore, transport: ControllerTransport,
  validate: ValidateInput, refresh: () => Promise<void>, scope: ModelScope, files?: DraftFileHost) {
  let activeOperation: object | null = null;
  let upload: AbortController | undefined;
  function ready(id: string) { return store.get().availability.journeys[id]?.dependenciesReady === true; }
  function failure(error: unknown) { store.update({ error: error instanceof TransportError ? error.code : "OPERATION_FAILED" }); }
  function startOperation(action: NonNullable<HumanState["pendingAction"]>) {
    const operation = activeOperation = {};
    store.update({ busy: true, pendingAction: action, receiptMissing: false, error: null, notice: "" });
    return operation;
  }
  function finishOperation(operation: object, patch: Partial<HumanState> = {}) {
    if (activeOperation !== operation) return false;
    activeOperation = null;
    store.update({ ...patch, busy: false, pendingAction: null });
    return true;
  }
  async function completed(receipt: Receipt, operation: object) {
    const current = store.get();
    const prepared = current.prepared, journey = surface.journeys.find(item => item.id === current.mutationId);
    requireMutationReceipt(prepared, journey, receipt);
    if (!prepared || journey?.kind !== "mutation") throw new TransportError("INVALID_RESPONSE");
    const wasCreate = !journey.subject;
    const wasEdit = current.editing?.journeyId === current.mutationId;
    const newerEdit = wasEdit && current.preparedRevision !== current.draftRevision;
    if ((wasCreate || wasEdit) && current.preparedRevision === current.draftRevision) releaseDraftFiles(current.draft, files);
    const finished = finishOperation(operation, { prepared: null, uncertain: false, receiptMissing: false,
      view: newerEdit ? "edit" : "detail", selectedId: receipt.object.id,
      detail: null, offers: {},
      notice: "Saved", ...(wasCreate && current.preparedRevision === current.draftRevision ? { draft: {}, touchedFields: [] } : {}),
      ...(wasEdit ? newerEdit ? { editing: { ...current.editing!, expectedVersion: receipt.object.version, facts: prepared.facts } }
        : restoreCreationDraft(current) : {}) });
    if (finished) await refresh();
  }
  async function invoke(journey: Mutation, subject?: string) {
    const current = store.get();
    if (scope.kind !== "read" || ![...scope.creations, ...scope.subjectActions].some(item => item.id === journey.id)) return;
    const editing = current.editing;
    if (editing && (current.view !== "edit" || journey.id !== editing.journeyId || subject && subject !== editing.subject)) return;
    const target = editing?.subject ?? subject;
    if ((journey.subject && !target) || (!journey.subject && target)) return;
    if (target && !subjectActionAvailable(surface, current, journey.id, target, undefined, scope)) return;
    const input = target && !editing ? {} : { ...current.draft };
    if (current.busy || current.uncertain || !ready(journey.id) || !inspectMutationDraft(surface, journey, input, validate).valid) return;
    const selected = Object.entries(input).flatMap(([inputField, value]) => {
      if (!isImageFileSelection(value)) return [];
      const file = files?.resolve(value.file.id);
      return [{ inputField, file }];
    });
    if (selected.some(item => !item.file) || selected.length && !transport.stageImage) {
      failure(new TransportError("IMAGE_UPLOAD_UNAVAILABLE")); return;
    }
    const operation = startOperation("invoke");
    const abort = upload = new AbortController();
    try {
      const run = await transport.call("begin", { journeyId: journey.id, ...(target ? { subject: target } : {}) });
      if (activeOperation !== operation || current.draftRevision !== store.get().draftRevision) return;
      const staged = Object.fromEntries(Object.entries(input).filter(([, value]) => !isImageFileSelection(value))) as Facts;
      for (const item of selected) {
        staged[item.inputField] = await transport.stageImage!({ runId: run.id, inputField: item.inputField, file: item.file! }, { signal: abort.signal });
        if (activeOperation !== operation || current.draftRevision !== store.get().draftRevision) return;
      }
      if (!validate(journey.commandId, staged)) throw new TransportError("INVALID_INPUT");
      const prepared = await transport.call("prepare", { runId: run.id, input: staged,
        ...(editing ? { options: { expectedVersion: editing.expectedVersion } } : {}) });
      if (activeOperation !== operation) return;
      if (prepared.runId !== run.id || prepared.journeyId !== journey.id) throw new TransportError("INVALID_RESPONSE");
      if (target && prepared.object.id !== target) throw new TransportError("INVALID_RESPONSE");
      if (editing && (prepared.object.id !== editing.subject || prepared.object.expectedVersion !== editing.expectedVersion)) {
        throw new TransportError("INVALID_RESPONSE");
      }
      if ((!target || editing) && current.draftRevision !== store.get().draftRevision) return;
      store.update({ prepared, mutationId: journey.id, preparedRevision: current.draftRevision });
      if (surface.commit[journey.id] !== "submit") store.update({ view: "review" });
      else if (surface.commit[journey.id] === "submit") await acceptPrepared(operation);
      else throw new TransportError("INVALID_COMMIT_MODE");
    } catch (error) { if (activeOperation === operation) failure(error); }
    finally { if (upload === abort) upload = undefined; finishOperation(operation); }
  }
  async function acceptPrepared(operation: object) {
    const current = store.get();
    if (!current.prepared || !current.mutationId) throw new TransportError("INVALID_OPERATION");
    try {
      if (!ready(current.mutationId)) throw new TransportError("CONTROLLER_UNAVAILABLE");
      store.update({ pendingAction: "accept", receiptMissing: false });
      const receipt = await transport.call("accept", { intentId: current.prepared.id,
        confirmationDigest: current.prepared.confirmationDigest });
      await completed(receipt, operation);
    } catch (error) {
      if (activeOperation !== operation) return;
      const uncertain = current.uncertain || acceptanceOutcomeUnknown(error);
      store.update({ uncertain, ...(uncertain ? { view: "recovery" } : {}) });
      failure(error);
    }
  }
  async function accept() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    if (current.view !== "review" && current.view !== "recovery") return;
    const operation = startOperation("accept");
    try { await acceptPrepared(operation); }
    finally { finishOperation(operation); }
  }
  async function recover() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    const operation = startOperation("recover");
    try {
      const receipt = await transport.call("receipt", { intentId: current.prepared.id });
      if (receipt) await completed(receipt, operation);
      else store.update({ receiptMissing: true });
    } catch (error) { if (activeOperation === operation) failure(error); }
    finally { finishOperation(operation); }
  }
  return { invoke, accept, recover, cancelPending() { activeOperation = null; upload?.abort(); upload = undefined; } };
}
