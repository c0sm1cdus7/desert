// The workspace with its navigation pane and a place, and the same workspace while its search covers the place.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const ShellSpecimens = [
  { state: "default", props: { documentTitle: "Notes · Notebook", label: "Notes", destination: "notes", searching: false, hasQuery: false,
    detail: false, backAvailable: false, resultsId: "notes-results",
    navigation: { identity: { title: "Notebook", subtitle: "Your writing" }, settingsPlaceholder: true, active: "notes",
      groups: [{ label: "Explore", items: [{ id: "notes", label: "Notes", icon: "create", appearance: "browse" },
        { id: "trash", label: "Trash", icon: "archive", appearance: "browse" }] }] },
    content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })) } },
  { state: "searching", props: { documentTitle: "Notes · Notebook", label: "Notes", destination: "notes", searching: true, hasQuery: true,
    detail: false, backAvailable: false, resultsId: "notes-results",
    navigation: { identity: { title: "Notebook", subtitle: "Your writing" }, settingsPlaceholder: true, active: "notes",
      groups: [{ label: "Explore", items: [{ id: "notes", label: "Notes", icon: "create", appearance: "browse" },
        { id: "trash", label: "Trash", icon: "archive", appearance: "browse" }] }] },
    content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })),
    search: createRawSnippet(() => ({ render: () => "<p>1 result</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"shell">[];
