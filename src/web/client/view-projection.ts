import type { HumanSurface, ValidateInput } from "../types.ts";
import { subjectActionAvailable, type HumanState } from "./state.ts";
import type { ViewProgram, ViewJourney } from "../../views/program-schema.ts";
import type { View } from "../../views/schema.ts";
import type { ResolvedView, ResolvedPanel } from "../../views/resolved.ts";
import { viewInputs } from "../../views/ports.ts";
import { presentCollection } from "../../interaction/bank-presenters.ts";
import { bankNode, BankVersion, type BankNode } from "../../interaction/bank-node.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { toolbarAction } from "../../interaction/toolbar.ts";
import { presentFrame } from "./frame.ts";
import { requireReadScope, type ModelScope } from "./model-scope.ts";
import { presentFacts, readingFields } from "../../interaction/fact-presentation.ts";
import type { FrameContent } from "../../interaction/surface-frame.ts";
import { resolveViewIdentity } from "./view-identity.ts";
import { publishedActionsFor } from "../../views/program-bindings.ts";
import { inspectMutationDraft } from "./draft-validation.ts";
import { objectSelectors } from "./object-selectors.ts";
import { Check } from "@sinclair/typebox/value";
import { AssetReferenceSchema } from "../../assets/types.ts";
import {objectAttentionKey} from '../../attention.ts';
import type {AttentionSnapshot} from './attention-feed.ts';
import { connectionPresentation, unavailableReason } from './connection-presentation.ts';

export type RelatedRead = { readonly journey: Extract<ViewJourney, { kind: "read" }>; readonly state: HumanState; readonly scope: ModelScope };
export type RelatedReads = ReadonlyMap<string, RelatedRead>;

function contextContent(program: ViewProgram, definition: View, surface: HumanSurface, state: HumanState, content: FrameContent, scope: ModelScope,attention?:AttentionSnapshot): FrameContent {
  if (content.kind !== "context" || !state.detail) return content;
  const { read } = requireReadScope(scope);
  const publication = program.objects?.find(object => object.object === read.subject && object.view === definition.id);
  const title = definition.content.find(item => item.kind === "header")?.title;
  const selectors = objectSelectors(program, definition.id, surface, state, scope);
  const context = viewInputs(definition).find(port => port.kind === "context");
  const visible = context?.kind === "context" && context.fields ? context.fields.map(field => field.field) : read.fields;
  const fields = readingFields(visible, state.detail.facts).filter(field => !selectors.some(selector => selector.field === field) &&
    !(typeof title !== "string" && title?.kind === "subject-title" && field === publication?.title.field));
  const media = context?.kind === "context" ? context.presentation : undefined;
  const signals=attention?.objectSignals[objectAttentionKey(read.subject,state.detail.id)];
  // Published identity belongs in the shared top toolbar, not duplicated in the body.
  return { kind: "context", details: presentFacts(surface, read.subject,
    fields, state.detail.facts, state.references), actions: [], ...(selectors.length ? { selectors } : {}),
    ...(signals?.length&&state.availability.journeys[read.id]?.dependenciesReady?{attention:signals}:{}),
    ...(media ? { presentation: { kind: "media-object" as const, media: media.media.field,
      ...(media.description && fields.includes(media.description.field) ? { description: media.description.field } : {}) } } : {}) };
}

