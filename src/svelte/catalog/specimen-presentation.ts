import type { HumanSurface, Mutation, ValidateInput } from "../../web/types.ts";
import type { PrimitiveId } from "../../interaction/catalog.ts";
import { BankVersion as version, bankNode, type BankNode } from "../../interaction/bank-node.ts";
import { presentCollection } from "../../interaction/bank-presenters.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { surfaceFrame, type SurfaceFrame } from "../../interaction/surface-frame.ts";
import { presentFacts } from "../../interaction/fact-presentation.ts";

export type SpecimenState = { value?: string; open: boolean; locked: boolean; draft: Readonly<Record<string, string>> };
type Presentation = { nodes: BankNode[]; frame?: SurfaceFrame };

/** Isolated witness data; all composition is the installed product bank/frame grammar. */
export function presentSpecimen(id: PrimitiveId, scenario: string, surface: HumanSurface,
  state: SpecimenState, validate: ValidateInput): Presentation {
  const mutation = surface.journeys.find(journey => journey.id === surface.navigation.primaryAction) as Mutation;
  const fields = mutation.inputFields;
  const facts = Object.fromEntries(fields.map((field, index) => [field,
    index === 0 ? "An idea worth keeping" : "A quiet place to think.\nA second line, with room to breathe."]));
  const details = presentFacts(surface, mutation.object, fields, facts);
  const nodes: BankNode[] = [];
  const push = (node: BankNode) => nodes.push(bankNode(node));
  const opener = (label: string) => push({ version, kind: "action", role: "secondary", action: {
    intent: { kind: "specimen", operation: "open" }, label, icon: "open", state: "ready" } });
  const context = surfaceFrame({ version: "desert.surface-frame/6", kind: "context",
    top: { title: id === "context" ? `Context · ${scenario}` : facts[fields[0]!] },
    content: { kind: "context", details, actions: id === "context" ? [
      { destination: "specimen", label: "Action", available: scenario === "available" },
      { destination: "second-specimen", label: "Second action", available: scenario === "available" },
      { destination: "third-specimen", label: "Third action", available: scenario === "available" },
    ] : [] }, bottom: {} });
  const drawer = (frame: SurfaceFrame, label: string) => push({ version, kind: "transient", label,
    open: state.open, locked: state.locked, frame });
  if (id === "input.text" || id === "input.multiline") {
    push({ version, kind: id, name: "writing", label: "Writing", required: true,
      value: state.value ?? (scenario === "value" ? "A thought worth keeping" : ""), disabled: scenario === "disabled",
      ...(scenario === "invalid" ? { error: "Example validation error. This isolated specimen is intentionally invalid." } : {}) });
  } else if (id === "action") {
    push({ version, kind: "action", role: "primary", action: { intent: { kind: "specimen", operation: "press" },
      icon: "save", label: state.value ?? "Save", state: scenario === "pending" ? "pending" : scenario === "unavailable" ? "unavailable" : "ready" } });
  } else if (id === "availability") {
    push({ version, kind: "availability", state: scenario === "ready" ? "ready" : scenario === "unknown" ? "unknown" : "unavailable",
      label: scenario === "ready" ? "Controller ready" : scenario === "unknown" ? "Checking controller" : "Controller unavailable · writing retained" });
  } else if (id === "fact") {
    push({ version, kind: "fact", details: presentFacts(surface, mutation.object, fields.slice(0, 1),
      scenario === "known" ? facts : scenario === "empty" ? { [fields[0]!]: "" } : {}) });
  } else if (id === "collection") {
    push(presentCollection(surface, scenario === "empty" ? [] : [{ id: "visual-specimen", version: 1, facts }],
      { disabled: false, loaded: true, selectedId: null }));
    drawer(context, "Context specimen");
  } else if (id === "form") {
    const draft = { ...Object.fromEntries(fields.map(field => [field, ""])), ...(scenario === "ready" ? facts : {}), ...state.draft };
    const frame = formFrame(surface, mutation, draft, { primary: toolbarAction({ kind: "journey", journey: mutation.id }, "Save", "save",
      scenario !== "disconnected" && validate(mutation.commandId, draft)) });
    return { nodes, frame: surfaceFrame({ ...frame, kind: "specimen" }) };
  } else if (id === "context") {
    opener("Open context"); drawer(context, "Context specimen");
  } else if (id === "review") {
    return { nodes, frame: surfaceFrame({ ...reviewFrame(surface, mutation, facts, scenario === "uncertain", false, true), kind: "specimen" }) };
  } else if (id === "transient") {
    opener("Open drawer");
    drawer(surfaceFrame({ version: "desert.surface-frame/6", kind: "specimen", top: { title: "Transient specimen" }, content: details,
      bottom: state.locked ? { primary: toolbarAction({ kind: "accept" }, "Finish specimen operation", "confirm") } : {} }), "Transient specimen");
  } else if (id === "problem") {
    opener("Open message");
    push({ version, kind: "problem", open: state.open, title: scenario === "warning" ? "No matching record" : "The controller did not respond",
      description: "Your writing has not changed. Close this message to continue.",
      severity: scenario === "warning" ? "warning" : "error", locked: false });
  }
  return { nodes };
}
