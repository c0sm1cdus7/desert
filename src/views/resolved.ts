import type { View, ViewContent, ViewHeader } from "./schema.ts";
import type { BankNode } from "../interaction/bank-node.ts";
import type { TopToolbar, BottomToolbar } from "../interaction/toolbar.ts";
import type { FrameContent, SurfaceFrame } from "../interaction/surface-frame.ts";
import type { AttentionSnapshot } from "../web/client/attention-feed.ts";
import type { RelatedSelectionSnapshot } from "../interaction/related-selection.ts";

/** Private, validated projection. Products cannot provide runtime bindings or render callbacks. */
export type ResolvedViewDefinition = Omit<View, "content"> & {
  readonly content: readonly (Exclude<ViewContent, ViewHeader | { readonly kind: "system-status" }>
    | (Omit<ViewHeader, "title"> & { readonly title: string }))[];
};
export type ResolvedView = {
  readonly view: ResolvedViewDefinition;
  readonly bindings: Readonly<Record<string, BankNode>>;
  readonly pending?: Readonly<Record<string, Extract<FrameContent, { kind: "message" }>>>;
  readonly disabledOutputs: readonly string[];
  readonly connection?: { readonly state: 'loading' | 'ready' | 'offline'; readonly label: string };
  readonly attention?: AttentionSnapshot;
  readonly relations?: RelatedSelectionSnapshot;
  readonly top?: TopToolbar;
  readonly bottom?: BottomToolbar;
};
export type ResolvedPanel = {
  readonly presentation?: "transient";
  readonly frame: SurfaceFrame;
  readonly readingIdentity?: object;
  readonly body?: ResolvedView;
  readonly label: string;
  readonly locked: boolean;
};
