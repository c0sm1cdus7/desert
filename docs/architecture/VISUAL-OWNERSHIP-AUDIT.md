# Visual ownership: implementation slice and remaining debt

This audit implements part of the source-boundary work required by
`../VISUAL-CATALOG-CONTRACT.md`. It does not replace that contract, approve legacy
overrides, or certify the renderer. The stable baseline remains preserved;
the current toolbar geometry corrections are explicitly authorized below.

## Indirect toolbar ownership — 2026-10-22

The real build now rejects the reproduced indirect override
`[data-catalog-workspace] h2 { padding-inline-start:99px }`. Previously that
selector escaped a check that recognized only toolbar-specific names. The new
check derives protected native elements and enclosing component hosts from the
actual Svelte AST. It checks global and nested CSS subjects, including universal,
attribute, `:is`, `:where` and conservative negation selectors. Scoped local
content remains separate from shared component internals.

One property grammar serves both direct and complete-source checks. It reads
the original declaration text before normalizing comments, escapes and casing;
the Svelte CSS parser alone splits some valid hexadecimal property escapes.
The grammar covers physical/logical dimensions, spacing, positioning, transforms,
type, text layout and the identified visibility escapes. A consumer cannot style
the shared toolbar root as if it were an external placement wrapper. A genuinely
separate host can still position itself.

Geometry variables are followed transitively to one canonical writer. The
approved reading and message-type declarations now live with surface reading
and typography respectively. The current Sidebar placement bridge is checked
separately: the native provider writes its declared default, and the workspace's
single width binding references its profile token. Arbitrary caller styles,
spreads and foreign writes to those width/placement tokens fail. This narrowly
checks the bridge used by the current product; it does **not** certify Sidebar's
entire vendor API.

Authorized relocations preserve the existing selectors, values, specificity and
layers: Button owns its base geometry and complete search-toggle icon motion;
Toolbar owns its root placement; typography owns the text resets and message
type variables; control feedback owns the existing `tm-control` utility. The
duplicated search-toggle `flex-shrink:0` was removed because Toolbar already owns
it. Three obsolete rules, whose selectors have no remaining source consumers,
were removed: `.collection-heading h2`, `.welcome h2` and
`.reading-pane .toolbar-title`. The remaining dormant CSS was not rewritten.

Foundations have bounded responsibilities, not blanket file exemptions:
typography owns type and its base text reset; the universal base reset is exactly
`box-sizing:border-box`; material owns disabled-state opacity; control feedback
owns its button-content press transform. Adding generic title padding to theme,
typography or material does not acquire authority. The temporary broad bootstrap
allowance was rejected and is not present in the final check.

Focused evidence before checkpoint M: 50 complete-source/adapter/worker cases
passed, followed by 19 direct toolbar cases after replacing the old root-placement
positive with a real external host. Typechecking, the real closed-boundary check,
the no-new-debt check and VOID's 85-file declaration check passed. Exact geometry
and typography relocation parity passed for narrow/wide and light/dark fixtures.
Button/search computed style and motion parity passed; independent-browser exact
raster comparison showed nondeterminism even between identical baselines, so it
is not presented here as complete pixel qualification. The frozen M build/browser
results must be recorded separately when complete.

No audit baseline, waiver or finding allowance was regenerated for these changes.
This remains a bounded proof: external SVG internals, arbitrary JavaScript
information flow and the full private visual dependency graph are not certified.
The strict global result remains **NOT QUALIFIED**.

## Current increment — 2026-10-21

The active View route now passes through the typed `adapter-catalog.ts` gateway.
Its required adapter set, actual registry dispatch and bounded owner APIs are
enforced by the real build, independently of the historical debt inventory.
Svelte typechecking precedes Vite output; a wrong owner prop type fails the build.
The [anatomy](ANATOMY.md) maps this route to real sources.

Workspace, Media and inspection presentation moved to finite catalog owners;
their public APIs contain data/events and explicit semantic handles, not classes,
styles, arbitrary components or caller snippets. Private local composition slots
remain visible in the conservative audit. Renaming a file as an owner does not
qualify its entire dependency graph. Native runtime globals, private component
imports, arbitrary markup and gateway prop spreading are rejected in the sealed
adapters. The strict global result remains **NOT QUALIFIED**.

The real build additionally follows runtime imports/reexports through nonvisual
TypeScript/JavaScript helpers, not only direct Svelte imports. CSS/private owner
imports, opaque dependency edges and unregistered packages cannot be hidden behind
a barrel. Runtime globals are checked against the bounded nonvisual host
capabilities; the browser-session owner cannot use arbitrary browser access. This
closes the reproduced helper escape, not every private catalog mechanism or
arbitrary JavaScript information-flow path. Gateway exports must forward the
implementation named by the existing owner type map: replacing a component with
another type-compatible component or wrapper is rejected.

