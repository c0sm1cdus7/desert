# Search ownership

Owner requirement, 2026-10-20: search is a toolbar action that expands into an
overlay. A collection, stack or inspection body must not install a search field
or filter the retained surface in place. This requirement applies to all human
web hosts; an older implementation is not an exception.

## Current View workspace

VOID's Notes and Visual catalog consume the existing `CatalogWorkspace` search
owner through `src/svelte/views/Workspace.svelte`. `CatalogToolbar` owns the
shared field and expansion; the overlay owns results, focus and dismissal.
Searching retains the underlying content and its drafts. Result activation
selects the existing collection output or reveals the existing catalog entry;
typing does not execute a command or issue a read.

Collection search may inspect only the loaded, displayed collection values.
Identity, separately loaded detail and private facts are not search content.
Collection content itself keeps its canonical ordering and selection independently
of the overlay query. Unknown, known-empty and no-match states remain distinct.

The approved search material, toolbar geometry, transitions and content fade are
not redefined by this correction. Local search fields are removed from both
`Collection` and `catalog/CatalogNavigation`. Catalog return links now focus the
catalog navigation landmark; they do not reference a removed field. Legacy
collection return focus falls back to its collection landmark when its original
record action is unavailable.

## Explicit legacy gap

The older Notebook host (`HumanProduct`, `ProductWorkspace`, `KitchenSink`) uses
a document-flow shell without the shared workspace's overlay host. After removal
of its inline field, that host does **not** provide collection or catalog search.
It still supports collection ordering, selection and catalog navigation. This is
an uncovered search requirement, not a permitted alternate presentation or a
claim that the legacy host conforms.

Closing that gap requires a separately verified integration of the shared search
owner. Do not copy search markup, add product-owned styles or apply the workspace
container styles to the old shell merely to expose a magnifier: doing so can
change geometry or clip scrolling. Preserve the approved VOID workspace while
testing legacy host integration independently.

## Verification scope

Verified on 2026-10-20:

- The catalog keyboard-return test failed before the target correction and passed
  after restoring the real navigation target, including 320px / 200% text.
- Focused collection retrieval, field anatomy, search-owner boundary and View
  workspace-data tests: 16/16 passed. The owner gate prevents content consumers
  from importing the search field or reinstating catalog query/filter props.
- VOID's built browser checks: search 6/6, Notes 4/4, preservation 3/3, at narrow
  and wide viewports. The search checks cover retained content, dismissal focus,
  result selection and the absence of inline search.
- Existing search/sidebar/transient motion comparison: 12/12 passed against the
  previous running preview. Evidence: `artifacts/search-overlay-motion-20261020-a/`.
- SDK TypeScript and Svelte checks passed (0 Svelte errors / 0 warnings). VOID's
  source gate, TypeScript and 19 contract/runtime tests passed.
- Built `void-n2-search-overlay-c` is served at the user's existing local port
  4400 with the original data store. Browser inspection confirmed Notes contains
  no search field until its toolbar action opens the shared overlay.

No CSS or motion owner was changed. The motion comparison is not a claim of a
full pixel matrix: the inline content was intentionally removed. This evidence
does not qualify the whole historical SDK suite, a fresh legacy public-catalog
build, native Safari/VoiceOver, or the legacy Notebook search integration above.
