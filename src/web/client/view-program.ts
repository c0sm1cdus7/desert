import type { HumanSurface, ValidateInput } from "../types.ts";
import { viewEventOwnership, type OwnedViewEvent } from "./view-events.ts";
import { compileViewProgram } from "../../views/program.ts";
import { sourceRead } from "../../views/program-bindings.ts";
import { projectView, projectViewPanel } from "./view-projection.ts";
import { viewScopes } from "./view-scopes.ts";
import { webTransport, type ControllerTransport } from "./transport.ts";
import type { AccessClient } from "./access.ts";
import type { DraftFileHost } from "../../interaction/image-input.ts";
import type { AssetReference, AssetImageVariant } from "../../assets/types.ts";
import { activityModel } from "./activity-model.ts";
import { projectActivityPanel } from "./activity-projection.ts";
import { activityEvent } from "./activity-events.ts";
import type { ActivityHost } from "./activity-host.ts";
import { fileEntry } from "./file-entry.ts";
import { attentionFeed } from "./attention-feed.ts";
import { viewInputs } from "../../views/ports.ts";
import { modelRelatedSelection } from "./model-related-selection.ts";
import {readRefresh} from './read-refresh.ts';
import type { ViewJourney } from '../../views/program-schema.ts';
import { relatedMediaDraft, lockRelatedForm } from './view-related-draft.ts';
import { connectionPresentation } from './connection-presentation.ts';