Geometry is now owned by `ToolbarLayout` and `toolbar-layout.css`. The approved
page reference is **8px**, not the old generic transient header's 20px. Normal
rail gap is 12px and minimum target is 44px; text enlargement uses the same
shared density/typography formula for every consumer. Ancestor popover/sheet
padding was removed from the toolbar path while calendar body padding stayed
with the calendar grid. Page/search parity and pane-relative measurements are
recorded in `artifacts/toolbar-canonical-geometry/geometry-delta.json`.

Historical evidence below is retained, not silently replaced with a passing
snapshot. It describes earlier checkpoints and is superseded where explicitly
stated in this increment. Current complete-suite evidence is recorded in VOID's
`docs/VERIFICATION.md` after the isolated rebuild; no owner store was repinned.

The earlier increment inventoried **362 files and 394 syntactic findings**. Fourteen
new sources were individually reviewed: finite catalog owners/gateway, scoped
appearance/toolbar mechanisms, the nonvisual specimen state owner and the
framework stylesheet bootstrap. Their
findings remain recorded, including seven conservative `ComponentProps` matches
in the narrowed type gateway and bounded `bind:this` handles. These matches are
not counted as hidden removals or certified ownership.

The generated root loads the existing theme explicitly, without relying on
the legacy HumanProduct import. Its only render slot is SvelteKit's framework
children; the bootstrap grammar is independently sealed against extra markup,
styles, props or effects. Its four conservative scanner findings remain visible.

The [review delta](visual-ownership-review-20261021.json) preserves the historical
aggregate digest and records exact current source/finding identities. The debt
baseline retains every original source digest, finding and classification.
Four slot replacements and the legacy HumanProduct outer DOM replacement remove
authorized consumer toolbar geometry; each consumes the same single historical
occurrence, never a second allowance. Three typed handle findings are explicit
new audit records. FailureDialog's responsibility migration is separately
recorded while retaining its historical classification. This provenance is not
a runtime exception: sealed source/API gates remain independent, and the strict
global gate still rejects qualification. Review source digests are evidence;
the exact operation/ownership fingerprint is the regression match key.

## Catalog registration and lexical-composition review

Five additional sources were individually inspected and classified with **zero
finding allowances**: `catalog-admissions.ts` derives adapter admissions and
closure sets from the manifest; `catalog-manifest-schema.ts` defines its closed
data grammar; `catalog-manifest.ts` registers owners as literal data;
`catalog-owner-types.ts` contains generated type-only owner references; and
`pieces/ViewPanel.svelte` binds finite projected panel data/events to the existing
Drawer. Their exact digests and imports are recorded in the debt inventory.
The historical aggregate digest and all prior findings are unchanged. Registration
does not certify private dependency graphs or add authority to draw.

The scanner now reuses the existing lexical-slot proof for manifest-declared
private compositions. A locally declared snippet that passes that proof is not
an externally supplied render slot. No per-file fingerprint exemption is used.
Incoming `Snippet`/native-attribute contracts remain independently reported;
nonlexical render calls are reported even when their surrounding file is a
composition. Tests reject public children, member calls, aliases, parameter,
each/await/const shadowing and attribute spreads. Unregistered sources do not
acquire this classification merely by being in `pieces/`.

The `MeasuredField` narrowing preserves all three historical findings. Two
one-to-one contract replacements retain the two explicit `Snippet` findings:
the open child slot existed in the former broad `ComponentProps` and remains
reported. One historical arbitrary attribute spread has an exact, source-bound
replacement multiset for the four internal vendor field markers derived from
finite `kind`/`invalid`/`disabled` props. This witness requires the complete
current source digest, not merely historical provenance. It cannot coexist with
the old spread, mix replacement families, admit duplicated/extra markers or
survive an unrelated source change. Current raw findings are never removed from
the report; only regression comparison reconciles that reviewed narrowing.
Independent finite-input source/type/parity gates still apply. The remaining
private child slot and dependency graph are not certified, and the strict global
result remains **NOT QUALIFIED**.

