// One witness of CatalogWorkspace: a notebook's Notes destination in its navigation pane, with an empty view program body.
import type { CatalogSpecimen } from "../../types.d.ts";

export const CatalogWorkspaceSpecimens = [
  { state: "default", props: { documentTitle: "Notes · Notebook", navigationSurface: { title: "Notebook", settingsPlaceholder: true },
    title: "Notes", navigation: [{ id: "notes", label: "Notes", icon: "create" }, { id: "trash", label: "Trash", icon: "archive" }],
    active: "notes", query: "", searching: false, identity: { title: "Notes", subtitle: "Your writing" },
    content: { kind: "view-program", visited: [], activeView: "notes", albums: {}, onevent: () => {}, onalbum: () => {}, onactions: () => {} } } },
] as const satisfies readonly CatalogSpecimen<"catalog-workspace">[];
