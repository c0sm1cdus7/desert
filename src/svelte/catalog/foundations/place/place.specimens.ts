// One witness of Place per state: a content place, and the same place while a search covers its content.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const PlaceSpecimens = [
  { state: "default", props: { label: "Notes", destination: "notes",
    top: createRawSnippet(() => ({ render: () => "<header>Notes</header>" })),
    content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })) } },
  { state: "searching", props: { label: "Notes", destination: "notes", searching: true,
    top: createRawSnippet(() => ({ render: () => "<header>Notes</header>" })),
    content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"place">[];
