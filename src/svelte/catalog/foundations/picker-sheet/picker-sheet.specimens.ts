// One witness of PickerSheet per state: an open sheet with its close toolbar, and one whose content brings its own toolbar.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const PickerSheetSpecimens = [
  { state: "default", props: { open: true, label: "Layout", triggerId: "picker-sheet-specimen-trigger",
    children: createRawSnippet(() => ({ render: () => "<p>Overview</p>" })) } },
  { state: "content-toolbar", props: { open: true, label: "Due date", triggerId: "picker-sheet-specimen-trigger", contentToolbar: true,
    children: createRawSnippet(() => ({ render: () => "<p>October 2026</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"picker-sheet">[];
