import type { Component, ComponentProps } from "svelte";
import type { Owners } from "./catalog-owner-types.ts";
import { AdapterCatalog as Admissions } from "./catalog-admissions.ts";
import type { ResolvedNode, ResolvedNodeFor } from "../interaction/resolved-node.ts";
import type { ControlNode } from "../interaction/control-nodes.ts";

type Exports<C> = C extends Component<any, infer E, any> ? E : never;
type Admission<C extends Component<any, any>> = {
  readonly props: readonly (keyof ComponentProps<C>)[];
  readonly slots: readonly (keyof ComponentProps<C>)[];
  readonly instance: readonly (keyof Exports<C>)[];
};

/** The bounded adapter gateway, not a second visual implementation or product API.
 * Props retain each owner's types. Legacy native-attribute inputs are not admitted.
 * Slots accept only composition of admitted entries, never caller HTML/snippets.
 */
export const AdapterCatalog = Admissions satisfies { readonly [K in keyof Owners]: Admission<Owners[K]> };

export type AdapterEntry = keyof typeof AdapterCatalog;
type Inputs<K extends AdapterEntry> = typeof AdapterCatalog[K]["props" | "slots"][number];
// Plain tsc sees Svelte's ambient unknown exports; svelte-check supplies the exact
// generated owner signature and verifies this narrowed instance API at build time.
type AdmittedExports<K extends AdapterEntry> = string extends keyof Exports<Owners[K]> ? Exports<Owners[K]>
  : Pick<Exports<Owners[K]>, Extract<typeof AdapterCatalog[K]["instance"][number], keyof Exports<Owners[K]>>>;
type OwnerInputs<K extends AdapterEntry> = Pick<ComponentProps<Owners[K]>, Extract<Inputs<K>, keyof ComponentProps<Owners[K]>>>;
// Runtime host capabilities are admitted only alongside the bank family that
// consumes them. The generic serialized bank entry never acquires either one.
type EntryInputs<K extends AdapterEntry> = K extends "TransientRenderer"
  ? Omit<OwnerInputs<K>, "node" | "frameIdentity"> & { node: ResolvedNodeFor<"transient">;
      frameIdentity: NonNullable<ComponentProps<Owners["NodeRenderer"]>["frameIdentity"]> }
  : K extends "ControlNodeRenderer"
    ? Omit<OwnerInputs<K>, "node" | "host"> & { node: Extract<ResolvedNode, { control: ControlNode }>;
        host: NonNullable<ComponentProps<Owners["NodeRenderer"]>["host"]> }
    : OwnerInputs<K>;
export type AdapterComponent<K extends AdapterEntry> = Component<
  EntryInputs<K>,
  AdmittedExports<K>
>;