/** Nonvisual interpreter; the installed controller remains the only operation executor. */
export function viewProgramModel(input: unknown, surface: HumanSurface, validate: ValidateInput, transport?: ControllerTransport,
  access?: Pick<AccessClient, "lock">, files?: DraftFileHost, activityHost?: ActivityHost, profile?: { displayName?: string }) {
  const controller = transport ?? webTransport(surface.contractDigest);
  const program = compileViewProgram(input, surface), scopes = viewScopes(program, surface, validate, controller, files);
  if (program.journeys.some(journey => journey.kind === "activity") && !activityHost) throw new Error("ACTIVITY_HOST_REQUIRED");
  let destinationId = program.entry, creating = false, stopped = false;
  const history: string[] = [];
  let observeAttention=()=>{};
  const picker = fileEntry(surface, files);
  let entryError: string | null = null;
  const listeners = new Set<() => void>();
  const destination = () => program.destinations.find(item => item.id === destinationId)!;
  const journeyFor = (id: string) => program.journeys.find(item => item.id === id)!;
  const definition = (id: string) => program.views.find(item => item.id === id)!;
  function activeJourney() {
    const active = journeyFor(destination().entryJourney);
    if (active.kind !== "read" && active.kind !== "presentation") throw new Error("INVALID_DESTINATION_JOURNEY");
    return active;
  }
  function readScope(id: string) {
    const value = scopes.find(item => item.scope.kind === "read" && item.scope.read.id === id);
    if (!value) throw new Error("INVALID_VIEW_SOURCE");
    return value;
  }
  function presentationScope() {
    const value = scopes.find(item => item.scope.kind === "presentation");
    if (!value) throw new Error("INVALID_VIEW_PRESENTATION_SCOPE");
    return value;
  }
  const entry = activeJourney();
  let scope = entry.kind === "read" ? readScope(entry.id) : presentationScope();
  const state = () => scope.model.snapshot();
  let relatedSave: { panel: Extract<ViewJourney,{kind:'update'}>; read: Extract<ViewJourney,{kind:'read'}>;
    draft: ReturnType<typeof state>; accepted: boolean; working: boolean } | undefined;
  function mainScope() { const active = activeJourney(); return active.kind === "read" ? readScope(active.id) : presentationScope(); }
  function mainView() {
    const active = activeJourney(), selected = mainScope().model.snapshot();
    return active.kind === "read" && active.presentation === "main" && selected.selectedId ? active.detailView : active.view;
  }
  function currentRead() {
    return scope.scope.kind === "read" ? journeyFor(scope.scope.read.id) : undefined;
  }
  let readingContext: { scope: typeof scope; subject: string; identity: object } | undefined;
  function readingIdentity() {
    const current = state();
    if (stopped || scope.scope.kind !== "read" || !current.selectedId) { readingContext = undefined; return undefined; }
    if (readingContext?.scope !== scope || readingContext.subject !== current.selectedId) {
      readingContext = { scope, subject: current.selectedId, identity: Object.freeze({}) };
    }
    return current.view === "detail" && current.detail?.id === current.selectedId ? readingContext.identity : undefined;
  }
  const ownership = viewEventOwnership();
  function syncOwners() {
    const current = state(), panel = panelJourney(), activity = activities.snapshot();
    return ownership.sync([destinationId, mainView(), mainScope().model.snapshot().selectedId, current.view, panel?.id, current.selectedId, current.prepared?.id,
      activity.activity?.id, activity.activity?.revision, activity.prepared?.id, activity.uncertain], Boolean(panel));
  }
  const notify = () => {
    const current = state();
    if (relatedSave && !relatedSave.accepted && current.view === 'detail' && current.notice === 'Saved' &&
      current.selectedId === relatedSave.draft.editing?.subject && !current.editing) relatedSave.accepted = true;
    observeAttention();syncRelations(); syncOwners(); for (const listener of listeners) listener();
  };
  const activities = activityModel(surface, controller, notify, async (experience, receipt) => {
    const read = sourceRead(program, surface, experience);
    activate(read.id); settleRead(read.id);
    creating = false; syncReading(); await scope.model.select(receipt.object.id); void attention.refresh(); notify();
  }, activityHost);
  const attention = attentionFeed(program, surface, controller, notify);
  attention.availability(false, true);
  const relations = modelRelatedSelection(program, surface, controller, validate, notify);
  let relatedRevision = 0;
  const hasAttention = program.journeys.some(journey=>journey.kind==='activity')||program.views.some(view => view.content.some(item => item.kind === "attention"));
  let attentionReady=false,attentionConnecting=true,activityRevision='';
  const attentionRefresh=readRefresh(()=>attention.refresh(),()=>!stopped&&hasAttention&&attentionReady);
  observeAttention=()=>{
    const activityJourneys=program.journeys.filter(journey=>journey.kind==='activity');
    const ready=!stopped&&activityJourneys.every(journey=>state().availability.journeys[journey.id]?.dependenciesReady===true);
    const connecting=!ready&&!stopped&&activityJourneys.every(journey=>connectionPresentation(state().availability.journeys[journey.id])!=='offline');
    const current=activities.snapshot().activity,revision=current?`${current.id}:${current.revision}:${current.phase}`:'';
    if(ready!==attentionReady||connecting!==attentionConnecting){attentionReady=ready;attentionConnecting=connecting;attention.availability(ready,connecting);if(ready)void attentionRefresh.request();else attentionRefresh.invalidate();}
    else if(ready&&revision!==activityRevision)void attentionRefresh.request();
    activityRevision=revision;
    attentionRefresh.observe();
  };
  function syncRelations() {
    const panel = panelJourney(), current = state();
    const read = relatedSave?.read ?? (panel?.kind === "update" ? sourceRead(program, surface, panel) : undefined);
    relations.updateContext({ ...(read ? { readJourneyId: read.id } : {}), ...(current.selectedId ? { parentId: current.selectedId } : {}),
      editing: Boolean(relatedSave) || current.view === "edit" && panel?.kind === "update",
      active: !stopped && Boolean(read && current.availability.journeys[read.id]?.dependenciesReady &&
        read.related?.filter(binding => binding.membership).every(binding =>
          current.availability.journeys[binding.read]?.dependenciesReady &&
          current.availability.journeys[binding.membership!.update]?.dependenciesReady)) });
    const revision = relations.snapshot().revision;
    if (revision !== relatedRevision) {
      relatedRevision = revision;
      const included = new Set(overviewReads());
      for (const item of scopes) if (item.scope.kind === "read" && (item === scope || included.has(item.scope.read.id))) void item.model.refresh();
    }
  }
  function interactionLocked() {
    const current = state(), activity = activities.snapshot(), related = relations.snapshot();
    return current.busy || current.uncertain || activity.busy || activity.uncertain || related.busy || related.uncertain ||
      related.committing || Boolean(relatedSave?.working || relatedSave?.accepted);
  }
  function overviewReads() {
    const active = activeJourney();
    return active.kind === "presentation" ? active.collections?.flatMap(binding => [binding.read, ...(binding.preview ? [binding.preview.read] : [])]) ?? []
      : [active.id, ...(mainScope().model.snapshot().selectedId ? active.related?.map(binding => binding.read) ?? [] : [])];
  }
  function settleRead(id: string) {
    if (overviewReads().includes(id)) return;
    const target = program.destinations.find(item => item.entryJourney === id);
    if (target && target.id !== destinationId) { history.push(destinationId); destinationId = target.id; }
  }
  function syncReading() {
    const included = new Set(overviewReads());
    for (const item of scopes) if (item.scope.kind === "read") item.model.setReading(item === scope || included.has(item.scope.read.id));
  }
  function relatedReads() {
    return new Map(program.journeys.flatMap(journey => journey.kind === "read" ? [[journey.id,
      { journey, state: readScope(journey.id).model.snapshot(), scope: readScope(journey.id).scope }] as const] : []));
  }
  function activate(read: string) {
    const next = readScope(read);
    scope = next; syncReading();
  }
  const unsubscribes = scopes.map(item => item.model.subscribe(next => {
    if (scope !== item) {
      if (item.scope.kind === "read" && overviewReads().includes(item.scope.read.id)) notify();
      return;
    }
    if (creating && next.view === "detail") {
      creating = false;
      if (scope.scope.kind !== "read") throw new Error("INVALID_VIEW_SOURCE");
      const read = scope.scope.read;
      settleRead(read.id); syncReading();
    }
    if (next.view === "list") creating = false;
    syncReading();
    notify();
  }));
  function panelJourney() {
    if (activities.snapshot().experience) return activities.snapshot().experience;
    if (relatedSave?.accepted) return relatedSave.panel;
    const current = state(), active = activeJourney();
    if (["create", "edit", "review", "recovery"].includes(current.view)) {
      const id = current.view === "review" || current.view === "recovery" ? current.mutationId
        : current.editing?.journeyId ?? current.creationJourneyId;
      if (!id) throw new Error("FORM_JOURNEY_REQUIRED");
      return journeyFor(id);
    }
    const read = currentRead();
    return current.view === "detail" && read?.kind === "read" &&
      !(active.id === read.id && read.presentation === "main") ? read : null;
  }
  function panelView(panel: ReturnType<typeof panelJourney>) {
    if (panel?.kind === "activity") return panel.activity.steps[activities.snapshot().activity?.progress.nextStep ?? 0]?.view;
    return panel?.kind === "read" ? panel.detailView : panel?.kind === "action"
      ? sourceRead(program, surface, panel).detailView : panel?.view;
  }
  function snapshot() {
    const active = activeJourney(), panel = panelJourney(), current = state(), related = relations.snapshot();
    const view = panelView(panel), panelDefinition = view ? definition(view) : null;
    const owners = syncOwners(), reading = readingIdentity();
    const activity = activities.snapshot(), activityPanel = projectActivityPanel(program, surface, current, activity, validate);
    const main = mainScope(), mainState = main.model.snapshot();
    const projected = projectView(program, active, definition(mainView()), surface,
      { ...mainState, busy: current.busy || mainState.busy || related.busy || related.committing || Boolean(relatedSave?.accepted), uncertain: current.uncertain || mainState.uncertain || related.uncertain },
      validate, main.scope, relatedReads(), profile,attention.snapshot());
    const backUnavailable = !history.length && projected.top?.leading?.intent.kind === "back";
    return { program, activeDestination: destinationId,
      resolved: { ...projected, ...(hasAttention ? { attention: attention.snapshot() } : {}),
        ...(backUnavailable ? { top: { ...projected.top!, leading: { ...projected.top!.leading!, state: "unavailable" as const } } } : {}), owner: owners.main },
      panel: activityPanel && owners.panel ? { ...activityPanel, owner: owners.panel } : panel && panelDefinition && owners.panel ? {
        ...relatedPanel(panel, panelDefinition, current), owner: owners.panel,
        ...(reading ? { readingIdentity: reading } : {}) } : null,
      error: entryError ?? activity.error ?? current.error, uncertain: activity.uncertain || current.uncertain || related.uncertain, state: current, activity };
  }
  function relatedPanel(panel: NonNullable<ReturnType<typeof panelJourney>>, view: ReturnType<typeof definition>, current: ReturnType<typeof state>) {
    const related = relations.snapshot();
    const read = panel.kind === 'update' ? sourceRead(program,surface,panel) : undefined;
    const display = relatedSave?.accepted ? { ...relatedSave.draft, availability:current.availability, error:current.error,
      busy:true, uncertain:false } : current;
    const filtered = read ? relatedMediaDraft(surface,read,display,related).state : display;
    let projected = projectViewPanel(program, panel, view, surface,
      { ...filtered, busy: filtered.busy || related.busy, uncertain: filtered.uncertain || related.uncertain }, validate, scope.scope,attention.snapshot());
    if (relatedSave?.accepted || relatedSave?.working) projected = lockRelatedForm(projected);
    const controls = current.busy || current.uncertain ? { ...related, groups: related.groups.map(group => ({ ...group, disabled: true })) } : related;
    return projected.body && related.groups.length ? { ...projected, body: { ...projected.body, relations: controls } } : projected;
  }
  function navigate(id: string, remember = true) {
    if (stopped) return;
    if (!program.destinations.some(destination => destination.id === id)) throw new Error("UNKNOWN_VIEW_DESTINATION");
    if (interactionLocked()) return;
    picker.cancel(); entryError = null;
    activities.close();
    const previousMain = mainScope();
    scope.model.close();
    if (state().view === "detail") scope.model.back();
    if (previousMain !== scope) { previousMain.model.close(); if (previousMain.model.snapshot().view === "detail") previousMain.model.back(); }
    if (remember && id !== destinationId) history.push(destinationId);
    creating = false; destinationId = id; readingContext = undefined;
    const target = journeyFor(destination().entryJourney);
    if (target.kind === "read") activate(target.id);
    else scope = presentationScope();
    syncReading();
    if (hasAttention) void attention.refresh();
    notify();
  }
  function goBack() {
    if (stopped || interactionLocked()) return;
    const previous = history.pop();
    if (previous) navigate(previous, false);
  }
  function closePanel() {
    if (interactionLocked()) return;
    relatedSave = undefined;
    scope.model.close();
    const main = mainScope();
    if (state().view === "list" && scope !== main) { scope = main; syncReading(); notify(); }
  }
  function startJourney(id: string) {
    const target = journeyFor(id);
    if (!target) throw new Error("UNKNOWN_VIEW_JOURNEY");
    if (target.kind === "activity") {
      activate(sourceRead(program, surface, target).id); void activities.open(target);
    } else if (target.kind === "create") {
      const initiatingOwner = syncOwners().main;
      const origin = target.initializeFrom && activeJourney().id === target.initializeFrom.source
        ? { scope: mainScope(), subject: mainScope().model.snapshot().selectedId } : undefined;
      const begin = () => {
        if (stopped || interactionLocked() || syncOwners().main !== initiatingOwner) return false;
        if (origin && (mainScope() !== origin.scope || mainScope().model.snapshot().selectedId !== origin.subject)) return false;
        activate(sourceRead(program, surface, target).id);
        scope.model.create(target.id); creating = state().view === "create";
        if (creating && origin?.subject && target.initializeFrom) {
          scope.model.initializeReference(target.initializeFrom.input, origin.subject);
        }
        return creating;
      };
      if (target.startWith) {
        entryError = null;
        void picker.select(target, selection => {
          if (!begin()) return false;
          scope.model.editFiles(selection); return true;
        }).catch(() => { if (!stopped) { entryError = "FILE_SELECTION_REJECTED"; notify(); } });
      } else begin();
    } else if (target.kind === "update" || target.kind === "action") {
      if (scope.scope.kind !== "read" || target.source !== scope.scope.read.id ||
        !program.objects?.some(object => object.actions.some(action => action.journey === id))) {
        throw new Error("INVALID_VIEW_EVENT");
      }
      if (target.kind === "update") scope.model.startEdit(id);
      else {
        const current = state(), mutation = surface.journeys.find(item => item.id === id);
        if (current.view !== "detail" || !current.detail || current.selectedId !== current.detail.id || mutation?.kind !== "mutation") return;
        void scope.model.invoke(mutation, current.detail.id);
      }
    } else {
      const next = program.destinations.find(item => item.entryJourney === id);
      if (!next) throw new Error("UNKNOWN_VIEW_DESTINATION");
      navigate(next.id);
    }
  }
  function event(value: OwnedViewEvent) {
    syncOwners();
    const current = state(), model = scope.model;
    const navigation = current.view === "detail" && panelJourney()?.kind === "read" && !current.busy && !current.uncertain;
    const event = ownership.read(value, navigation ? { kind: "navigation", view: mainView() } : { kind: "exclusive" });
    if (!event) return;
    if (event.kind === "related.change" || event.kind === "related.recover") {
      const activity = activities.snapshot();
      if (!current.busy && !current.uncertain && !activity.busy && !activity.uncertain &&
        (event.kind === 'related.recover' || !relatedSave)) void relations.event(event).then(() => {
          if (event.kind === 'related.change') clearRemovedCover();
          if (relatedSave?.accepted && !relations.snapshot().dirty && !relations.snapshot().committing) relatedSave = undefined;
          notify();
        });
      return;
    }
    if (relations.snapshot().busy || relations.snapshot().uncertain || relations.snapshot().committing || relatedSave?.accepted || relatedSave?.working) return;
    if (event.kind === "attention.resume") {
      if (current.busy || current.uncertain || panelJourney() ||
        !definition(activeJourney().view).content.some(item => item.kind === "attention")) return;
      const item = attention.snapshot().items.find(item => item.id === event.id && item.available);
      const experience = item ? journeyFor(item.journey) : undefined;
      if (!item || experience?.kind !== "activity") throw new Error("INVALID_ATTENTION_ITEM");
      activate(sourceRead(program, surface, experience).id);
      void activities.open(experience, item.id); return;
    }
    const activityId = activities.snapshot().experience?.id;
    if (activityEvent(activities, event, Boolean(activityId && current.availability.journeys[activityId]?.dependenciesReady))) return;
    if (event.kind === "files.choose" || event.kind === "files.remove") { model.editFiles(event); return; }
    if (event.kind === "labels.change") { model.editLabels(event); return; }
    if (event.kind === 'reference.create' || event.kind === 'reference.refresh' || event.kind === 'reference.recover') { void model.referenceEvent(event); return; }
    if (event.kind === "input.change") {
      if ((current.view === "create" || current.view === "edit") && !current.uncertain) {
        const mutation = surface.journeys.find(item => item.id === (current.editing?.journeyId ?? current.creationJourneyId));
        if (mutation?.kind !== "mutation" || !mutation.inputFields.includes(event.name)) throw new Error("INVALID_VIEW_INPUT");
        model.edit(event.name, event.value);
      }
      return;
    }
    if (event.kind === "problem.close") { entryError = null; model.dismissError(); notify(); return; }
    if (event.kind === "transient.closed") return;
    if (event.kind === "transient.close") { closePanel(); return; }
    if (event.kind !== "surface.invoke") throw new Error("INVALID_VIEW_EVENT");
    const intent = event.intent;
    if (intent.kind === "close") { closePanel(); return; }
    if (intent.kind === "back") {
      if (value.owner === syncOwners().main) goBack();
      else { relatedSave = undefined; model.back(); }
      return;
    }
    if (intent.kind === "accept" || intent.kind === "recover") {
      if ((intent.kind === "accept" && current.view !== "review" && current.view !== "recovery") ||
        (intent.kind === "recover" && current.view !== "recovery")) throw new Error("INVALID_VIEW_EVENT");
      void primaryRelatedSave(() => model[intent.kind]()); return;
    }
    if (intent.kind === "journey") {
      const panel = panelJourney();
      if ((current.view === "create" || current.view === "edit") && panel?.id === intent.journey) {
        const submit = panel.outputs.find(binding => binding.action.kind === "submit")!;
        dispatchOutput(submit.view, submit.output); return;
      }
      const read = currentRead();
      if (current.view !== "detail" || read?.kind !== "read" || !program.objects?.some(object =>
        object.view === read.detailView && object.actions.some(action => action.journey === intent.journey))) throw new Error("INVALID_VIEW_EVENT");
      startJourney(intent.journey); return;
    }
    if (intent.kind !== "view.output") throw new Error("INVALID_VIEW_EVENT");
    dispatchOutput(intent.view, intent.output, intent.recordId);
  }
  function dispatchOutput(view: string, output: string, recordId?: string) {
    const current = state(), active = activeJourney(), panel = panelJourney();
    const mainAvailable = !panel || current.view === "detail" && panel.kind === "read";
    const owner = mainAvailable && view === mainView() ? active :
      !["review", "recovery"].includes(current.view) && view === panelView(panel) ? panel : undefined;
    const binding = owner?.outputs.find(item => item.view === view && item.output === output);
    if (!binding) throw new Error("UNKNOWN_VIEW_OUTPUT");
    if (binding.action.kind !== "select" && recordId !== undefined) throw new Error("INVALID_VIEW_OUTPUT_PAYLOAD");
    if (interactionLocked()) return;
    const sourceScope = owner === active ? mainScope() : scope;
    const sourceState = sourceScope.model.snapshot();
    if (projectView(program, owner!, definition(view), surface, sourceState, validate, sourceScope.scope, relatedReads()).disabledOutputs.includes(output)) return;
    switch (binding.action.kind) {
      case "lock":
        if (!access) throw new Error("IDENTITY_ACCESS_REQUIRED");
        stop(); void access.lock(); break;
      case "journey": startJourney(binding.action.journey); break;
      case "select": {
        if (owner?.kind === "presentation") {
          const port = viewInputs(definition(view)).find(port => port.kind === "collection" && port.output === output);
          const binding = owner.collections?.find(binding => binding.input === port?.input);
          if (!binding) throw new Error("INVALID_OVERVIEW_INPUT");
          const source = readScope(binding.read).model.snapshot();
          const visible = source.records.filter(record => !binding.where || record.facts[binding.where.field] === binding.where.value).slice(0, binding.limit);
          if (!recordId || !visible.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
          const target = program.destinations.find(destination => destination.entryJourney === binding.read);
          if (target) navigate(target.id); else activate(binding.read);
          void scope.model.select(recordId); break;
        }
        if (owner?.kind === "read" && view === owner.detailView) {
          const port = viewInputs(definition(view)).find(port => port.kind === "collection" && port.output === output);
          const binding = owner.related?.find(binding => binding.input === port?.input);
          if (!binding) throw new Error("INVALID_RELATED_READ");
          const source = readScope(binding.read).model.snapshot();
          if (!recordId || !sourceState.selectedId || !source.records.some(record => {
            const memberships = record.facts[binding.where.field.field];
            return record.id === recordId && Array.isArray(memberships) && memberships.includes(sourceState.selectedId);
          })) throw new Error("INVALID_VIEW_RECORD");
          activate(binding.read); void scope.model.select(recordId); break;
        }
        if (!recordId || !sourceState.records.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
        if (owner?.kind === "read") activate(owner.id);
        void scope.model.select(recordId); break;
      }
      case "submit": {
        const mutation = surface.journeys.find(item => item.id === owner!.id);
        if (mutation?.kind !== "mutation") throw new Error("INVALID_VIEW_EVENT");
        clearRemovedCover();
        if (owner?.kind === 'update' && relations.snapshot().dirty) relatedSave = { panel:owner,
          read:sourceRead(program,surface,owner),draft:state(),accepted:false,working:true };
        void primaryRelatedSave(() => scope.model.invoke(mutation)); break;
      }
      case "close": closePanel(); break;
      case "back": goBack(); break;
    }
  }
  function clearRemovedCover() {
    const panel = panelJourney();
    if (panel?.kind !== 'update' || state().view !== 'edit' || relatedSave?.accepted) return;
    const read = sourceRead(program,surface,panel);
    for (const field of relatedMediaDraft(surface,read,state(),relations.snapshot()).clear) {
      scope.model.editLabels({kind:'labels.change',control:field,values:[]});
    }
  }
  async function primaryRelatedSave(action:()=>Promise<unknown>) {
    const pending = relatedSave;
    if (pending) pending.working = true;
    await action();
    if (stopped || !pending || relatedSave !== pending) return;
    pending.working = false;
    if (pending.accepted) {
      if (await relations.commit()) relatedSave = undefined;
    } else if (!['review','recovery'].includes(state().view)) relatedSave = undefined;
    notify();
  }
  function stop() {
    relatedSave = undefined;
    picker.cancel();
    attentionRefresh.stop();
    attention.dispose();
    relations.stop();
    stopped = true; readingContext = undefined; ownership.stop(); unsubscribes.forEach(stop => stop());
    activities.dispose();
    scopes.forEach(item => item.model.dispose()); listeners.clear();
  }
  return {
    snapshot, event, navigate,
    images: {
      lease: (asset: AssetReference) => relations.images.lease(asset) ?? scopes.map(item => item.model.images.lease(asset)).find(Boolean),
      subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    },
    image: (asset: AssetReference, variant: AssetImageVariant, signal?: AbortSignal) => {
      const lease = relations.images.lease(asset) ?? scopes.map(item => item.model.images.lease(asset)).find(Boolean);
      return lease ? lease.read(variant, signal) : scope.model.image(asset, variant, signal);
    },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    async start(invitation?: string) {
      if (stopped) return;
      const active = journeyFor(destination().entryJourney);
      if (active.kind === "read") activate(active.id);
      else syncReading();
      const connectedModel = scope.model;
      const initial = connectedModel.start(invitation);
      if (invitation) await initial;
      await Promise.all([initial, ...scopes.filter(item => item.model !== connectedModel).map(item => item.model.start())]);
      if (hasAttention && !stopped) {
        await attention.refresh();
      }
      const pending = activities.pendingJourney(), experience = pending ? journeyFor(pending) : undefined;
      if (experience?.kind === "activity") { activate(sourceRead(program, surface, experience).id); await activities.open(experience); }
    },
    stop,
  };
}
