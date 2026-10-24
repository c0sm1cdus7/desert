// The workspace with its navigation pane and a place, and the same workspace while its search covers the place.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));
const navigation = { identity: { title: "Notebook", subtitle: "Your writing" }, settingsPlaceholder: true, active: "notes",
  groups: [{ label: "Explore", items: [{ id: "notes", label: "Notes", icon: "create", appearance: "browse" },
    { id: "trash", label: "Trash", icon: "archive", appearance: "browse" }] }] } as const;
const place = { documentTitle: "Notes · Notebook", label: "Notes", destination: "notes", hasQuery: false, detail: false,
  backAvailable: false, resultsId: "notes-results", navigation, content: snippet("<p>Weekly plan</p>") } as const;

export const ShellSpecimens = [
  { state: "default", props: { ...place, searching: false } },
  { state: "searching", props: { ...place, searching: true, hasQuery: true, search: snippet("<p>1 result</p>") } },
] as const satisfies readonly CatalogSpecimen<"shell">[];
