import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { closedObject, nonemptyText } from "./node-schema.ts";
import type { ResolvedNode } from "../interaction/resolved-node.ts";
import { ControlEventSchema } from "../interaction/control-nodes.ts";
import type { Face } from "../interaction/face.ts";

/** Semantic capabilities only. Pointer, keyboard and haptics belong to platform adapters. */
export const RendererRequirementsSchema = closedObject({
  protocol: Type.Literal("desert.renderer-requirements/1"), bank: Type.Literal("desert.bank-node/1"),
  nodes: Type.Array(nonemptyText(), { uniqueItems: true }),
  events: Type.Array(nonemptyText(), { uniqueItems: true }),
  features: Type.Array(nonemptyText(), { uniqueItems: true }),
});
export type RendererRequirements = Frozen<Static<typeof RendererRequirementsSchema>>;
export const PublicCatalogRequirements = freezeDeep({
  protocol: "desert.renderer-requirements/1", bank: "desert.bank-node/1",
  nodes: ["catalog.card", "catalog.home", "catalog.detail"],
  events: ["catalog.open", "catalog.back", "catalog.search"],
  features: ["catalog.browse", "catalog.search.local", "assets.logical"],
} satisfies Static<typeof RendererRequirementsSchema>);

/** A host must supply truthful capabilities; this check does not install any renderer. */
export function requirePublicCatalogCapabilities(candidate: unknown, requirements: RendererRequirements = PublicCatalogRequirements): void {
  const capabilities = jsonSnapshot(candidate);
  if (!Check(RendererRequirementsSchema, capabilities)) throw new Error("INVALID_RENDERER_CAPABILITIES");
  for (const category of ["nodes", "events", "features"] as const) {
    for (const required of requirements[category]) {
      if (!capabilities[category].includes(required)) throw new Error(`MISSING_RENDERER_CAPABILITY:${category}:${required}`);
    }
  }
}

function requireFace(features: Set<string>, face: Face | undefined): void {
  if (face?.kind === "symbol" || face?.kind === "flag") features.add(`face.${face.kind}`);
}

/** Derive local workbench needs from the same canonical control event grammar. */
export function publicCatalogRequirements(nodes: readonly ResolvedNode[] = [], gallery = false): RendererRequirements {
  if (nodes.length === 0 && !gallery) return PublicCatalogRequirements;
  const nodeKinds = new Set<string>(PublicCatalogRequirements.nodes);
  const events = new Set<string>(PublicCatalogRequirements.events);
  const features = new Set<string>([...PublicCatalogRequirements.features, ...(nodes.length ? ["bank.local-draft"] : []),
    ...(gallery ? ['media.gallery'] : [])]);
  for (const node of nodes) {
    nodeKinds.add(node.kind);
    if (node.kind === "input.text" || node.kind === "input.multiline") events.add("input.change");
    if (node.kind === "input.multiline" && node.maxLength !== undefined) features.add("input.length-hint");
    if (node.kind === "input.text" && node.mask || node.kind === "control.money") features.add("input.mask.decimal");
    const options = node.kind === "control.select" ? node.control.options :
      node.kind === "control.money" ? node.control.currencies : [];
    for (const { face } of options) if (face) {
      features.add("selection.faces");
      requireFace(features, face);
    }
    if (node.kind === "transient") requireFace(features, node.frame.top.face);
    if ("control" in node) {
      for (const schema of ControlEventSchema.anyOf) {
        const kind = schema.properties.kind.const;
        if (kind.startsWith(`${node.control.kind}.`)) events.add(kind);
      }
    }
  }
  return freezeDeep({ ...PublicCatalogRequirements, nodes: [...nodeKinds], events: [...events],
    features: [...features] });
}
