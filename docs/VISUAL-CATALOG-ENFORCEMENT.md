# Visual catalog enforcement and migration

Implementation specification for the
[visual catalog ownership contract](VISUAL-CATALOG-CONTRACT.md), dated 2026-10-20.
The gates and tests below are required work, not currently passing capabilities.

## What runs today (slice 2, 2026-10-24)

Every build and check (`createBuildProject`, `scripts/catalog-gate.ts`) runs `runWithCatalogGate`
(`src/authoring/catalog/gate/build-gate.ts`), in order:

1. Rule P: every gate module, the theme, the renderer contracts, the ledger, the catalog index and the sources the gate
   reads are present.
2. Structural rules, which stop at the first error: A (every file under `src/svelte` and `src/build/svelte` belongs to
   one declaration or one fixed category), B (declarations agree; the pieces that `renders` resolved node kinds cover the
   resolved-node grammar exactly once), C (generated catalog files, the renderer table included, equal their
   regeneration), L (the ledger is well formed).
3. Content rules, which report every violation in one failure: D/D2 (compositions and dispatchers compose catalog pieces
   only; a dispatcher admits its node through its validator, has one branch per kind, looks each kind up in the generated
   table, and passes a private host capability only to its own kind), E (pieces receive only their contract's props; a
   contract declares no presentation input), F (parts, vendor families, visual packages and foundation props stay with
   their owner), G (CSS styles only what its owner draws: no global or element selectors outside the theme, no other
   owner's slots, contract marks or markup marks in a stylesheet, one writer per custom property), H (native controls
   only in foundations), I (DOM only in foundations and foundation-owned mechanisms; a renderer composition names no
   browser global), J (specimens cover every state and variant), K (the view grammar maps to authorable compositions),
   L2 (approved pieces are unchanged; approved and dispatching pieces mount approved pieces), N (the interpreter and every
   module outside the visual roots the page reaches stay nonvisual), O (no `{@html}` outside compositions, no evaluator,
   `require` or computed `import()` in page code, and no `import()` at all in a template expression or a renderer), T (the
   host files keep their fixed grammar).
4. The worker; then, for a build, G2 on the emitted CSS.

The previous visual-boundary gate (`src/authoring/visual-boundary`, `src/authoring/web-catalog`, `catalog-manifest.ts`
and its generated `adapter-catalog.ts`) was retired in slice 2 once every assertion had a catalog rule; the mapping is in
the slice-2 port inventory of the plan. Which resolved node kind renders through which piece is one fact per declaration
(`renders`), and `src/svelte/renderer-registry.ts` is generated from it.

The build is strict (owner decision Q1): today the content rules report the migration worklist, so every build fails
until slice 6 closes it. A qualified build records `gate: { version: "desert.catalog-gate/1" }` in a
`desert.distribution-build/4` manifest, and serving refuses anything else. Paths live only in
`src/authoring/catalog/layout.ts`.

```bash
node scripts/catalog.ts --write          # regenerate catalog/index.ts, manifest.json, types.d.ts, sources.ts, renderer-registry.ts
node scripts/catalog.ts --check          # rule C alone
node scripts/catalog.ts status           # ledger status per piece and specimen, digests of approved pieces
node scripts/catalog.ts approve <id>...  # owner only: stamp digests in approvals.json
node scripts/catalog-gate.ts             # the full gate on this tree (same rules as the build)
node scripts/catalog-violations.ts [D E ...]  # the violation list grouped by code, with examples
npm run test:gate                        # negative suite: each mutation must add its violation
```

## Build gate

Use one manifest, an exhaustive shipped-source/asset inventory and the actual
resolved build graph, including TypeScript, Svelte templates, CSS, generated
modules, runtime helpers and dependency edges. Inventory coverage includes
dormant/unimported production files and retained vendor alternatives; reachability
does not grant an ownership exemption. Reject new unclassified files.
Do not use a fixed hand-maintained list of selectors as the proof of ownership.

