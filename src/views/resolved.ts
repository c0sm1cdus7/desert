import type { View } from "./schema.ts";
import type { BankNode } from "../interaction/bank-node.ts";
import type { TopToolbar, BottomToolbar } from "../interaction/toolbar.ts";
import type { SurfaceFrame } from "../interaction/surface-frame.ts";

/** Private, validated projection. Products cannot provide runtime bindings or render callbacks. */
export type ResolvedView = {
  readonly view: View;
  readonly bindings: Readonly<Record<string, BankNode>>;
  readonly disabledOutputs: readonly string[];
  readonly top?: TopToolbar;
  readonly bottom?: BottomToolbar;
};
export type ResolvedPanel = {
  readonly frame: SurfaceFrame;
  readonly label: string;
  readonly locked: boolean;
};