The reviewed source tree contains **367 files and 366 current findings**;
its aggregate source digest is
`a1e86182138c87abc560a9d692287f34d347acc09858b0fe0fbd491717f23e87`.
No visual source changed during this reconciliation. The focused 12-file matrix
passed **54/54 tests**, including exact finite-input pixels/DOM/focus/scroll,
actual Svelte type rejection, catalog derivation/build checks, lexical-slot
adversaries and narrowing multiplicity/digest adversaries. One initial exact-pixel
sample failed while its DOM/geometry check passed; both the isolated rerun and
the complete final matrix passed without source or expectation changes.
`--no-new-debt` and `--closed-boundaries` pass. The strict global audit still
rejects qualification with 366 findings and six qualification gaps.

## Earlier bounded closure checkpoint

- `FrameBody` no longer draws a utility-actions wrapper. `UtilityActions` owns
  the exact existing DOM and accepts only typed actions and an intent callback.
- `ViewItem` no longer draws a text-placement wrapper. `TextContent` owns its
  existing reading placement and accepts a text value, not HTML or styles.
- `ViewContent` selects `ContentFlow`, a catalog composition that owns the exact
  existing vertical flow and stack wrappers. It accepts resolved typed content
  and events, not custom layouts or render functions. Its legacy search-reveal
  DOM handle remains explicit debt; this does not certify the whole View family.
- `Toolbar.controls` is no longer an arbitrary Svelte snippet. It accepts the
  finite `{ kind: "calendar" }` contract, validates it at runtime, and selects
  the private `CalendarNavigation` bridge. Calendar buttons retain the same DOM,
  labels, order and Bits calendar context. Unsupported kinds, rendering functions,
  extra properties and symbol-keyed properties are rejected.
- `Heading` no longer accepts HTML attributes, classes, styles, raw snippets or
  an arbitrary heading level. A finite semantic `HeadingContent` determines its
  text role (`page`, `document-title`, `rail-title`, `group-label`), with runtime
  validation that also rejects extra and symbol-keyed properties. Five existing
  consumers now pass meaning and text. Existing rail/document typography rules
  moved unchanged into the heading owner.
- `PlaceHeader` no longer accepts arbitrary `actions` or `search` render slots.
  Both existing callers were checked; neither supplied those unused slots.

These were narrow boundary closures, not closure of all input contracts of those
families. At this earlier checkpoint `ToolbarLayout` still accepted HTML
attributes. The current increment removes that opening and consumer geometry;
its private structural composition and broader dependency graph remain audited.

## One reproducible inventory, separate bounded checks

`src/authoring/visual-boundary` reads every file in `src/svelte` and
`src/build/svelte`, including dormant vendor parts, assets and build templates.
The generated JSON records source digests, candidate responsibilities, imports,
and each detected operation with source location and a fingerprint. The Markdown
inventory lists every file and every finding. Counts come from disk, not from the
historical “326 files” figure. Product declaration enforcement remains separate.

```sh
node scripts/check-visual-boundary.ts --check
node scripts/check-visual-boundary.ts --closed-boundaries
node scripts/check-visual-boundary.ts --no-new-debt
node scripts/check-visual-boundary.ts --write-audit
```

- `--check` is strict and currently fails. It cannot produce qualified release
  evidence while either known findings or coverage gaps remain.
- `--closed-boundaries` enforces the migrated contracts independently of the
  debt snapshot. It resolves direct Svelte imports, including renamed imports,
  and forbids presentation escape inputs/rendered children on Heading, TextContent,
  UtilityActions and PlaceHeader. Their implementations cannot reopen raw
  attribute forwarding/render slots. FrameBody, ViewItem and ViewContent cannot
  regain native DOM/text/CSS or direct DOM mutation. Semantic props are defined
  only in each component/schema; this gate does not duplicate their key lists.
  This bounded source gate
  passes; it is **not** a whole-renderer release qualification. The real build's
  additional nonvisual graph gate follows sealed adapters' runtime helper/barrel
  imports. The complete private visual graph, CSS authority and arbitrary runtime
  aliases remain outside this bounded proof.
- `--no-new-debt` is a regression alarm only. It rejects new paths, changed
  classifications, new operations and duplicated existing escapes. Removal of
  debt is allowed. It explicitly does **not** mean “ownership passed”.
- `--write-audit` records evidence for review; it is not an approval operation.
  Do not regenerate it to make a newly introduced violation disappear.

The existing test runner includes independent mutation cases and the regression
alarm. The strict audit is not represented as a successful release gate. Full
release/build integration is still required by the contract; wiring a permissive
baseline check into releases would falsely certify this source.

### DOM ownership identity and event refactors

Native DOM findings retain their original full-source `fingerprint` and excerpt.
An additional `ownershipFingerprint` preserves the complete native subtree,
including tags, nesting, attributes, text, component names and non-event props,
but masks the value of nested components' explicit `onevent` port. The callback
is separately scanned for direct DOM operations using the same script detector.
Native event attributes are not masked. A new or duplicated node, changed native
attributes, changed visual props, and direct `style`/`setAttribute`/`innerHTML`
operations still fail the regression alarm. This is not a proof of arbitrary
callback information-flow or indirect mutations; the existing limitations stand.

