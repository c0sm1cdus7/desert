import type { HumanSurface, ValidateInput } from "../types.ts";
import type { HumanState } from "./state.ts";
import type { ViewProgram, ViewJourney } from "../../views/program-schema.ts";
import type { View } from "../../views/schema.ts";
import type { ResolvedView, ResolvedPanel } from "../../views/resolved.ts";
import { viewInputs } from "../../views/ports.ts";
import { presentCollection } from "../../interaction/bank-presenters.ts";
import { bankNode, BankVersion, type BankNode } from "../../interaction/bank-node.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { toolbarAction } from "../../interaction/toolbar.ts";
import { presentFrame } from "./frame.ts";
import { readPresentation } from "./presentation.ts";
import { presentFacts } from "../../interaction/fact-presentation.ts";
import type { FrameContent } from "../../interaction/surface-frame.ts";

function contextContent(surface: HumanSurface, state: HumanState, content: FrameContent): FrameContent {
  if (content.kind !== "context" || !state.detail) return content;
  const read = readPresentation(surface);
  // Authored identity replaces the record title; keep that authorized fact in the body.
  // Subject mutations are not bound by this finite read/create presentation program.
  return { kind: "context", details: presentFacts(surface, read.subject, read.fields, state.detail.facts), actions: [] };
}

export function projectView(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput): ResolvedView {
  const bound: Record<string, BankNode> = {};
  for (const port of viewInputs(definition)) {
    if (port.kind === "collection") bound[port.input] = presentCollection(surface, state.records, {
      loaded: state.loaded, selectedId: state.selectedId,
      disabled: state.busy || state.uncertain || !state.availability.journeys[journey.id]?.dependenciesReady,
    });
    else {
      const frame = presentFrame(surface, { ...state, view: port.kind === "form" ? "create" : "detail" }, validate);
      if (frame.content.kind === "form" || frame.content.kind === "context") {
        bound[port.input] = bankNode({ version: BankVersion, kind: frame.content.kind,
          content: contextContent(surface, state, frame.content) });
      }
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
      return target?.kind !== "presentation" && !state.availability.journeys[targetId]?.dependenciesReady;
    }
    if (binding.action.kind === "submit") {
      const primary = surface.journeys.find(item => item.id === journey.id);
      return primary?.kind !== "mutation" || !state.availability.journeys[journey.id]?.dependenciesReady ||
        !validate(primary.commandId, state.draft);
    }
    if (binding.action.kind === "select") return !state.availability.journeys[journey.id]?.dependenciesReady;
    return false;
  }).map(binding => binding.output);
  const action = (item: NonNullable<View["topDock"]>["actions"][number]) => {
    const binding = journey.outputs.find(binding => binding.view === definition.id && binding.output === item.output);
    const enabled = !item.disabled && !disabledOutputs.includes(item.output);
    if (binding?.action.kind === "close") return toolbarAction({ kind: "close" }, item.label, item.icon, enabled);
    if (binding?.action.kind === "submit" && journey.kind === "create") {
      return toolbarAction({ kind: "journey", journey: journey.id }, item.label, item.icon, enabled);
    }
    return toolbarAction({ kind: "view.output", view: definition.id, output: item.output },
      item.label, item.icon, enabled);
  };
  const header = definition.content.find(item => item.kind === "header");
  const topActions = definition.topDock?.actions.map(action) ?? [];
  const bottomActions = definition.bottomDock?.actions.map(action) ?? [];
  const close = topActions.flatMap(item => item.intent.kind === "close" ? [{ ...item, intent: item.intent }] : [])[0];
  const primary = bottomActions.flatMap(item => item.intent.kind !== "close" ? [{ ...item, intent: item.intent }] : [])[0];
  return {
    view: definition, bindings: bound, disabledOutputs,
    top: { title: header?.title ?? program.destinations.find(item => item.entryJourney === journey.id)?.label ?? program.label,
      ...(header?.subtitle ? { subtitle: header.subtitle } : {}),
      ...(close ? { leading: close } : {}),
      trailing: topActions.flatMap(item => item.intent.kind !== "close" ? [{ ...item, intent: item.intent }] : []) },
    bottom: { ...(close ? { secondary: close } : {}), ...(primary ? { primary } : {}) },
  };
}

/** Panel grammar is checked at admission: one Header and one form/context, never discarded content. */
export function projectViewPanel(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput): ResolvedPanel {
  const canonical = presentFrame(surface, state, validate);
  if (state.view === "review" || state.view === "recovery") {
    return { frame: canonical, label: canonical.top.title, locked: state.busy || state.uncertain };
  }
  const resolved = projectView(program, journey, definition, surface, state, validate);
  const primary = resolved.bottom?.primary;
  const bottom = { ...resolved.bottom, ...(primary && canonical.bottom.primary?.state === "pending"
    ? { primary: { ...primary, state: "pending" as const } } : {}) };
  const frame = surfaceFrame({ ...canonical, content: contextContent(surface, state, canonical.content),
    top: resolved.top!, bottom });
  return { frame, label: frame.top.title, locked: state.busy || state.uncertain };
}
