// One witness per placement of StackItem: a framed content kind and a surface kind.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const StackItemSpecimens = [
  { state: "content", props: { kind: "control.tag", children: createRawSnippet(() => ({ render: () => "<span>Travel</span>" })) } },
  { state: "surface", props: { kind: "action", children: createRawSnippet(() => ({ render: () => "<span>Archive</span>" })) } },
] as const satisfies readonly CatalogSpecimen<"stack-item">[];
