import type { HumanSurface, ValidateInput } from "../types.ts";
import type { BankEvent } from "../../interaction/bank-events.ts";
import { bankEvent } from "../../interaction/bank-events.ts";
import { compileViewProgram } from "../../views/program.ts";
import { projectView, projectViewPanel } from "./view-projection.ts";
import { humanProduct } from "./model.ts";

/** Nonvisual interpreter; the installed controller remains the only operation executor. */
export function viewProgramModel(input: unknown, surface: HumanSurface, validate: ValidateInput) {
  const program = compileViewProgram(input, surface);
  const model = humanProduct(surface, validate, { reading: false });
  let destinationId = program.entry;
  let current = model.snapshot();
  let creating = false;
  const listeners = new Set<() => void>();
  const destination = () => program.destinations.find(item => item.id === destinationId)!;
  const journeyFor = (id: string) => program.journeys.find(item => item.id === id)!;
  const definition = (id: string) => program.views.find(item => item.id === id)!;
  const read = program.journeys.find(item => item.kind === "read")!;
  const create = program.journeys.find(item => item.kind === "create")!;
  const notify = () => { for (const listener of listeners) listener(); };
  const unsubscribe = model.subscribe(next => {
    current = next;
    if (creating && next.view === "detail") {
      creating = false;
      destinationId = program.destinations.find(item => item.entryJourney === read.id)!.id;
    }
    if (next.view === "list") creating = false;
    notify();
  });
  function snapshot() {
    const active = journeyFor(destination().entryJourney);
    const main = definition(active.view);
    const panelJourney = current.view === "create" || current.view === "review" || current.view === "recovery"
      ? create : current.view === "detail" && active.kind === "read" ? read : null;
    const panelView = panelJourney?.kind === "read" ? definition(panelJourney.detailView)
      : panelJourney ? definition(panelJourney.view) : null;
    return { program, activeDestination: destinationId,
      resolved: projectView(program, active, main, surface, current, validate),
      panel: panelJourney && panelView ? projectViewPanel(program, panelJourney, panelView, surface, current, validate) : null,
      error: current.error, uncertain: current.uncertain, state: current };
  }
  function navigate(id: string) {
    if (!program.navigation.includes(id)) throw new Error("UNKNOWN_VIEW_DESTINATION");
    if (current.busy || current.uncertain) return;
    model.close();
    if (current.view === "detail") model.back();
    destinationId = id;
    model.setReading(journeyFor(destination().entryJourney).kind === "read");
    notify();
  }
  function startJourney(id: string) {
    const target = journeyFor(id);
    if (!target) throw new Error("UNKNOWN_VIEW_JOURNEY");
    if (target.kind === "create") {
      model.setReading(true);
      model.create();
      creating = current.view === "create";
    } else {
      const next = program.destinations.find(item => item.entryJourney === id);
      if (!next) throw new Error("UNKNOWN_VIEW_DESTINATION");
      navigate(next.id);
    }
  }
  function event(value: BankEvent) {
    const event = bankEvent(value);
    if (event.kind === "input.change") {
      if (current.view === "create" && !current.busy && !current.uncertain) {
        if (!model.primary.inputFields.includes(event.name)) throw new Error("INVALID_VIEW_INPUT");
        model.edit(event.name, event.value);
      }
      return;
    }
    if (event.kind === "problem.close") { model.dismissError(); return; }
    if (event.kind === "transient.closed") return;
    if (event.kind === "transient.close") { model.close(); return; }
    if (event.kind !== "surface.invoke") throw new Error("INVALID_VIEW_EVENT");
    const intent = event.intent;
    if (intent.kind === "close") { model.close(); return; }
    if (intent.kind === "back") { model.back(); return; }
    if (intent.kind === "accept") {
      if (current.view !== "review" && current.view !== "recovery") throw new Error("INVALID_VIEW_EVENT");
      void model.accept(); return;
    }
    if (intent.kind === "recover") {
      if (current.view !== "recovery") throw new Error("INVALID_VIEW_EVENT");
      void model.recover(); return;
    }
    if (intent.kind === "journey") {
      if (current.view !== "create" || intent.journey !== create.id) throw new Error("INVALID_VIEW_EVENT");
      const submit = create.outputs.find(binding => binding.action.kind === "submit")!;
      dispatchOutput(submit.view, submit.output);
      return;
    }
    if (intent.kind !== "view.output") throw new Error("INVALID_VIEW_EVENT");
    dispatchOutput(intent.view, intent.output, intent.recordId);
  }
  function dispatchOutput(view: string, output: string, recordId?: string) {
    const active = journeyFor(destination().entryJourney);
    const owner = view === active.view ? active :
      current.view === "create" && view === create.view ? create :
      current.view === "detail" && active.kind === "read" && read.kind === "read" && view === read.detailView ? read : undefined;
    const binding = owner?.outputs.find(item => item.view === view && item.output === output);
    if (!binding) throw new Error("UNKNOWN_VIEW_OUTPUT");
    if (binding.action.kind !== "select" && recordId !== undefined) throw new Error("INVALID_VIEW_OUTPUT_PAYLOAD");
    if (current.busy || current.uncertain) return;
    if (projectView(program, owner!, definition(view), surface, current, validate).disabledOutputs.includes(output)) return;
    switch (binding.action.kind) {
      case "journey": startJourney(binding.action.journey); break;
      case "select":
        if (!recordId || !current.records.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
        void model.select(recordId); break;
      case "submit": void model.invoke(model.primary); break;
      case "close": model.close(); break;
    }
  }
  return {
    snapshot, event, navigate,
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    async start(invitation?: string) {
      model.setReading(journeyFor(destination().entryJourney).kind === "read");
      await model.start(invitation);
    },
    stop() { unsubscribe(); model.stop(); listeners.clear(); },
  };
}
