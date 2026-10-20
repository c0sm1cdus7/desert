import type { Component } from "svelte";
import type { PrimitiveId, InputPrimitive } from "../interaction/catalog.ts";
import type { ControlNode, ControlEvent } from "../interaction/control-nodes.ts";
import type { SurfaceFrame, FrameContent, FactsContent, Destination } from "../interaction/surface-frame.ts";
import type { ToolbarAction, TopToolbar } from "../interaction/toolbar.ts";
import type { SurfaceIntent } from "../interaction/intent.ts";
import type { BankNodeFor } from "../interaction/bank-node.ts";
import type { BankEvent } from "../interaction/bank-events.ts";
import type { LocalFileHost } from "./controls/file-host.ts";
import type { ActionElementProps } from "./action-adapter.ts";
import type { InputMask } from "../interaction/input-mask.ts";

export type ControlKind = ControlNode["kind"];
export type ControlEventFor<K extends ControlKind> = Extract<ControlEvent, { kind: `${K}.${string}` }>;
export type ControlProps<K extends ControlKind> = { node: Extract<ControlNode, { kind: K }> } &
  ([ControlEventFor<K>] extends [never] ? {} : { onevent: (event: ControlEventFor<K>) => void }) &
  (K extends "files" ? { host: LocalFileHost } : {});

type Invoke = (intent: SurfaceIntent) => void;
type Edit = (name: string, value: string) => void;
type FactsProps = Pick<FactsContent, "fields" | "facts" | "object" | "labels" | "multiline">;
type InputProps<P extends InputPrimitive> = {
  primitive: P; label: string; value?: string; required?: boolean; identity?: string; maxLength?: number | undefined;
  invalid?: boolean; error?: string | undefined; disabled?: boolean; onchange: (value: string) => void;
};
type ControlRendererProps = { [K in ControlKind as `control.${K}`]: ControlProps<K> };

/** Private web adapter bindings, never accepted as bank descriptors. BankRenderer alone resolves these. */
export type WebRendererProps = ControlRendererProps & {
  "catalog.card": { node: BankNodeFor<"catalog.card">; onevent: (event: BankEvent) => void };
  "catalog.home": { node: BankNodeFor<"catalog.home">; onevent: (event: BankEvent) => void };
  "catalog.detail": { node: BankNodeFor<"catalog.detail">; onevent: (event: BankEvent) => void };
  "input.text": InputProps<"input.text"> & { mask?: InputMask | undefined };
  "input.multiline": InputProps<"input.multiline">;
  fact: FactsProps;
  action: Pick<ToolbarAction, "label" | "icon"> & {
    state?: ToolbarAction["state"]; emphasis?: "primary" | "secondary";
    onclick?: () => void; type?: "button" | "submit"; elementProps?: ActionElementProps | undefined;
  };
  availability: NonNullable<TopToolbar["availability"]>;
  collection: { node: BankNodeFor<"collection">; select: (id: string) => void };
  form: { fields: Extract<FrameContent, { kind: "form" }>["fields"]; edit: Edit };
  context: FactsProps & { actions: readonly (Pick<Destination, "label" | "available"> & {
    id: Destination["destination"]; invoke: () => void;
  })[] };
  review: Extract<FrameContent, { kind: "review" }>;
  transient: {
    label: string; open: boolean; locked?: boolean; onclose: () => void; onclosed?: () => void;
    frame: SurfaceFrame; invoke: Invoke; edit?: Edit;
  };
  problem: {
    open: boolean; title: TopToolbar["title"]; description: Extract<FrameContent, { kind: "message" }>["text"];
    close: () => void; severity?: "error" | "warning"; locked?: boolean;
  };
};

/** Inventory and props are both checked; a component for another entry is not interchangeable. */
export type WebRendererBank = { readonly [K in PrimitiveId]: Component<WebRendererProps[K]> };
