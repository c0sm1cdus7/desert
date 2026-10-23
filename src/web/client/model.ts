import type { HumanSurface, Mutation, ValidateInput } from "../types.ts";
import { humanState, restoreCreationDraft, subjectActionAvailable, type HumanState } from "./state.ts";
import { webTransport, type ControllerTransport, type Transport } from "./transport.ts";
import { observeWebConnection, type ConnectionObserver } from "./connection.ts";
import { mutationFlow } from "./mutations.ts";
import { referenceScopeSurface, type ModelScope } from "./model-scope.ts";
import type { ViewJourney } from "../../views/program-schema.ts";
import { releaseDraftFiles, type DraftFileHost } from "../../interaction/image-input.ts";
import type { AssetReference } from "../../assets/types.ts";
import { TransportError } from "./transport.ts";
import { emptyInputDraft } from "./input-draft.ts";
import { modelInputs } from "./model-inputs.ts";
import { canInitializeInput, isInitialInputValue } from "../../interaction/input-initialization.ts";
import { modelReads } from "./model-reads.ts";
import { samePublishedData } from "./published-data.ts";
import { privateImageAccess, type PrivateImageContext } from "./private-images.ts";
import { modelReferences } from './model-references.ts';
import { modelMediaReferences } from './model-media-references.ts';

