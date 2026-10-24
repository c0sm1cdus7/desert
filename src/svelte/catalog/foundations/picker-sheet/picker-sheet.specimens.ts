// One witness of PickerSheet: an open sheet with its close toolbar.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const PickerSheetSpecimens = [
  { state: "default", props: { open: true, label: "Layout", triggerId: "picker-sheet-specimen-trigger",
    children: createRawSnippet(() => ({ render: () => "<p>Overview</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"picker-sheet">[];