The 19 historical native findings were enriched without replacing any original
hash, excerpt, source digest, finding or classification. All seven original full
source digests and all 19 full-node hashes were verified before adding the new
identity. For `ProductWorkspace`, reconstruction changed only the guarded
`onevent` callback back to its recorded `onevent={model.create}` form; the entire
reconstructed file matched its historical digest. The other six files matched
directly. Evidence without an attested ownership identity continues to use its
exact original hash; it is not inferred from the truncated excerpt.

## Historical inventory checkpoint and its meaning

The earlier recorded audit had **348 files** (332 in `src/svelte` plus 16 build sources),
**420 syntactic findings across 71 files**. The old 326 was the initial physical
source count, not a number of violations. Neither the old 435 nor the current 420
is a count of distinct consumer bugs. The manifest enumerates every occurrence.

- **Confirmed consumer/adapter debt:** 19 native DOM nodes across seven adapter
  sources; direct DOM ownership remains in the legacy product/catalog bridges and
  workspace navigation. DateCalendar's toolbar padding override is confirmed
  cross-owner geometry, not merely a scanner match.
- **Open contracts requiring migration:** 62 syntactic contract references across
  24 files include generic HTML attributes, DOM references and Svelte snippets.
  A pair of type-import/type-use findings is one opening, not two distinct bugs.
- **Catalog implementation requiring owner qualification:** much of the 224
  component-input findings is an owner configuring its private vendor bridge
  (Action to Button, Face to Avatar, status icons). These are not automatically
  product-consumer violations. They cannot be waived by folder: an accepted
  owner/private-dependency manifest must prove the authority. The other input
  findings include real cross-catalog classes, attributes and DOM bindings.
- **Global selectors:** 17 matches include DateCalendar's confirmed overrides,
  but also the shared ToolbarLayout scroll cursor and focus owner. Legitimate
  internal behavior and unauthorized child geometry must not be conflated.
- **Shared CSS files:** material, typography and motion mechanisms are included
  in the inventory without treating every declaration as an override. Their
  selector authority and inherited-variable write ownership are not yet proven.

These categories are evidence, not a silent exemption list. The strict overall
result remains incomplete; product source restrictions do not close SDK debt.

## Historical geometry conflict and owner decision

At a 16px root size, the generic transient `.workspace-header` used 20px padding
(`--chrome-inset:1.25rem`). The navigation toolbar uses 12px. DateCalendar
replaces the header padding with **4px top, 0px inline, 12px bottom**
(`.25rem 0 .75rem`) and its navigation targets are 36px in the anchored calendar
versus 44px in sheet/coarse mode. Message headers use 24px top/inline and 0px
bottom. Removing those differences changes the approved pixels. Keeping them
under caller-named variants would preserve the very exception the contract
forbids. On 2026-10-21 the owner explicitly approved the page toolbar geometry
as the single rule and authorized correcting the other consumers. This resolves
the design decision. The implemented correction uses the actual page's 8px
reference, not the generic transient's 20px. Independent negative tests and
pane-relative measurements cover the correction. The approval does not authorize
new button styling, glass material, motion or consumer-specific variants.

## Verification evidence

Negative contract/source tests were written and failed before implementation.
The final targeted run passed **22/22 tests**, including closed-boundary mutation
tests, collection reading-guide geometry, date cursor/presentation replacement,
picker toolbar consistency in light/dark, and shared toolbar ownership.
`visual-content-parity.test.ts` compares the old native-heading/text arrangement
against the new semantic owner at 390px and 1280px in light and dark: screenshots
are byte-identical and computed heading geometry/font/margins are identical.
SDK TypeScript checking passed. No live preview was changed and no native
Safari/VoiceOver qualification is claimed.

## Earlier work list (current disposition noted above)