export type InputInitialization = Extract<ViewJourney, { kind: "update" }>["initialize"];
export function humanProduct(surface: HumanSurface, validate: ValidateInput,
  options: { reading?: boolean; initialize?: Readonly<Record<string, InputInitialization>>; scope: ModelScope;
    transport?: ControllerTransport; files?: DraftFileHost; observeConnection?: ConnectionObserver }) {
  const scope = options.scope;
  surface=referenceScopeSurface(surface,scope);
  const read = scope.kind === "read" ? scope.read : undefined;
  const store = humanState(surface, scope);
  const transport: ControllerTransport & Partial<Pick<Transport, "connect">> = options.transport ?? webTransport(surface.contractDigest);
  let readEpoch = 0;
  let stopped = false;
  let starting: Promise<void> | undefined;
  let reading = options.reading ?? true;
  let stopConnection: (() => void) | undefined;
  const primary = () => scope.kind === "read" ? scope.creations.find(journey => journey.id === store.get().creationJourneyId) : undefined;
  const ready = (id: string) => store.get().availability.journeys[id]?.dependenciesReady === true;
  const reads = modelReads(scope, store, transport, () => !stopped && reading, () => readEpoch);
  const images = privateImageAccess(imageContext);
  const references=modelReferences(surface,store,transport,()=>!stopped&&reading,validate,read?.subject);
  const mediaReferences=modelMediaReferences(surface,store,transport,()=>!stopped&&reading,read?.subject);
  store.subscribe(() => images.refresh());

  function imageContext(asset: AssetReference): PrivateImageContext | undefined {
    const choice=mediaReferences.imageContext(asset);if(choice)return choice;
    const current = store.get(), epoch = readEpoch;
    const records = current.view === "detail" && current.detail?.id === current.selectedId ? [current.detail, ...current.records.filter(record => record.id !== current.detail!.id)]
      : current.view === "list" ? current.records : [];
    const publishesImage = (record: (typeof records)[number]) => read?.fields.some(field => {
      const value = record.facts[field];
      return typeof value === "object" && value !== null && "reference" in value && value.reference === asset.reference;
    }) === true;
    const record = records.find(publishesImage);
    if (!read || !record || stopped || !reading || !ready(read.id) || !transport.image) return undefined;
    const valid = () => {
      const next = store.get();
      return !stopped && reading && readEpoch === epoch && ready(read.id)
        && next.view === current.view && next.selectedId === current.selectedId
        && (next.detail?.id === record.id ? next.detail.version === record.version && publishesImage(next.detail)
          : next.records.some(item => item.id === record.id && item.version === record.version && publishesImage(item)));
    };
    return { valid, async read(variant, signal) {
      const run = await transport.call("begin", { journeyId: read.id, subject: record.id });
      if (!valid() || signal.aborted) throw new TransportError("IMAGE_READ_EXPIRED");
      return transport.image!({ runId: run.id, reference: asset.reference, variant }, { signal });
    } };
  }

  function invalidateReading() { readEpoch++; reads.invalidate(); images.refresh(); }
  function refresh() { invalidateReading(); return Promise.all([reads.request(),references.refresh(),mediaReferences.refresh()]).then(()=>{}); }
  function leaveSelection(view: HumanState["view"]): Partial<HumanState> {
    if (view !== "list") return {};
    invalidateReading();
    return { selectedId: null, detail: null, offers: {} };
  }
  const mutations = mutationFlow(surface, store, transport, validate, refresh, scope, options.files);
  function stop() { stopped = true; readEpoch++; reads.stop(); references.stop(); mediaReferences.stop(); images.close(); stopConnection?.(); mutations.cancelPending(); }
  return {
    snapshot: store.get, subscribe: store.subscribe, refresh, ...mutations, ...modelInputs(surface, store, options.files),
    referenceEvent(event:Parameters<typeof references.event>[0]){return event.kind==='reference.refresh'&&surface.fieldMediaReferences?.[`${read?.subject}.${event.control}`]
      ?mediaReferences.event(event.control):references.event(event);},
    start(invitation?: string) {
      if (stopped) return Promise.resolve();
      return starting ??= (async () => {
        if (invitation) {
          try {
            if (!transport.connect) throw new Error("BROWSER_SESSION_REQUIRED");
            await transport.connect(invitation);
          }
          catch { store.update({ error: "BROWSER_SESSION_REQUIRED" }); }
        }
        if (stopped) return;
        const observe = options.observeConnection ?? (publish => observeWebConnection(surface, transport, publish));
        stopConnection = observe(snapshot => {
          const wasReady = read ? ready(read.id) : false;
          if (!samePublishedData(store.get().availability, snapshot)) store.update({ availability: snapshot });
          const isReady = read ? ready(read.id) : false;
          if (wasReady && !isReady) { invalidateReading(); references.invalidate(); mediaReferences.invalidate(); }
          if (!wasReady && isReady) void refresh(); else if (isReady) reads.observe();
        });
      })();
    },
    stop,
    dispose() { stop(); releaseDraftFiles(store.get().draft, options.files);
      if (store.get().editing) releaseDraftFiles(store.get().editing!.creationDraft.draft, options.files); store.dispose(); },
    images, image: images.read,
    setReading(enabled: boolean) {
      if (reading === enabled) return;
      reading = enabled;
      invalidateReading();
      if (enabled) { void reads.request(); void references.refresh(); void mediaReferences.refresh(); }
    },
    create(journeyId = scope.kind === "read" ? scope.primaryCreation?.id : undefined) {
      const mutation = scope.kind === "read" ? scope.creations.find(item => item.id === journeyId) : undefined;
      if (!mutation || !read ||
        store.get().busy || store.get().uncertain || store.get().editing || !ready(mutation.id)) return;
      const current = store.get();
      const sameDraft = current.creationJourneyId === journeyId;
      if (!sameDraft) releaseDraftFiles(current.draft, options.files);
      const draft = emptyInputDraft(surface, mutation, sameDraft ? current.draft : {});
      store.update({ view: "create", creationOrigin: current.view === "detail" ? "detail" : "list",
        creationJourneyId: mutation.id, draft, ...(sameDraft ? {} : { touchedFields: [], draftRevision: 0 }),
        prepared: null, notice: "", error: null });
      void references.refresh();
      void mediaReferences.refresh();
    },
    startEdit(journeyId: string): boolean {
      const current = store.get(), detail = current.detail;
      const journey = surface.journeys.find(item => item.id === journeyId);
      const mapping = options.initialize?.[journeyId];
      if (current.view !== "detail" || !detail || current.selectedId !== detail.id ||
        journey?.kind !== "mutation" || !journey.subject || !journey.inputFields.length ||
        !subjectActionAvailable(surface, current, journeyId, detail.id, detail.version, scope) ||
        read?.kind !== "read" || read.subject !== journey.subject || !mapping ||
        mapping.length !== journey.inputFields.length || new Set(mapping.map(item => item.input)).size !== mapping.length ||
        mapping.some(item => !journey.inputFields.includes(item.input) || !read.fields.includes(item.fact) ||
          !canInitializeInput(journey.inputSchema.properties[item.input], read.detailSchema.properties[item.fact]) ||
          !isInitialInputValue(journey.inputSchema.properties[item.input], detail.facts[item.fact]))) return false;
      store.update({ view: "edit", editing: { journeyId, subject: detail.id, expectedVersion: detail.version,
        facts: { ...detail.facts }, creationDraft: { draft: { ...current.draft }, draftRevision: current.draftRevision,
          touchedFields: [...current.touchedFields] } },
        draft: Object.fromEntries(mapping.map(item => [item.input, structuredClone(detail.facts[item.fact]) as string | readonly string[]])),
        draftRevision: 0, touchedFields: [], prepared: null, mutationId: null, notice: "", error: null });
      void references.refresh();
      void mediaReferences.refresh();
      return true;
    },
    async select(id: string) {
      if (!read || store.get().busy || store.get().uncertain || store.get().editing || !ready(read.id)) return;
      store.update({ view: "detail", selectedId: id, detail: null, offers: {}, prepared: null, notice: "" });
      await refresh();
    },
    back() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      const view = current.view === "review" ? (current.editing ? "edit" : current.mutationId === current.creationJourneyId ? "create" : "detail")
        : current.view === "edit" ? "detail" : current.view === "create" ? current.creationOrigin : "list";
      if (current.view === "edit") releaseDraftFiles(current.draft, options.files);
      store.update({ view, ...leaveSelection(view), prepared: null, notice: "", ...(current.view === "edit" ? restoreCreationDraft(current) : {}) });
    },
    dismissError() { store.update({ error: null }); },
    close() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      if (current.editing) releaseDraftFiles(current.draft, options.files);
      const view = current.editing ? "detail" : current.view === "create" ? current.creationOrigin : "list";
      store.update({ view, ...leaveSelection(view),
        ...restoreCreationDraft(current), prepared: null, mutationId: null, notice: "" });
    },
    get primary(): Mutation { const value = primary(); if (!value) throw new Error("PRIMARY_CREATION_REQUIRED"); return value; },
  };
}
