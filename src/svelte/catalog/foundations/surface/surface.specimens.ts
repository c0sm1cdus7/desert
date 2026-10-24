// One witness per role: a content place (and the same place while a search covers it), the navigation pane, a framed
// message and the access page over its wallpaper.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

const snippet = (html: string) => createRawSnippet(() => ({ render: () => html }));

export const SurfaceSpecimens = [
  { state: "default", variants: { role: "main" }, props: { role: "main", label: "Notes", destination: "notes", searching: false,
    top: snippet("<header>Notes</header>"), content: snippet("<p>Weekly plan</p>") } },
  { state: "searching", variants: { role: "main" }, props: { role: "main", label: "Notes", destination: "notes", searching: true,
    top: snippet("<header>Notes</header>"), content: snippet("<p>Weekly plan</p>") } },
  { state: "default", variants: { role: "navigation" }, props: { role: "navigation", label: "Main navigation", searching: false,
    top: snippet("<header>Notebook</header>"), content: snippet("<p>Notes</p>") } },
  { state: "default", variants: { role: "frame" }, props: { role: "frame", presentation: "message", searching: false,
    top: snippet("<header>Move note to Trash?</header>"), content: snippet("<p>You can restore the note from Trash.</p>") } },
  { state: "default", variants: { role: "page" }, props: { role: "page", backdrop: "mist", searching: false,
    top: snippet("<p>VOID</p>"), content: snippet("<p>Unlock</p>") } },
] as const satisfies readonly CatalogSpecimen<"surface">[];