1. Validate entry schemas, unique ownership, private parts, imports and slot graph.
   Resolve aliases, re-exports, package subpaths, require and dynamic imports;
   reject unresolved targets and unsupported consumer syntax.
2. Inspect template/TypeScript ASTs. Renderer adapters can dispatch catalog nodes
   but cannot introduce native tags/text, inline SVG/canvas, CSS, snippets, callbacks
   that render, raw HTML or runtime presentation mutations. Imports of icons,
   vendor UI, style helpers or catalog internals from consumers fail.
3. Inspect component inputs at every ownership crossing, including spreads and
   forwarded attributes. A cast or JavaScript caller must not bypass runtime
   descriptor validation. Unknown properties are rejected, not discarded.
4. Inspect CSS ownership, including global/descendant selectors, utilities,
   inheritance, custom properties, layers, keyframes and injected styles.
   A piece styles its own nodes only; shared mechanisms have explicit authority.
   Resolve ownership before CSS transformations and check emitted assets for
   unexpected sources or unowned style output.
5. Restrict DOM/style/motion facilities to registered owner-bound mechanisms.
   Nonvisual adapters cannot obtain child elements or supply attach/render hooks.
   Catalog host bridges expose semantic operations, not generic DOM access.
6. Run the gate in every development, test-build and release-build entry point.
   A violation must terminate with a nonzero result before publishing an artifact.
   Release evidence records the catalog/schema version, source/dependency digest,
   gate version and successful gate result. Serving validates that evidence.
   The isolated migration harness below is a diagnostic tool, not a qualified
   application build or an alternative release entry point.

Catalog contract changes require reviewed semantic purpose and acceptance
evidence. A build verifies the accepted manifest identity; it cannot infer from a
property name whether a newly proposed distinction is meaningful. An author
cannot make an override valid merely by registering a new variant alongside it.
The manifest and gate/configuration changes are reviewed trusted infrastructure,
not consumer-writable inputs. No self-asserted approval flag grants authority.

Diagnostics identify the consumer, affected owner, forbidden operation, source
location and an existing semantic contract if one applies. They must not suggest
adding local CSS as a fix. No per-consumer suppression or generic custom slot.

## Independent negative tests

Each mutation starts from a valid fixture. The test expects a specific ownership
failure, not a broad build failure caused by an unrelated syntax or type error.

| Attempt | Required rejection |
| --- | --- |
| Calendar supplies Toolbar padding | Cross-owner geometry |
| Sidebar supplies different Button dimensions or feedback | Cross-owner action rules |
| Adapter creates a styled or unstyled visual wrapper | Unregistered rendering/layout |
| Adapter imports an icon, vendor Button or internal Surface part | Private dependency bypass |
| Consumer passes class/style directly, through a spread or wrapper | Open presentation input |
| Consumer replaces role, state marker or reserved data attribute | Owner identity/state replacement |
| Parent selector targets child internals, including `:global`, `:has` or attribute selectors | Cross-owner CSS |
| Parent changes inherited font, color or custom properties affecting a child | Inherited presentation override |
| Consumer obtains a DOM ref, calls setProperty/setAttribute/animate or injects a stylesheet | Runtime visual mutation |
| Renderer passes raw HTML, a Svelte snippet, a component constructor or a render callback | Arbitrary rendering slot |
| Consumer supplies a new padding/size variant or changes catalog identity | Unknown schema input or unaccepted manifest |
| Unknown node or invalid child reaches the runtime through JSON/JavaScript | Closed schema rejection before render |
| Alias, barrel, dynamic import or generated module hides a forbidden dependency | Transitive ownership bypass |
| A production visual file or retained vendor alternative has no declared owner | Unowned source |
| A test or inspector paints a lookalike instead of the registered piece | Parallel catalog presentation |
| Build config skips the gate or emitted assets include unvalidated code | Unqualified artifact |

