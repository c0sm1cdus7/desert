import type { HumanSurface, ValidateInput } from "../../../../web/types.ts";
import type { ReadModelScope } from "../../../../web/client/model-scope.ts";
import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
import { ResolvedNodeVersion as version, resolvedNode, type ResolvedNode } from "../../../../interaction/resolved-node.ts";
import { presentCollection } from "../../../../interaction/node-presenters.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../../../interaction/frame-presenters.ts";
import { surfaceFrame, type SurfaceFrame } from "../../../../interaction/surface-frame.ts";
import { presentFacts } from "../../../../interaction/fact-presentation.ts";

export type SpecimenState = { value?: string; open: boolean; locked: boolean; draft: Readonly<Record<string, string>> };
type Presentation = { nodes: ResolvedNode[]; frame?: SurfaceFrame };

/** Isolated witness data; all composition is the installed product bank/frame grammar. */
export function presentSpecimen(id: ResolvedNodeId, scenario: string, surface: HumanSurface,
  state: SpecimenState, validate: ValidateInput, scope: ReadModelScope): Presentation {
  const mutation = scope.primaryCreation;
  if (!mutation) throw new Error("SPECIMEN_CREATION_REQUIRED");
  const fields = mutation.inputFields;
  const facts = Object.fromEntries(fields.map((field, index) => [field,
    index === 0 ? "An idea worth keeping" : "A quiet place to think.\nA second line, with room to breathe."]));
  const details = presentFacts(surface, mutation.object, fields, facts);
  const nodes: ResolvedNode[] = [];
  const push = (node: ResolvedNode) => nodes.push(resolvedNode(node));
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
      helper: "Write a short thought. This helper belongs to the input, not the surrounding page.",
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
    if (scenario === "state-summary") push({ version, kind: "collection", object: "task-specimen",
      fields: ["title", "status"], labels: { "task-specimen.title": "Title", "task-specimen.status": "Status" },
      valueLabels: { status: { open: "Open", completed: "Completed" } },
      records: [{ id: "open-task", version: 1, facts: { title: "Review the shared visual bank", status: "open" } },
        { id: "done-task", version: 1, facts: { title: "Check a longer title that wraps while keeping its subtitle and trailing chevron aligned", status: "completed" } }],
      disabled: false, loaded: true, selectedId: null });
    else if (scenario === "media-grid" || scenario === "media-list") push({ version, kind: "collection", object: "media-specimen",
      fields: ["image"], labels: { "media-specimen.image": "Image" },
      presentation: { kind: "media-grid", image: "image", layout: scenario === "media-list" ? "list" : "grid" },
      records: [1, 2, 3].map(index => ({ id: `image-${index}`, version: 1, facts: { image: "/bank-image.svg" } })),
      disabled: false, loaded: true, selectedId: null });
    else if (scenario === "collection-grid") push({ version, kind: "collection", object: "collection-specimen",
      fields: ["title"], labels: { "collection-specimen.title": "Title" },
      presentation: { kind: "collection-grid", title: "title", previews: [{ id: "travel", count: 3,
        media: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" } }, { id: "empty", count: 0 }] },
      records: [{ id: "travel", version: 1, facts: { title: "Travel" } }, { id: "empty", version: 1, facts: { title: "Research" } }],
      disabled: false, loaded: true, selectedId: null });
    else push(presentCollection(surface, scenario === "empty" ? [] : [{ id: "visual-specimen", version: 1, facts }],
      { disabled: false, loaded: true, selectedId: null }, scope));
    drawer(context, "Context specimen");
  } else if (id === "form") {
    const draft = { ...Object.fromEntries(fields.map(field => [field, ""])), ...(scenario === "ready" ? facts : {}), ...state.draft };
    const frame = formFrame(surface, mutation, draft, { primary: toolbarAction({ kind: "journey", journey: mutation.id }, "Save", "save",
      scenario !== "disconnected" && validate(mutation.commandId, draft)) });
    return { nodes, frame: surfaceFrame({ ...frame, kind: "specimen" }) };
  } else if (id === "context") {
    if (scenario === "media-object") {
      opener("Open media object");
      drawer(surfaceFrame({ version: "desert.surface-frame/6", kind: "context", top: { title: "Image" }, bottom: {},
        content: { kind: "context", actions: [], presentation: { kind: "media-object", media: "image", description: "description" },
          details: { kind: "facts", object: "media-specimen", fields: ["image", "description"], images: ["image"], multiline: ["description"],
            labels: { "media-specimen.image": "Image", "media-specimen.description": "Description" },
            facts: { image: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" },
              description: "A quiet landscape. Original proportions are preserved." } } } }), "Media object specimen");
    } else { opener("Open context"); drawer(context, "Context specimen"); }
  } else if (id === "review") {
    return { nodes, frame: surfaceFrame({ ...reviewFrame(surface, mutation, facts,
      scenario === "uncertain" ? { kind: "recovery", method: "same-confirmation" } : { kind: "review" }, false, true), kind: "specimen" }) };
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
