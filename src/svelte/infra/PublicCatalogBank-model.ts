import { ResolvedNodes, type ResolvedNodeId } from "../../interaction/catalog.ts";
import { ResolvedNodeVersion as version, resolvedNode, type ResolvedNode } from "../../interaction/resolved-node.ts";
import { surfaceFrame, type FactsContent } from "../../interaction/surface-frame.ts";
import type { PublicCatalogSurface } from "../../public-catalog/index.ts";

export type PublicBankSpecimen = Readonly<{ id: ResolvedNodeId; state: string;
  owner: "bank" | "control-bank"; node?: ResolvedNode; gap?: string }>;
export type PublicBankInput = Pick<PublicCatalogSurface, "productId" | "home" | "details">;

/** Diagnostic coverage is not a capability declaration or an execution adapter. */
export function publicCatalogBankInventory(surface: PublicBankInput): readonly PublicBankSpecimen[] {
  const first = surface.details[0]!;
  const details: FactsContent = { kind: "facts", object: surface.productId, fields: ["title"],
    labels: { [`${surface.productId}.title`]: "Title" }, facts: { title: first.title } };
  return ResolvedNodes.entries.flatMap(entry => entry.states.map(state => {
    const specimen = { id: entry.id, state, owner: "bank" as const };
    const render = (node: ResolvedNode): PublicBankSpecimen => ({ ...specimen, node: resolvedNode(node) });
    const gap = (reason: string): PublicBankSpecimen => ({ ...specimen, gap: reason });
    if (entry.family === "control") return { ...specimen, owner: "control-bank" as const };
    if (entry.id === "catalog.home") return { ...specimen, node: surface.home };
    if (entry.id === "catalog.detail") return { ...specimen, node: first };
    if (entry.id === "catalog.card") return { ...specimen,
      node: state === "featured" ? surface.home.featured : surface.home.groups.flatMap(group => group.items)[0]! };
    if (entry.id === "input.text" || entry.id === "input.multiline") return render({ version, kind: entry.id,
      name: `${entry.id}-${state}`, label: "Local writing example", value: state === "value" || state === "offline" ? "A thought worth keeping" : "",
      helper: state === "offline" ? "Keep editing this local draft while offline. Saving requires reconnection."
        : state === "loading" ? "Waiting for the controller to provide this operation’s inputs."
        : "Write a short thought. This helper belongs to the input, not the surrounding page.",
      ...(entry.id === "input.multiline" && state === "value" ? { maxLength: 280 } : {}),
      required: true, disabled: state === "disabled" || state === "loading", ...(state === "invalid" ? { error: "Example validation message; no product validator is connected." } : {}) });
    if (entry.id === "fact") return render({ version, kind: "fact", details: { ...details,
      facts: state === "known" ? details.facts : state === "empty" ? { title: "" } : {} } });
    if (entry.id === "action") return render({ version, kind: "action", role: "secondary", action: {
      intent: { kind: "specimen", operation: "press" }, label: "Diagnostic action", icon: "open",
      state: state === "pending" || state === "loading" ? "pending" : state === "unavailable" || state === "offline" ? "unavailable" : "ready",
      ...(state === "loading" ? {reason:"Connecting to the controller…"} : state === "offline" ? {reason:"Offline. Reconnect to use this action."} : {}) } });
    if (entry.id === "availability") return render({ version, kind: "availability",
      state: state === "ready" ? "ready" : state === "unknown" ? "unknown" : "unavailable",
      label: `Example: ${state}. No controller is connected.` });
    if (entry.id === "collection" && (state === "loading" || state === "offline")) return render({version,kind:"collection",object:surface.productId,
      fields:["title"],labels:details.labels,disabled:true,loaded:state==="offline",connection:state,selectedId:null,
      records:state==="loading"?[]:surface.details.map(detail=>({id:detail.record,version:1,facts:{title:detail.title}}))});
    if (entry.id === "collection" && state === "state-summary") return render({ version, kind: "collection", object: "task-specimen",
      fields: ["title", "status"], labels: { "task-specimen.title": "Title", "task-specimen.status": "Status" },
      valueLabels: { status: { open: "Open", completed: "Completed" } }, loaded: true, disabled: false, selectedId: null,
      records: [{ id: "open", version: 1, facts: { title: "Review the visual bank", status: "open" } },
        { id: "done", version: 1, facts: { title: "Verify grouped rows", status: "completed" } }] });
    if (entry.id === "collection" && (state === "media-grid" || state === "media-list")) return render({ version, kind: "collection", object: "media-specimen",
      fields: ["image"], labels: { "media-specimen.image": "Image" }, loaded: true, disabled: false, selectedId: null,
      presentation: { kind: "media-grid", image: "image", layout: state === "media-list" ? "list" : "grid" },
      records: [1, 2, 3].map(index => ({ id: `image-${index}`, version: 1, facts: { image: "/bank-image.svg" } })) });
    if (entry.id === "collection" && state === "collection-grid") return render({ version, kind: "collection", object: "collection-specimen",
      fields: ["title"], labels: { "collection-specimen.title": "Title" }, loaded: true, disabled: false, selectedId: null,
      presentation: { kind: "collection-grid", title: "title", previews: [{ id: "travel", count: 3,
        media: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" } }, { id: "empty", count: 0 }] },
      records: [{ id: "travel", version: 1, facts: { title: "Travel" } }, { id: "empty", version: 1, facts: { title: "Research" } }] });
    if (entry.id === "collection") return state === "empty"
      ? gap("An empty collection's create guidance requires an installed create journey. This read-only catalog has no create operation.")
      : render({ version, kind: "collection", object: surface.productId,
        fields: ["title"], labels: details.labels, createLabel: "Create", disabled: false, loaded: true,
        selectedId: null, records: surface.details.map(detail => ({ id: detail.record, version: 1, facts: { title: detail.title } })) });
    if (entry.id === "context" && state === "media-object") return render({ version, kind: "context", content: {
      kind: "context", actions: [], presentation: { kind: "media-object", media: "image", description: "description" },
      details: { kind: "facts", object: "media-specimen", fields: ["image", "description"], images: ["image"], multiline: ["description"],
        labels: { "media-specimen.image": "Image", "media-specimen.description": "Description" },
        facts: { image: { kind: "asset", reference: "a7000000-0000-4000-8000-000000000001" }, description: "An isolated image example. Original proportions are preserved." } } } });
    if (entry.id === "context") return state === "available"
      ? render({ version, kind: "context", content: { kind: "context", details, actions: [] } })
      : gap("Journey availability requires actual contract-derived offers. This public catalog supplies read-only context, not a controller.");
    if (entry.id === "form") return gap("A product form requires its command schema and submit journey. This public catalog has neither; local writing controls are shown separately.");
    if (entry.id === "review") return gap("Prepared effects and uncertain acceptance require an actual admitted operation. No acceptance or recovery is simulated here.");
    if (entry.id === "transient") return render({ version, kind: "transient", label: "Diagnostic transient", open: false,
      locked: state === "locked", frame: surfaceFrame({ version: "desert.surface-frame/6", kind: "message",
        top: { title: "Isolated transient" }, content: { kind: "message", text: state === "locked"
          ? "This diagnostic lock releases after three seconds. No product operation is running."
          : "Close returns to the component bank. No product state changes." }, bottom: {} }) });
    if (entry.id === "problem") return render({ version, kind: "problem", open: false, locked: false,
      title: state === "warning" ? "Example warning" : "Example error", severity: state === "warning" ? "warning" : "error",
      description: "An isolated message example. No product request failed." });
    throw new Error(`PUBLIC_BANK_COVERAGE_REQUIRED:${specimen.id}:${state}`);
  }));
}