Positive controls prove that meaning and accessibility still work: selection,
requiredness, invalid/disabled states, translated labels, typed action events,
resource lifecycle and approved environment adaptations must remain legal.
Assertions and reference geometry must be independent of the implementation
being tested; a shared erroneous token cannot validate itself.

## Visual and interaction acceptance

Compare the same entry with identical input/state/environment across hosts.
Verify computed geometry, material/perimeter, typography, focus, pointer and
keyboard feedback, dismissal, motion and event semantics, not only screenshots.

The initial host matrix includes generic Surface, calendar picker, selection
picker, sidebar, search and gallery. Anchored utilities remain nonmodal and
toolbarless where their contract requires it; sharing an owner must not force
every presentation into the same modal interaction.

Exercise compact and wide capacity, sidebar docked/overlay, light/dark, enlarged
text, keyboard/coarse pointer, reduced motion/transparency and increased contrast.
Preserve the stable build as reference and record deliberate changes separately.
Chromium checks do not qualify native Safari or VoiceOver.

## Migration slices

| Slice | Deliverable | Exit condition |
| --- | --- | --- |
| 0 | Inventory and versioned ownership manifest; saved stable baseline | Every current visual path classified; missing/duplicate owners explicit |
| 1 | Closed schema/import/template/style gates and negative fixtures | Each introduced violation fails for its expected reason |
| 2 | Surface and Toolbar ownership | Calendar, generic transient, sidebar and gallery consume the same qualified anatomy without child overrides |
| 3 | Action, Field and Choice ownership | Shared press/focus/material, input geometry and option rows cannot diverge by consumer |
| 4 | Header, Stack, Text, Media, Navigation and Search ownership | Content alignment, dock/snap, search and gallery live in owned pieces |
| 5 | Product and bank adapters dispatch only; obsolete paths removed | Complete bank derives from manifest; no unowned visual source or bypass remains |

Work in a separate branch/build/preview from `v127a-stable`. Transition evidence
may identify unmigrated source, but no release may claim global closure while
those violations remain. The target gate has no compatibility waiver. A temporary
migration report is not a passing gate or permission to publish a bypass.

Incremental browser qualification uses an explicitly non-releasable harness of
isolated migrated fixtures compared with frozen `v127a-stable` assets. Each fixture
must pass its declared ownership/dependency checks; the full-source gate also runs
and continues to report failure while unrelated violations remain. The harness
can record local comparison evidence, never a successful global/release result.
Its diagnostic artifacts have a separate identity and output location, cannot
receive release evidence and must be rejected by the qualified release host.
Normal application builds stay blocked until global closure passes.

## First slice acceptance for Surface and Toolbar

- Calendar supplies month identity and previous/next intents, never toolbar CSS.
- Gallery supplies identity, Close and zoom intents through declared slots;
  Close remains first as approved. Different action counts cannot change padding.
- Navigation supplies menu content and leading/trailing actions, never sidebar
  material or toolbar geometry. Dock/overlay behavior is owned by Surface.
- The shared owner resolves available space, content guide, edge placement,
  adaptive controls and supported modality. Callers cannot request numerical
  insets, force modal behavior or replace chrome.
- Generic and picker surfaces match approved shared toolbar/content guides
  under equivalent conditions. Different content does not require identical
  height, and anchored controls do not acquire a toolbar they did not have.
- Existing semantic events, keyboard focus/return, dismissal and retained drafts
  survive the migration; no business execution behavior is introduced.
- Remove the current cross-owner `ToolbarLayout` HTML/class API, Toolbar
  `controls: Snippet` and PickerSheet `contentToolbar` bypass. Calendar/zoom
  controls use finite typed slots and local UI events, never raw markup.

Definition is complete only when these constraints are expressible without an
escape hatch. Implementation is complete only after the gates, negative tests
and accepted visual/interaction comparisons actually pass.