export function projectView(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput, scope: ModelScope, related: RelatedReads = new Map(),
  profile?: { displayName?: string; now?: Date },attention?:AttentionSnapshot): ResolvedView {
  const bound: Record<string, BankNode> = {};
  const pending: Record<string, Extract<FrameContent, { kind: "message" }>> = {};
  for (const port of viewInputs(definition)) {
    if (port.kind === "collection") {
      const binding = journey.kind === "presentation" ? journey.collections?.find(binding => binding.input === port.input) : undefined;
      const relation = journey.kind === "read" && definition.id === journey.detailView ? journey.related?.find(binding => binding.input === port.input) : undefined;
      const source = binding || relation ? related.get((binding ?? relation)!.read) : { journey, state, scope };
      if (!source) throw new Error("MISSING_OVERVIEW_READ");
      const subject = requireReadScope(source.scope).read.subject;
      const published = program.objects?.find(object => object.object === subject);
      const valueLabels: Record<string, Record<string, string>> = {};
      for (const action of published?.actions ?? []) if (action.selection) {
        const { fact, value, label } = action.selection;
        (valueLabels[fact.field] ??= {})[value] = label;
      }
      const records = binding ? source.state.records.filter(record => !binding.where || record.facts[binding.where.field] === binding.where.value).slice(0, binding.limit)
        : relation ? source.state.records.filter(record => {
          const value = record.facts[relation.where.field.field];
          return state.detail?.id === state.selectedId && Array.isArray(value) && value.includes(state.selectedId);
        }) : source.state.records;
      bound[port.input] = presentCollection(surface, records, {
      loaded: source.state.loaded && (!relation || Boolean(state.selectedId && state.detail?.id === state.selectedId)), selectedId: source.state.selectedId,
      connection: connectionPresentation(source.state.availability.journeys[source.journey.id]),
      disabled: state.busy || state.uncertain || (port.presentation?.kind!=='summary-widget' && !source.state.availability.journeys[source.journey.id]?.dependenciesReady),
    }, source.scope, port.presentation?.kind==='summary-widget' && binding?.summary ? {...port.presentation,...binding.summary,field:binding.summary.field.field,
      truncated:Boolean(binding&&source.state.records.length>binding.limit)} : port.presentation?.kind === "collection-grid" && binding?.preview ? {
      kind: "collection-grid", title: port.presentation.title.field,
      previews: records.map(record => {
        const preview = binding.preview!;
        const members = (related.get(preview.read)?.state.records ?? []).filter(member => {
          const memberships = member.facts[preview.where.field];
          return Array.isArray(memberships) && memberships.includes(record.id);
        });
        const chosen = preview.cover ? record.facts[preview.cover.field] : undefined;
        const images = members.filter(member => {
          const media = member.facts[preview.media.field];
          return Check(AssetReferenceSchema, media) && (!media.media || media.media === "image");
        });
        const cover = images.find(member => Array.isArray(chosen) && chosen.includes(member.id)) ?? images[0];
        const media = cover?.facts[preview.media.field];
        return { id: record.id, count: members.length, ...(Check(AssetReferenceSchema, media) ? { media } : {}) };
      }),
    } : port.presentation?.kind === "media-grid" ? { kind: "media-grid", image: port.presentation.image.field,
      ...(relation?.layout ? {layout: state.detail?.facts[relation.layout.field] === "list" ? "list" as const : "grid" as const} : {}),
      ...(port.presentation.fit ? { fit: port.presentation.fit.field } : {}),
      ...(port.presentation.description ? { description: port.presentation.description.field } : {}) } : undefined,
      port.fields?.map(field => field.field), valueLabels,source.state.availability.journeys[source.journey.id]?.dependenciesReady?
        Object.fromEntries(records.flatMap(record=>{const signals=attention?.objectSignals[objectAttentionKey(subject,record.id)];
          return signals?.length?[[record.id,signals]]:[];})):undefined);
    }
    else {
      const frame = presentFrame(surface, { ...state, view: port.kind === "form" ? journey.kind === "update" ? "edit" : "create" : "detail" }, validate, scope);
      if (frame.content.kind === "form" || frame.content.kind === "context") {
        bound[port.input] = bankNode({ version: BankVersion, kind: frame.content.kind,
          content: contextContent(program, definition, surface, state, frame.content, scope,attention) });
      } else if (frame.content.kind === "message") pending[port.input] = frame.content;
    }
  }
  const disabledOutputs = journey.outputs.filter(binding => {
    if (binding.view !== definition.id) return false;
    if (state.busy || state.uncertain) return true;
    const controls = [definition.topDock, definition.bottomDock].flatMap(toolbar =>
      toolbar?.actions.filter(action => action.output === binding.output) ?? []);
    if (controls.length && controls.every(action => action.disabled === true)) return true;
    if (binding.action.kind === "journey") {
      const targetId = binding.action.journey;
      const target = program.journeys.find(item => item.id === targetId);
      // Opening a browsing destination is local navigation. Its cached reading remains
      // available offline; selecting an uncached object and all writes stay gated below.
      return target?.kind !== "presentation" && target?.kind !== "read" && !state.availability.journeys[targetId]?.dependenciesReady;
    }
    if (binding.action.kind === "submit") {
      const primary = surface.journeys.find(item => item.id === journey.id);
      return primary?.kind !== "mutation" || !state.availability.journeys[journey.id]?.dependenciesReady ||
        !inspectMutationDraft(surface, primary, state.draft, validate).valid || (journey.kind === "update" &&
          (!state.editing || !subjectActionAvailable(surface, state, journey.id, state.editing.subject, undefined, scope)));
    }
    if (binding.action.kind === "select") {
      const port = viewInputs(definition).find(port => port.kind === "collection" && port.output === binding.output);
      const read = journey.kind === "presentation" ? journey.collections?.find(binding => binding.input === port?.input)?.read
        : journey.kind === "read" && definition.id === journey.detailView ? journey.related?.find(binding => binding.input === port?.input)?.read : journey.id;
      return !read || !state.availability.journeys[read]?.dependenciesReady;
    }
    return false;
  }).map(binding => binding.output);
  const action = (item: NonNullable<View["topDock"]>["actions"][number]) => {
    const binding = journey.outputs.find(binding => binding.view === definition.id && binding.output === item.output);
    const enabled = !item.disabled && !disabledOutputs.includes(item.output);
    const targetId = binding?.action.kind === 'journey' ? binding.action.journey : undefined;
    const dependency = targetId ? program.journeys.find(target => target.id === targetId)
      : binding?.action.kind === 'submit' ? journey : undefined;
    const reason = dependency && dependency.kind !== 'presentation' ? unavailableReason(state.availability.journeys[dependency.id]) : undefined;
    if (binding?.action.kind === "close") return toolbarAction({ kind: "close" }, item.label, item.icon, enabled);
    if (binding?.action.kind === "back") return toolbarAction({ kind: "back" }, item.label, "back", enabled);
    if (binding?.action.kind === "submit" && (journey.kind === "create" || journey.kind === "update")) {
      return { ...toolbarAction({ kind: "journey", journey: journey.id }, item.label, item.icon, enabled), ...(reason ? {reason} : {}) };
    }
    return { ...toolbarAction({ kind: "view.output", view: definition.id, output: item.output },
      item.label, item.icon, enabled), ...(reason ? {reason} : {}) };
  };
  const resolvedDefinition = resolveViewIdentity(program, journey, definition, surface, state, profile);
  const header = resolvedDefinition.content.find(item => item.kind === "header");
  const topActions = definition.topDock?.actions.map(action) ?? [];
  const subjectActions = publishedActionsFor(program, journey).filter(action => action.view === definition.id && !action.selection)
    .map(({ journey: id, icon }) => {
      const reason = unavailableReason(state.availability.journeys[id]);
      return { ...toolbarAction({ kind: "journey", journey: id },
        surface.language.journeys[id]!, icon, subjectActionAvailable(surface, state, id, undefined, undefined, scope)),
        ...(reason ? {reason} : {}) };
    });
  const bottomActions = definition.bottomDock?.actions.map(action) ?? [];
  const close = topActions.flatMap(item => item.intent.kind === "close" ? [{ ...item, intent: item.intent }] : [])[0];
  const back = topActions.flatMap(item => item.intent.kind === "back" ? [{ ...item, intent: item.intent }] : [])[0];
  const primary = bottomActions.flatMap(item => item.intent.kind !== "close" && item.intent.kind !== "back" ? [{ ...item, intent: item.intent }] : [])[0];
  const dependencies = journey.kind === 'presentation' ? journey.collections?.map(binding => binding.read) ?? [] : [journey.id];
  const missing = dependencies.map(id => state.availability.journeys[id]).find(value => !value?.dependenciesReady);
  const connection = missing ? {state:connectionPresentation(missing), label:unavailableReason(missing)!} : undefined;
  return {
    view: resolvedDefinition, bindings: bound, ...(Object.keys(pending).length ? { pending } : {}), disabledOutputs,
    ...(connection ? {connection} : {}),
    top: { title: header?.title ?? program.destinations.find(item => item.entryJourney === journey.id)?.label ?? program.label,
      ...(definition.topDock?.actionGroup ? {actionGroup:definition.topDock.actionGroup} : {}),
      ...(header?.subtitle ? { subtitle: header.subtitle } : {}),
      ...(close ? { leading: close } : back ? { leading: back } : {}),
      trailing: [...topActions.flatMap(item => item.intent.kind !== "close" && item.intent.kind !== "back" ? [{ ...item, intent: item.intent }] : []), ...subjectActions] },
    bottom: { ...(close ? { secondary: close } : {}), ...(primary ? { primary } : {}) },
  };
}

/** Canonical chrome and submit semantics surround the same admitted View sequence. */
export function projectViewPanel(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput, scope: ModelScope,attention?:AttentionSnapshot): ResolvedPanel {
  const canonical = presentFrame(surface, state, validate, scope);
  const presentation = (journey.kind === "create" || journey.kind === "update") && journey.presentation ? { presentation: journey.presentation } : {};
  if (state.view === "review" || state.view === "recovery") {
    return { ...presentation, frame: canonical, label: canonical.top.title, locked: state.busy || state.uncertain };
  }
  const resolved = projectView(program, journey, definition, surface, state, validate, scope,new Map(),undefined,attention);
  const primary = resolved.bottom?.primary;
  const bottom = { ...resolved.bottom, ...(primary && canonical.bottom.primary?.state === "pending"
    ? { primary: { ...primary, state: "pending" as const } } : {}) };
  const top = definition.content.some(item => item.kind === "header") ? resolved.top!
    : { ...resolved.top!, title: canonical.top.title };
  const frame = surfaceFrame({ ...canonical, content: contextContent(program, definition, surface, state, canonical.content, scope,attention),
    top, bottom });
  return { ...presentation, frame, body: resolved, label: frame.top.title, locked: state.busy || state.uncertain };
}
