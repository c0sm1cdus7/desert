import type { View, ViewContent } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";

export function validateJourneyOutputs(journey: ViewJourney, owned: readonly View[], journeys: ReadonlyMap<string, ViewJourney>) {
  const seen = new Set<string>();
  for (const binding of journey.outputs) {
    const definition = owned.find(item => item.id === binding.view);
    if (!definition) throw new Error("FOREIGN_OUTPUT_VIEW");
    if (!definition.outputs?.includes(binding.output)) throw new Error("UNKNOWN_BOUND_VIEW_OUTPUT");
    const key = `${binding.view}/${binding.output}`;
    if (seen.has(key)) throw new Error("DUPLICATE_VIEW_OUTPUT_BINDING");
    seen.add(key);
    const collection = viewInputs(definition).find(port => port.kind === "collection" && port.output === binding.output);
    const widget=collection?.kind==='collection'&&collection.presentation?.kind==='summary-widget';
    const link = definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
      .find(item => item.kind === "destination-link" && item.output === binding.output);
    if (link && binding.action.kind !== "journey") throw new Error("INVALID_DESTINATION_LINK_ACTION");
    if (collection && binding.action.kind !== (widget?'journey':'select')) throw new Error("INVALID_COLLECTION_OUTPUT_ACTION");
    switch (binding.action.kind) {
      case "lock":
        if (journey.kind !== "presentation" || !definition.content.some(item => item.kind === "identity") ||
          !definition.topDock?.actions.some(action => action.output === binding.output)) throw new Error("INVALID_IDENTITY_LOCK");
        break;
      case "journey": {
        const target = journeys.get(binding.action.journey);
        if (!target) throw new Error("UNKNOWN_OUTPUT_JOURNEY");
        const browsing = target.kind === "read" || target.kind === "presentation";
        if (link && !browsing) throw new Error("INVALID_DESTINATION_LINK_ACTION");
        if (widget && !browsing) throw new Error("INVALID_WIDGET_ACTION");
        if (browsing && [definition.topDock, definition.bottomDock].some(toolbar =>
          toolbar?.actions.some(action => action.output === binding.output))) throw new Error("FORWARD_NAVIGATION_IN_TOOLBAR");
        if ((target.kind === "update" || target.kind === "action") &&
          (journey.kind !== "read" || binding.view !== journey.detailView || target.source !== journey.id)) {
          throw new Error("INVALID_VIEW_SUBJECT_EDGE");
        }
        break;
      }
      case "select":
        if (!collection || journey.kind !== "read" && !(journey.kind === "presentation" &&
          journey.collections?.some(binding => binding.input === collection.input))) throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "back":
        if ((journey.kind !== "read" && journey.kind !== "presentation") ||
          (definition.id !== journey.view && !(journey.kind === "read" && journey.presentation === "main" && definition.id === journey.detailView)) ||
          !definition.topDock?.actions.some(action => action.output === binding.output && action.icon === "back")) {
          throw new Error("INVALID_BACK_OUTPUT");
        }
        break;
      case "submit":
        if (journey.kind !== "create" && journey.kind !== "update") throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "close":
        if (journey.kind !== "create" && journey.kind !== "update" && !(journey.kind === "read" && binding.view === journey.detailView)) {
          throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        }
        // Only runtime busy/uncertain state may lock dismissal across button, Escape and scrim.
        if ([definition.topDock, definition.bottomDock].some(toolbar => toolbar?.actions.some(action =>
          action.output === binding.output && action.disabled === true))) throw new Error("AUTHORED_CLOSE_DISABLED");
    }
  }
  for (const definition of owned) {
    if (definition.outputs?.some(output => !seen.has(`${definition.id}/${output}`))) throw new Error("UNBOUND_VIEW_OUTPUT");
  }
  if ((journey.kind === "create" || journey.kind === "update") && (journey.outputs.filter(binding => binding.action.kind === "submit").length !== 1 ||
    journey.outputs.filter(binding => binding.action.kind === "close").length !== 1)) {
    throw new Error("INVALID_CREATE_OUTPUTS");
  }
  if (journey.kind === "read" && journey.outputs.filter(binding => binding.view === journey.detailView &&
    binding.action.kind === (journey.presentation === "main" ? "back" : "close")).length !== 1) {
    throw new Error("INVALID_DETAIL_OUTPUTS");
  }
  for (const definition of owned) {
    const top = definition.topDock?.actions ?? [];
    const bottom = definition.bottomDock?.actions ?? [];
    const bindingFor = (output: string) => journey.outputs.find(item => item.view === definition.id && item.output === output);
    if (bottom.length > 1 || bottom.some(item => bindingFor(item.output)?.action.kind === "close")) {
      throw new Error("UNSUPPORTED_PROGRAM_BOTTOM_TOOLBAR");
    }
    const panel = journey.kind === "create" || journey.kind === "update" || (journey.kind === "read" && journey.presentation !== "main" && definition.id === journey.detailView);
    if (panel && (bindingFor(top[0]?.output ?? "")?.action.kind !== "close" ||
      top.slice(1).some(item => bindingFor(item.output)?.action.kind === "close"))) {
      throw new Error("INVALID_PANEL_CLOSE_ACTION");
    }
    if ((journey.kind === "create" || journey.kind === "update") && bindingFor(bottom[0]?.output ?? "")?.action.kind !== "submit") {
      throw new Error("INVALID_CREATE_SUBMIT_PLACEMENT");
    }
    if (journey.kind === "read" && journey.presentation !== "main" && definition.id === journey.detailView && (top.length !== 1 || bottom.length !== 0)) {
      throw new Error("UNSUPPORTED_CONTEXT_TOOLBAR");
    }
    if (new Set([...top, ...bottom].map(item => item.output)).size !== top.length + bottom.length) {
      throw new Error("DUPLICATE_TOOLBAR_OUTPUT");
    }
    const collectionOutputs = viewInputs(definition).flatMap(port => port.kind === "collection" ? [port.output] : []);
    if ([...top, ...bottom].some(item => collectionOutputs.includes(item.output))) {
      throw new Error("CONFLICTING_VIEW_OUTPUT_PORT");
    }
    const emitted = new Set([
      ...[...top, ...bottom].map(action => action.output), ...collectionOutputs,
      ...definition.content.flatMap<ViewContent>(item => item.kind === "stack" ? item.items : [item])
        .flatMap(item => item.kind === "destination-link" ? [item.output] : []),
    ]);
    for (const output of definition.outputs ?? []) {
      if (!emitted.has(output)) throw new Error("UNREACHABLE_VIEW_OUTPUT");
    }
  }
}
