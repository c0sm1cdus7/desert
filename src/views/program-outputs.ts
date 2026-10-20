import type { View } from "./schema.ts";
import type { ViewJourney } from "./program-schema.ts";
import { viewInputs } from "./ports.ts";

export function validateJourneyOutputs(journey: ViewJourney, owned: readonly View[], journeys: ReadonlySet<string>) {
  const seen = new Set<string>();
  for (const binding of journey.outputs) {
    const definition = owned.find(item => item.id === binding.view);
    if (!definition) throw new Error("FOREIGN_OUTPUT_VIEW");
    if (!definition.outputs?.includes(binding.output)) throw new Error("UNKNOWN_BOUND_VIEW_OUTPUT");
    const key = `${binding.view}/${binding.output}`;
    if (seen.has(key)) throw new Error("DUPLICATE_VIEW_OUTPUT_BINDING");
    seen.add(key);
    const collection = viewInputs(definition).find(port => port.kind === "collection" && port.output === binding.output);
    if (collection && binding.action.kind !== "select") throw new Error("INVALID_COLLECTION_OUTPUT_ACTION");
    switch (binding.action.kind) {
      case "journey":
        if (!journeys.has(binding.action.journey)) throw new Error("UNKNOWN_OUTPUT_JOURNEY");
        break;
      case "select":
        if (journey.kind !== "read" || !collection) throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "submit":
        if (journey.kind !== "create") throw new Error("INVALID_VIEW_OUTPUT_ACTION");
        break;
      case "close":
        if (journey.kind !== "create" && !(journey.kind === "read" && binding.view === journey.detailView)) {
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
  if (journey.kind === "create" && (journey.outputs.filter(binding => binding.action.kind === "submit").length !== 1 ||
    journey.outputs.filter(binding => binding.action.kind === "close").length !== 1)) {
    throw new Error("INVALID_CREATE_OUTPUTS");
  }
  if (journey.kind === "read" && journey.outputs.filter(binding => binding.action.kind === "close").length !== 1) {
    throw new Error("INVALID_DETAIL_OUTPUTS");
  }
  for (const definition of owned) {
    const top = definition.topDock?.actions ?? [];
    const bottom = definition.bottomDock?.actions ?? [];
    const bindingFor = (output: string) => journey.outputs.find(item => item.view === definition.id && item.output === output);
    if (bottom.length > 1 || bottom.some(item => bindingFor(item.output)?.action.kind === "close")) {
      throw new Error("UNSUPPORTED_PROGRAM_BOTTOM_TOOLBAR");
    }
    const panel = journey.kind === "create" || (journey.kind === "read" && definition.id === journey.detailView);
    if (panel && (bindingFor(top[0]?.output ?? "")?.action.kind !== "close" ||
      top.slice(1).some(item => bindingFor(item.output)?.action.kind === "close"))) {
      throw new Error("INVALID_PANEL_CLOSE_ACTION");
    }
    if (journey.kind === "create" && bindingFor(bottom[0]?.output ?? "")?.action.kind !== "submit") {
      throw new Error("INVALID_CREATE_SUBMIT_PLACEMENT");
    }
    if (journey.kind === "read" && definition.id === journey.detailView && (top.length !== 1 || bottom.length !== 0)) {
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
    ]);
    for (const output of definition.outputs ?? []) {
      if (!emitted.has(output)) throw new Error("UNREACHABLE_VIEW_OUTPUT");
    }
  }
}