| Area | Evidence | Required work |
| --- | --- | --- |
| Toolbar identity/layout | `ToolbarLayout` has `HTMLAttributes`, `class`, attribute spreading, snippets and an exported DOM reference | Replace the public opening with closed identity/action/availability contracts; keep private structural parts private. |
| Calendar | `DateCalendar` globally targets `.workspace-header` padding, `[data-toolbar-controls] button` dimensions and calendar internals | Move shared geometry into the qualified owners. Current calendar padding is `.25rem 0 .75rem`; buttons use 36px or 44px depending on presentation. Normalizing this changes pixels and requires explicit parity evidence/decision. It is not an approved exception. |
| Picker surface | `PickerSheet.contentToolbar` suppresses the standard toolbar and accepts raw content | Declare calendar identity/navigation and content through a finite composition; remove toolbar replacement authority. |
| View interaction | `Workspace` obtains/query-selects DOM and handles scroll/focus; search reveal exposes DOM handles | Move navigation/focus behavior into qualified catalog owners, preserving retained content and events. Content wrappers are now owned by `ContentFlow`. |
| Other adapters | Product/bank adapters contain markup, snippets and visual dependencies | Keep event/data orchestration nonvisual; use closed catalog roots and typed child descriptors. |
| Composition inputs | Class/style/data markers, DOM refs, attribute spreads and raw child snippets cross component boundaries | Close each family with negative input tests, not a growing set of consumer exceptions. |
| Shared CSS and vendor | Shared CSS recipes and retained vendor alternatives are inventoried, but their exact authority/private dependency graph is not yet sealed | Qualify shared mechanisms and private bridges; remove unreachable competing implementations only after dependency and parity evidence. |

## Legacy test reconciliation (no renderer changes)

A sequential run of the nine reported visual test files reproduced **20 passing
and 12 failing tests**. The failures were audited before changing expectations:

| Tests | Obsolete expectation | Independent authority and retained checks |
| --- | --- | --- |
| `grouped-row-feedback`, `press-consistency`, `sidebar-custom-feedback` | Held content scale `.985` | `v128a-stable:src/svelte/vendor/styles/tokens.css` already specifies `.96`. Expectation now uses that approved value; hitbox, borders, focus, cancellation, release, disabled state, native events and reduced-motion checks remain. |
| `grouped-row-feedback-parity`, `input-clear-layout` | Hover turns semantic text blue or changes its foreground | The approved stable feedback owner preserves ink and uses a neutral inset tint; the user explicitly removed primary hover. Checks now require stable semantic ink, perceptible neutral hover, stronger held feedback and cancellation, retaining no-background-image and geometry assertions. The clear test waits for initial CSS application to settle before sampling its resting ink. |
| `grouped-panel-material` | An opaque color must serialize as `rgb(...)` | Current Chromium serializes the opaque 100% color mix as `oklab(...)` without alpha. The test rasterizes the computed fill and requires alpha 255, while still requiring no blur and the 1px boundary. It no longer confuses color syntax with opacity. |
| `icon-spin` pending-primary case | Pending changes primary to a neutral secondary | The user's later explicit primary-glass rule and independent `primary-pane-material` matrix require prominence to persist. The test now requires distinct tinted material/foreground, while preserving icon inheritance, accessible name, one icon, busy/disabled state, rotation and geometry checks. |
| `catalog-inspector`, `visual-catalog-reuse` | Content owns an inline `Find component` query and filters mounted content | The explicit overlay-only rule removes that alternative. Tests now mount the actual View Workspace for toolbar search and result selection, check all 23 underlying entries remain mounted, and preserve writing/radio DOM identity and drafts across overlay discovery and detail navigation. Pure catalog-body inspection asserts absence of inline search. |

Independent confirmation ran **16/16 passing tests** for pane-family ownership,
primary glass/contrast/pending, search-owner boundaries and toolbar scroll-to-top.
The test reconciliation changes only tests, one fixture and this report; it does
not normalize or repaint any visual source. The full updated nine-file sequential
rerun passed **32/32**, with no failures or skipped tests (114.1 seconds).
SDK TypeScript checking also passed. These results do not change the
architecture's still-incomplete release status.
The pre-existing raw-custom-calendar path in the press matrix is diagnostic only
(it has no shared content wrapper); this audit does not claim that escape is
qualified or repaired. No assertion was removed to broaden its exemption.

The scanner deliberately does not label every shared stylesheet a consumer
override. A shared material or motion owner is legitimate. Equally, being in
`pieces/`, `vendor/`, or a shared CSS file is not evidence that ownership is
qualified. Candidate ownership is investigation metadata only.

## Limits that remain explicit

This slice uses Svelte and TypeScript ASTs for renderer DOM/text/CSS, raw HTML,
open component inputs/contracts, raw slots, global selectors, direct private
imports and direct DOM/style/motion access. It is not a complete information-flow
proof. Transitive alias/barrel/dynamic-import graph resolution, global CSS
inheritance/selector ownership, generated/emitted assets, indirect runtime calls,
test fixtures and executable code outside the listed roots, accepted manifest
identity and the full visual/environment matrix remain open.
The strict result stays failed; no compatibility waiver is a release credential.
