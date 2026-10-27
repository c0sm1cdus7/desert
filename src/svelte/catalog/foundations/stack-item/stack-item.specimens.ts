// One witness per placement of StackItem: a framed content kind and a surface kind.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const StackItemSpecimens = [
  { state: "default", variants: { placement: "content" }, props: { placement: "content", kind: "control.tag",
    children: createRawSnippet(() => ({ render: () => "<span>Travel</span>" })) } },
  { state: "default", variants: { placement: "surface" }, props: { placement: "surface", kind: "action",
    children: createRawSnippet(() => ({ render: () => "<span>Archive</span>" })) } },
] as const satisfies readonly CatalogSpecimen<"stack-item">[];
