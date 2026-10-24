import type { Component } from "svelte";
import type { ResolvedNodeId } from "../interaction/catalog.ts";
import type { ControlNode, ControlEvent } from "../interaction/control-nodes.ts";
import type { SurfaceFrame, FrameContent, FactsContent, Destination } from "../interaction/surface-frame.ts";
import type { TopToolbar } from "../interaction/toolbar.ts";
import type { SurfaceIntent } from "../interaction/intent.ts";
import type { ResolvedNode, ResolvedNodeFor } from "../interaction/resolved-node.ts";
import type { NodeEvent } from "../interaction/node-events.ts";
import type { LocalFileHost } from "./infra/file-host.ts";
import type { Disclosure } from "./infra/disclosure.ts";
import type { CatalogProps } from "./catalog/types.d.ts";
import { freezeDeep } from "../json.ts";
import type { FormControlEvent } from "../interaction/form-control-event.ts";

/** Private dispatcher inputs; public authoring only supplies serializable ResolvedNode. */
export type NodeRendererProps = {
  node: ResolvedNode; onevent?: (event: NodeEvent) => void; host?: LocalFileHost;
  actionDisclosure?: Disclosure; frameIdentity?: object;
};

export type ControlKind = ControlNode["kind"];
export type ControlEventFor<K extends ControlKind> = Extract<ControlEvent, { kind: `${K}.${string}` | (K extends 'labels' ? `reference.${string}` : never) }>;
export type ControlProps<K extends ControlKind> = { node: Extract<ControlNode, { kind: K }> } &
  ([ControlEventFor<K>] extends [never] ? {} : { onevent: (event: ControlEventFor<K>) => void }) &
  (K extends "files" ? { host: LocalFileHost } : {});

type Invoke = (intent: SurfaceIntent) => void;
type Edit = (name: string, value: string) => void;
type FactsProps = Pick<FactsContent, "fields" | "facts" | "object" | "labels" | "multiline" | "images" | "tags" | "references">;
type ControlRendererProps = { [K in ControlKind as `control.${K}`]: ControlProps<K> };

/** Private web adapter bindings, never accepted as bank descriptors. NodeRenderer alone resolves these. */
export type NodeRendererInputs = ControlRendererProps & {
  "catalog.card": { node: ResolvedNodeFor<"catalog.card">; onevent: (event: NodeEvent) => void };
  "catalog.home": { node: ResolvedNodeFor<"catalog.home">; onevent: (event: NodeEvent) => void };
  "catalog.detail": { node: ResolvedNodeFor<"catalog.detail">; onevent: (event: NodeEvent) => void };
  "input.text": Extract<CatalogProps<"field">, { primitive: "input.text" }>;
  "input.multiline": Extract<CatalogProps<"field">, { primitive: "input.multiline" }>;
  fact: FactsProps;
  action: CatalogProps<"action">;
  availability: NonNullable<TopToolbar["availability"]>;
  collection: { node: ResolvedNodeFor<"collection">; select: (id: string) => void };
  form: { fields: Extract<FrameContent, { kind: "form" }>["fields"]; edit: Edit; controlEvent: (event: FormControlEvent) => void };
  context: FactsProps & { attention?:Extract<FrameContent,{kind:'context'}>['attention']; presentation?: Extract<FrameContent, { kind: "context" }>["presentation"]; selectors?: Extract<FrameContent, { kind: "context" }>["selectors"]; onselect?: (journey: string) => void; actions: readonly (Pick<Destination, "label" | "available"> & {
    id: Destination["destination"]; invoke: () => void;
  })[] };
  review: Extract<FrameContent, { kind: "review" }>;
  transient: {
    label: string; open: boolean; locked?: boolean; onclose: () => void; onclosed?: () => void;
    frame: SurfaceFrame; invoke: Invoke; edit?: Edit; frameIdentity?: object | undefined; controlEvent?: ((event: FormControlEvent) => void) | undefined;
  };
  problem: {
    open: boolean; title: TopToolbar["title"]; description: Extract<FrameContent, { kind: "message" }>["text"];
    close: () => void; severity?: "error" | "warning"; locked?: boolean;
  };
};

/** Inventory and props are both checked; a component for another entry is not interchangeable. */
export type NodeRendererTable = { readonly [K in ResolvedNodeId]: Component<NodeRendererInputs[K]> };

/** Only these private host channels may bypass serializable node data. */
export const DispatcherCapabilities = freezeDeep({
  action: { property: "disclosure", input: "actionDisclosure", required: false },
  transient: { property: "frameIdentity", input: "frameIdentity", required: false },
  "control.files": { property: "host", input: "host", required: true },
} as const satisfies { [K in ResolvedNodeId]?: {
  property: keyof NodeRendererInputs[K]; input: keyof NodeRendererProps; required: boolean;
} });
