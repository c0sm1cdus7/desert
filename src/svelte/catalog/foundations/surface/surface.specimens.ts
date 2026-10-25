// One witness per role: a content place (and the same place while a search covers it), the navigation pane, a framed
// message and the access page over its wallpaper. A frame's edges hold bars, which inset their own heading to the frame's
// reading guide (surface-frame witnesses them); plain text there would read off that guide, so the message's heading and
// copy are its content, both at the guide.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const SurfaceSpecimens = [
  { state: "default", variants: { kind: "main" }, props: { kind: "main", label: "Notes", destination: "notes", searching: false,
    top: createRawSnippet(() => ({ render: () => "<header>Notes</header>" })), content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })) } },
  { state: "searching", variants: { kind: "main" }, props: { kind: "main", label: "Notes", destination: "notes", searching: true,
    top: createRawSnippet(() => ({ render: () => "<header>Notes</header>" })), content: createRawSnippet(() => ({ render: () => "<p>Weekly plan</p>" })) } },
  { state: "default", variants: { kind: "navigation" }, props: { kind: "navigation", label: "Main navigation", searching: false,
    top: createRawSnippet(() => ({ render: () => "<header>Notebook</header>" })), content: createRawSnippet(() => ({ render: () => "<p>Notes</p>" })) } },
  { state: "default", variants: { kind: "frame" }, props: { kind: "frame", presentation: "message", searching: false,
    content: createRawSnippet(() => ({ render: () => "<div><p>Move note to Trash?</p><p>You can restore the note from Trash.</p></div>" })) } },
  { state: "default", variants: { kind: "page" }, props: { kind: "page", backdrop: "mist", searching: false,
    top: createRawSnippet(() => ({ render: () => "<p>VOID</p>" })), content: createRawSnippet(() => ({ render: () => "<p>Unlock</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"surface">[];
