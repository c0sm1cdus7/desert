// One witness of Modal per state and presentation: an open surface the person can dismiss, and the same surface locked
// while it commits. Each holds one short paragraph.
import { createRawSnippet } from "svelte";
import type { CatalogSpecimen } from "../../types.d.ts";

export const ModalSpecimens = [
  { state: "open", variants: { presentation: "adaptive" }, props: { label: "Context", open: true, locked: false, presentation: "adaptive",
    children: createRawSnippet(() => ({ render: () => "<p>Keep the source context visible.</p>" })) } },
  { state: "locked", variants: { presentation: "adaptive" }, props: { label: "Context", open: true, locked: true, presentation: "adaptive",
    children: createRawSnippet(() => ({ render: () => "<p>Saving the note.</p>" })) } },
  { state: "open", variants: { presentation: "transient" }, props: { label: "Mounted surface", open: true, locked: false, presentation: "transient",
    children: createRawSnippet(() => ({ render: () => "<p>This transient belongs to the launching surface.</p>" })) } },
  { state: "locked", variants: { presentation: "transient" }, props: { label: "Mounted surface", open: true, locked: true, presentation: "transient",
    children: createRawSnippet(() => ({ render: () => "<p>Saving the note.</p>" })) } },
  { state: "open", variants: { presentation: "sheet" }, props: { label: "Due date", open: true, locked: false, presentation: "sheet",
    children: createRawSnippet(() => ({ render: () => "<p>October 2026</p>" })) } },
  { state: "locked", variants: { presentation: "sheet" }, props: { label: "Due date", open: true, locked: true, presentation: "sheet",
    children: createRawSnippet(() => ({ render: () => "<p>Saving the date.</p>" })) } },
  { state: "open", variants: { presentation: "message" }, props: { label: "Discard the draft?", open: true, locked: false, presentation: "message",
    children: createRawSnippet(() => ({ render: () => "<p>Unsaved writing is lost.</p>" })) } },
  { state: "locked", variants: { presentation: "message" }, props: { label: "Discarding the draft", open: true, locked: true, presentation: "message",
    children: createRawSnippet(() => ({ render: () => "<p>Discarding the draft.</p>" })) } },
  { state: "open", variants: { presentation: "media" }, props: { label: "Harbour at dawn", open: true, locked: false, presentation: "media",
    children: createRawSnippet(() => ({ render: () => "<p>Harbour at dawn</p>" })) } },
  { state: "locked", variants: { presentation: "media" }, props: { label: "Harbour at dawn", open: true, locked: true, presentation: "media",
    children: createRawSnippet(() => ({ render: () => "<p>Preparing the media.</p>" })) } },
  { state: "open", variants: { presentation: "navigation" }, props: { label: "Navigation", open: true, locked: false, presentation: "navigation",
    children: createRawSnippet(() => ({ render: () => "<p>Library</p>" })) } },
  { state: "locked", variants: { presentation: "navigation" }, props: { label: "Navigation", open: true, locked: true, presentation: "navigation",
    children: createRawSnippet(() => ({ render: () => "<p>Library</p>" })) } },
] as const satisfies readonly CatalogSpecimen<"modal">[];
