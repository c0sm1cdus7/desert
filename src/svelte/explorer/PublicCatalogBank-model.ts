import { InteractionCatalog, type PrimitiveId } from "../../interaction/catalog.ts";
import { BankVersion as version, bankNode, type BankNode } from "../../interaction/bank-node.ts";
import { surfaceFrame, type FactsContent } from "../../interaction/surface-frame.ts";
import type { PublicCatalogSurface } from "../../public-catalog/index.ts";

export type PublicBankSpecimen = Readonly<{ id: PrimitiveId; state: string;
  owner: "bank" | "control-bank"; node?: BankNode; gap?: string }>;
export type PublicBankInput = Pick<PublicCatalogSurface, "productId" | "home" | "details">;

/** Diagnostic coverage is not a capability declaration or an execution adapter. */
export function publicCatalogBankInventory(surface: PublicBankInput): readonly PublicBankSpecimen[] {
  const first = surface.details[0]!;
  const details: FactsContent = { kind: "facts", object: surface.productId, fields: ["title"],
    labels: { [`${surface.productId}.title`]: "Title" }, facts: { title: first.title } };
  return InteractionCatalog.entries.flatMap(entry => entry.states.map(state => {
    const specimen = { id: entry.id, state, owner: "bank" as const };
    const render = (node: BankNode): PublicBankSpecimen => ({ ...specimen, node: bankNode(node) });
    const gap = (reason: string): PublicBankSpecimen => ({ ...specimen, gap: reason });
    if (entry.family === "control") return { ...specimen, owner: "control-bank" as const };
    if (entry.id === "catalog.home") return { ...specimen, node: surface.home };
    if (entry.id === "catalog.detail") return { ...specimen, node: first };
    if (entry.id === "catalog.card") return { ...specimen,
      node: state === "featured" ? surface.home.featured : surface.home.groups.flatMap(group => group.items)[0]! };
    if (entry.id === "input.text" || entry.id === "input.multiline") return render({ version, kind: entry.id,
      name: `${entry.id}-${state}`, label: "Local writing example", value: state === "value" ? "A thought worth keeping" : "",
      ...(entry.id === "input.multiline" && state === "value" ? { maxLength: 280 } : {}),
      required: true, disabled: state === "disabled", ...(state === "invalid" ? { error: "Example validation message; no product validator is connected." } : {}) });
    if (entry.id === "fact") return render({ version, kind: "fact", details: { ...details,
      facts: state === "known" ? details.facts : state === "empty" ? { title: "" } : {} } });
    if (entry.id === "action") return render({ version, kind: "action", role: "secondary", action: {
      intent: { kind: "specimen", operation: "press" }, label: "Diagnostic action", icon: "open",
      state: state === "pending" ? "pending" : state === "unavailable" ? "unavailable" : "ready" } });
    if (entry.id === "availability") return render({ version, kind: "availability",
      state: state === "ready" ? "ready" : state === "unknown" ? "unknown" : "unavailable",
      label: `Example: ${state}. No controller is connected.` });
    if (entry.id === "collection") return state === "empty"
      ? gap("An empty collection's create guidance requires an installed create journey. This read-only catalog has no create operation.")
      : render({ version, kind: "collection", object: surface.productId,
        fields: ["title"], labels: details.labels, createLabel: "Create", disabled: false, loaded: true,
        selectedId: null, records: surface.details.map(detail => ({ id: detail.record, version: 1, facts: { title: detail.title } })) });
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
