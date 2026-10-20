# Supported behavior and evidence

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/STATUS.md

Source SHA-256: b595d673dd8a187c88040e200000b11cbdd7b5a21a3682ef52baac4c9cb1f634

# Implementation status — 2026-10-20

## Owner-approved checkpoint — v128a-stable

The owner approved the preserved-renderer VOID N1 preview on 2026-10-20.
`releases/v128a-stable.json` records the exact renderer/build digests, evidence
and recovery procedure. The paired VOID checkpoint is `n1-stable`.
This marks an approved local web baseline on development branches, not a
production/all-platform release or closure of the outstanding architecture audit.
The previous `v127a-stable` tag, frozen preview and local stores are preserved.

## VOID N1 — restore approved visual owners

The first N1 preview was visually rejected. Using low-level primitives was not
enough: its parallel workspace composition lost the approved anatomy, header
handoff and motion. The replacement workspace/navigation composition has been
removed. The View-program adapter now mounts the existing `CatalogWorkspace`,
`CatalogNavigation`, `CatalogToolbar`, `PlaceHeading` and `PublicCatalogBank`.
It supplies typed data and callbacks; it adds no alternate shell CSS or material.

Independent RED checks reproduced a scroll effect resetting the viewport to zero
and a newly mounted panel skipping entry motion. Scroll reset now follows actual
destination changes, and panel lifetime enters through the existing closed-to-open
transition. Nested retained content also respects its parent's active state.
Top-dock actions remain in the existing upper navigation rail at compact widths;
Search's adaptive placement and component are unchanged.

Final build `landmarks-v128-preservation-c` versus frozen v127a passes 20 exact
pixel comparisons (zero changed pixels, no masks/tolerance) and 12 motion
comparisons. VOID `void-n1-preserved-c` passes seven real-browser checks, including
real wheel scrolling, create/read persistence and draft retention across docking.
Generated Svelte checks report zero errors and warnings. These are finite
Chromium matrices, not all-state/native qualification or closure of the 326-file
ownership audit. See `scripts/visual-parity/README.md` and VOID verification.
The approved 4292 build and the original VOID local store remain intact.

## VOID local View program — N1

The branch now builds a finite `desert.view-program/1`: typed destinations and
output bindings consume literal Views, canonical read/create journeys and their
existing input schemas. Bound collection/form/context nodes and the visual
catalog have shared web owners. VOID contains declarations, not product HTML,
CSS, a private controller or a second renderer.

Admission rejects dangling/duplicate bindings, unsupported panel geometry,
unrendered docks/media and extra presentation properties. The nonvisual
interpreter preserves canonical validation, submit/Enter, review and lost-reply
recovery. Presentation-only destinations do not issue product reads/writes.

A trusted loopback developer host retains a private identity and PostgreSQL
store; it is not production enrollment, authentication or identity recovery.
The frozen v127a preview/data are not used or modified.

The local product exposes Home, Notes, create/read panels and the existing web
Visual catalog. Editing, general module composition, MCP/API adapters, native
renderers, media-header handoff in the new program and global no-override
ownership closure remain open. Evidence is recorded in VOID's
`docs/VERIFICATION.md`; this is not a new qualified public release.

## Literal View authoring foundation

The working branch adds `desert.view/1` and exported `View`, `view` and
`viewCatalog`. Content is an ordered sequence: a standalone Header, titled
Stacks and permitted passive catalog leaves. Top/bottom docks accept Toolbar
output descriptors; side docks reference Views by ID. Outputs cannot name
journeys/commands, and input bindings, editable controls and collections are
not accepted in this literal slice.

Runtime validation rejects unknown properties, styling/callback escape hatches,
invalid references, duplicate identities and cyclic/excessive composition.
An iterative preflight bounds raw input before recursive normalization. Validated
descriptors and cloned exported schemas are deeply frozen; legacy schemas and
`PlaceContent` remain unchanged.

Twelve new runtime/static tests and eighteen legacy composition checks pass
(30 focused tests); TypeScript passes. The standalone views entry bundles for
the browser without Node/external imports. This is contract evidence, not
visual qualification or global renderer/catalog ownership closure.

This records the earlier N1a boundary. N1 above adds the finite executable
binding/renderer slice; it does not replace the legacy interaction artifact
for products that do not declare a View program.

## Gallery leading close action — v127a

The shared viewer places Close first, before its title and photo count, in both
DOM and visual order. Existing Button/Toolbar primitives, zoom controls, focus
return and responsive wrapping are unchanged. Two independent order regressions
failed against v126c before the change; both pass against v127a. Gallery and gesture
checks also pass (four browser tests total). TypeScript and generated-reference
checks pass. Actual 390/1280px captures were inspected in
`artifacts/media-toolbar-v127/`; no new native-platform qualification is claimed.
Preview: `http://127.0.0.1:4292/?preview=v127a&record=1014`.

## Shared photo gallery and optimized delivery — v126c

Approved media proposal v125 revision 2 is integrated in the shared renderer.
Identity-keyed image loading removes previous-place pixels immediately, with a
silent neutral canvas and decode fade. Header collections have compact 24px-pitch
dots and drag/swipe; the shared full-window Dialog viewer has thumbnails, keyboard
navigation, zoom/pinch/pan and focus return. Single-image places omit pagination.
The giant photo focus outline is removed; keyboard keeps a small action cue.
Subtitle hierarchy, header docking, snapping and shared button feedback remain.

Build/host preparation creates hash-cached responsive WebP derivatives without
rewriting originals. Sources, original fallback, orientation and alpha are
preserved; private metadata is stripped. Catalog galleries are typed and require
`media.gallery`. Individual landmarks still have one real photo each.

20 unit/host checks and 23 focused browser checks pass; TypeScript and Svelte pass
with zero Svelte warnings. Four compact/wide light/dark cases have actual-renderer
captures. Known older bank-history scroll failure at 1280px reproduces on v124a;
it is not repaired here. Eight unrelated Notebook press checks could not start
against their old build (BUILD_CONTRACT_MISMATCH); catalog press checks pass.
No whole-suite/native Safari/VoiceOver qualification claim. See `docs/MEDIA.md`
and `artifacts/media-integration-v126/` for boundaries, tests and byte measurements.
Fresh frozen preview: `http://127.0.0.1:4291/?preview=v126c`.
No upload service, original-photo edits or changes to prior approved mockups.

## Content guide and shared press response — v124a

StackItem now owns standalone tag/avatar/image/card alignment for both product
stacks and bank specimens. Wells, lists and scrolling rails retain their outer
lane. Shared controls have neutral hover/pressed tint and 96% pressed content
scale, with stable hit targets; reduced motion keeps tint only. No primary-ink
hover returns. Search motion, toolbar fades and sidebar selection are unchanged.
Three independent regressions failed before and pass after; four actual-renderer
cases verify compact/wide and light/dark, yielding forty renders. Six navigation/
interior checks and six search checks pass. TypeScript and Svelte checks pass
with zero Svelte warnings. No whole-suite or native qualification claim.
Evidence: `artifacts/content-feedback-v124/`.
Fresh frozen preview: `http://127.0.0.1:4288/?preview=v124a&place=travel-kit`.
Earlier builds, evidence and user drafts remain unchanged.

## Navigation selection and neutral hover — v123a

Owner-directed macOS reference selection replaces the earlier text/check sidebar
state: shared rounded accent fill, white label, no check. Catalog no longer owns
a separate active color/weight. Generic primary-color hover is removed; controls
retain semantic ink, keyboard focus and press feedback. Glass and search motion
are unchanged. Four new independent regressions failed before implementation and
pass after; two interior/press regressions and six search-motion checks pass.
Four built-renderer cases cover light/dark and 390/1280px, producing twelve renders
in `artifacts/navigation-states-v123/`. TypeScript passes. This is web-reference
behavior, not native macOS/Safari qualification or OS accent preference support.
Fresh frozen preview: `http://127.0.0.1:4287/?preview=v123a&place=bank`.
Earlier previews, drafts and accepted artifacts remain unchanged.

## Search content fade — v122a

Only the expanded search content opacity timing changed: a 200ms fade following
100ms delay replaces the late 80ms emphasized fade. It still finishes with the
unchanged 300ms capsule expansion. No spatial, closing, material or toolbar-fade
changes. Six focused browser tests pass, including interruption, focus and reduced
motion. Seven sampled capsule geometries match exactly across before/after in
both themes and 390/1280px; evidence is in `artifacts/search-ink-v122/`.
Fresh frozen preview: `http://127.0.0.1:4286/?preview=v122a&place=travel-kit`.
Previous previews and drafts remain untouched. Native platforms are not newly
qualified; this is not a whole-suite claim.

## Accepted soft reading boundary — v121a

Owner-approved R2 (`mockup.landmarks.reading-boundary.v120`, revision 2) now runs
in the shared place-heading mechanism. It masks content with nine smoothstep
stops across the existing 32px feather, driven by docking updates rather than
a permanent animation loop. Existing toolbar paint, dimensions, material and
bottom fade are unchanged. Focus revelation clears the complete feather;
pointer activation cannot reach content in the fully invisible core.

Twelve exact PNG comparisons match the accepted prototype on frozen v119b:
three places, both themes, and 390/1280px. New boundary regressions pass 3/3;
focus/fade checks pass 4/4; current header/handoff checks pass 6/6. TypeScript
and Svelte checks pass (zero Svelte warnings). Five legacy toolbar tests still
query retired selectors and fail identically on v119b and v121a; they are not
counted as passing. No whole-suite green or native-platform qualification claim.

Fresh frozen preview: `http://127.0.0.1:4285/?preview=v121a&place=bank`.
Evidence and limitations: `artifacts/reading-boundary-v121/`. Approval is a
separate event alongside the unchanged R2 manifest. Previous builds and user
tabs/drafts remain intact.

## UI stabilization — v119b

The approved v118 anatomy and shared fades are unchanged. Anchored nonmodal
utilities and information now leave their focus scope with Tab/ShiftTab instead
of wrapping indefinitely. The installed Bits Popover loop required a shared
capture-phase boundary handler; interior tab order, Escape, locked surfaces,
and native focus destinations remain covered. Independent red/green evidence
records the real bug before correction.

Catalog 0.4.1 retains 23 semantic IDs and expands 52 to 57 fixtures: populated,
disabled and fixed-currency money, plus disabled and bounded option selection.
Invalid lexical money drafts are tested by typing, not by fabricating invalid
canonical money. Minimum selection is a completeness rule, not a focus or editing
trap. Qualification remains partial, especially across native platforms/locales.

All 22 previously failing root cases pass in the new complete run: 526/529 pass,
three failures solely from stale generated authoring snapshots, none skipped or
cancelled. References were regenerated; their focused rerun is recorded separately
in `artifacts/ui-stabilization-v119/verification.json`. This is not represented
as a single uninterrupted 529/529 run. Painted motion is now checked across actual
animation frames rather than inferred from an obsolete CSS animation name.
TypeScript passes; Svelte checking reports zero errors and zero warnings.

Fresh frozen `build/landmarks-integration-v119b` does not replace v118c or reload
existing user tabs/drafts. Detailed test migration rationale and evidence live in
`artifacts/ui-stabilization-v119/`. Deep-scrolled prose still competes with compact
identity in production. `artifacts/reading-boundary-v119/` is a separately sealed,
interactive proposal using the real v118c UI; its harder paint boundary and
320px/200% title truncation are disclosed, not declared solved. No reading-boundary
change is authorized by this implementation. Safari, VoiceOver, device compositing,
OS keyboards and hardware haptics are not newly qualified.

## Approved UI maturity — v118c

Implements the five accepted v117 decisions in production source: one neutral
pane material (S1), one choice-list anatomy (S2), short detail identity with an
always-visible reading stack (V1), state-preserving adaptive surfaces (M1r2),
and canonical component ownership/coverage metadata (S3). The sealed v117
proposal remains unchanged: all 225 manifest entries were reverified.

Independent panes share 88% neutral background, 24px blur and one 1px perimeter.
Semantic states use content, marks and outlines rather than separate backgrounds.
Transparent interiors retain row dividers. Custom navigation links retain
content-only press feedback and native link semantics. Those last two regressions
were reproduced by two failing tests before correction.

Adaptive surfaces retain the mounted editor, value, selection, focus and scroll
across right-docked, right-transient and bottom-transient presentations. The real
Notebook journey preserves pending/uncertain and nested-failure guards. Catalog
0.4.0 retains 23 identifiers and 52 fixtures; coverage remains explicitly partial.

Frozen `build/landmarks-integration-v118c` is served on port 4281 in a new preview
tab. Old builds and user tabs/drafts are preserved. Renderer revision:
`a030029bab67a92624480902e1757ce020961f810dc60a2f04da594ba3ef7dd0`.
Sixty-five distinct focused checks pass, including 320px/200% reading, materials,
choice behavior, search, snapping, input measures and real journey continuity.
TypeScript and Svelte checking pass, with zero Svelte warnings. Actual product
captures cover both themes and narrow/wide layouts; all 14 observation records
report no horizontal viewport overflow. This is not a clean whole-suite claim.
The full root suite finishes at 504/526 pass, 22 fail, none skipped. Some failures
expect superseded material paint or catalog APIs; others remain unclassified.
Anchored-popover keyboard dismissal, utility autofocus and panel/message motion
assertions are explicitly unresolved, not declared harmless baseline failures.

Known remaining visual issue: deep-scrolled detail prose can compete with the
compact title/subtitle. The approved shared fades are preserved; resolving that
reading protection needs a separately reviewed change, not an unapproved fade
redesign. Native Safari, VoiceOver, real-device compositing and hardware haptics
are not newly qualified. Unused vendor Tooltip is outside this material pass.
Evidence and detailed verification: `artifacts/ui-maturity-v118/`.

## Always-visible content; no collapsibles — v114a

The owner's explicit prohibition supersedes historical disclosure support below.
Place stacks now accept direct nodes only. The legacy disclosure contract,
StackDisclosure renderer, private Collapsible wrappers and unused disclosure CSS
were removed. Legacy definitions fail validation instead of silently dropping or
flattening content. Travel kit draft-lifetime prose and ContextPanel metadata were
already direct reading content in v113b; both remain visible. Navigation surface
toggles, selectors, search, dock-above, fades and input measures are unchanged.

Frozen `build/landmarks-integration-v114a` replaces v113b on port4280; all13 served
entry assets match its manifest. Existing tabs and drafts were not reloaded.
Renderer: `9986e424d542121df7c20a8519c98f1051aada12896e87151b69bd7b7aa2bb4b`.
The earlier builds are retained; no user content was removed. Independent contract
expectations first failed3 times on the old support, then passed15 unit tests.
TypeScript passes. Current focused Landmarks run passes25 of26 browser tests;
the retained failure is the pre-existing wide navigation40px/settings44px target
mismatch, reproduced on v113b. The old calendar-navigation test also fails on
v113b at its obsolete inline-day selector and was excluded from that focused run.
Three focused Notebook reading/focus/press checks pass on an isolated fresh build;
old lower-Close and Single-choice icon selectors remain failing outside this scope.

Actual-build dark/light renders at320,390,1280px, six successful selection/search
smoke checks, source mapping and limitations: `artifacts/always-visible-content-v114/`.
The general Svelte check and native Safari/VoiceOver were not newly run. This is
not a clean whole-suite or whole-SDK claim. Final visual acceptance remains with
the owner.

## Shared floating and docked surface perimeter — v113b

Presentation panes now share one real1px semantic border: overlay/docked
navigation, transient panels and sheets, messages, anchored selection and
calendar popovers. The old sidebar inset stroke and default-dialog ring were
removed to avoid doubled edges. Increased contrast uses the resolved foreground
in both themes, without changing global tokens. Motion, page fades, standalone
input measures, transparent stacks and quiet grouped content are unchanged.

Frozen `build/landmarks-integration-v113b` replaces v112b on port4280. All13 served
entry assets match the manifest; existing tabs and drafts were not reloaded.
Renderer: `91ac4963fb4705226dd39f90e8a8162a26c19129511b10ef04cb3dc12a3fb5bd`.
Independent expectations first reproduced10 missing-border failures on frozen
v112b and9 dark/increased-contrast failures on intermediatev113a. Finalv113b
passes38 focused browser tests, including54 material states, interrupted motion,
docking continuity, editing/selection, reading-axis alignment and unchanged fades.
TypeScript passes. The general Svelte check was not rerun; the prior3 errors and
1 warning remain outside this delivery claim. Native Safari and unused vendor
surface variants are not newly qualified. Actual-build renders, provenance and
proposed visual contract: `artifacts/surface-boundary-v113/`. Final visual
acceptance remains with the owner.

## Container-owned control measures — v112b

Shared text, selection, date and amount fields now have stable preferred measures
of 32rem, 26rem, 20rem and 22rem. Each fills its own containing slot when the
remaining strip is at most 3rem, then shrinks with that slot. All stay leading-
aligned; current text or selection does not change their width. The complete
accessible Field owns the measure, including feedback. Nested currency selection,
file controls and option groups retain their existing composition. Header,
toolbar, fades and search motion were not changed.

Frozen `build/landmarks-integration-v112b` replaces v111c on port4280; all 13 served
entry assets match its manifest. Renderer revision:
`3b4da78901b87642ebee2c52fdc36876bb2a6ee04ec73339a7e82bf2b800d80e`.
Forty focused browser tests pass, covering boundary widths, selected values,
alignment, editing/focus continuity, pickers, docking, fades and search. An
independent review also checked every integer slot width from 280 through 640px.
The old empty-label center assertion incorrectly measured a padded layout box;
its corrected visible-glyph assertion passes both frozen v111c and v112b.
Eleven actual-build renders include wide/narrow layouts and 200% text.

TypeScript passes. General Svelte checking still reports the same 3 errors and
1 warning recorded in v111c, outside these changes; no clean whole-SDK claim.
Native Safari and additional locales are not newly verified. Evidence and
proposed visual contract: `artifacts/control-measure-v112/`. Final visual
acceptance remains with the owner. Existing tabs and local drafts were not reset.

## Header-owned media, docking and shared alignment — v111c

The owner's 00:59 instruction supersedes the separate v109 MediaHero. One header
now owns optional image/video media; its title and description sit at the bottom
of that canvas. The standalone hero renderer was removed; earlier frozen builds
retain it. Dock-above is measured from the copy block approaching the upper rail,
not the beginning of the image. Explicit scrolling settles to an endpoint even
with a focused draft input; focus-driven scrolling alone does not initiate a snap.
Outgoing and incoming identities never paint simultaneously. The generic behavior
has one current consumer, not a completed multi-component docking stack manager.

Removed the additional v109 upper reading fade. The approved bottom edge definition
is unchanged, and the top mirrors it. Header, group headings and docked identity
share the content inset; media-card surfaces extend 16px beyond this reading axis.
When a leading navigation button is visible, compact identity reserves its space.

Frozen `build/landmarks-integration-v111c` replaces v109f on port4280. Existing tabs
were not reloaded. Renderer revision:
`b69374ac348c5db484a820663dea490fdb6f13554821e681bdb9f6d574e749af`.
Twenty focused browser tests pass, plus23 contract tests. Eighteen actual-build
captures have no horizontal viewport overflow. General public-catalog Svelte
checking reports3 errors and1 warning in sidebar/workspace/search typing; this
delivery does not claim a clean Svelte check. Native Safari and real video playback
are not newly verified. Evidence: `artifacts/header-dock-v111/verification.json`.
Final build acceptance remains with the owner. Older status sections below are
historical, including their now-superseded behavior and validation claims.

## Approved identity and media composition — v109f

Frozen `build/landmarks-integration-v109f` serves port4280. Thirteen served entry
assets match its manifest. Existing tabs were not reloaded. Renderer revision:
`61808276a38591004be10a646ad8046afd549a7c1518fba29c8b43d63d9c236f`.
Contract digest: `b0854d59b9fe8aa6c701877e4a4f8f9362db7518e1b1394787430caa6f49c9f4`.

Every catalog place has a title and description. The sole semantic header stays
in scroll content; its identity progressively transfers to a left-aligned toolbar
echo. User scroll settles to expanded/compact, is interruptible, respects reduced
motion and avoids repositioning focused editors. MediaHero is separate content,
with centered copy and a real primary action. It never transfers into chrome.
Travel kit uses that same composition and direct draft-lifetime reading content.
The root catalog description is now required in this draft contract; older
authored definitions need that field. Exercise links validate public record and
logical asset references; no controller commands or persistence were added.

Post-implementation skeptical review repaired enlarged toolbar geometry, leading
alignment, stale scrollend intent, failed-image readability and text interference
behind the compact identity. Its additive reading fade has no blur. The approved
black24%/32px edge shadows, bottom fade and search growth remain unchanged.

Thirty focused browser checks and21 contract checks pass. TypeScript passes;
Svelte reports zero errors/warnings. Generated authoring references match source.
Twenty-two captures cover390/1280px and320px/200% text. This is bounded evidence,
not whole-product maturity certification: the eight earlier broader search
failures remain outside this claim, and native Safari/iPhone/VoiceOver were not
newly validated. Evidence: `artifacts/place-identity-v109/verification.json`.
The owner accepted the design, not yet the final compiled build. The earlier
travel proposal's lower-left caption was superseded by centered media-hero+CTA.

## Search capsule correction — v108a

Frozen `build/landmarks-integration-v108a` now serves port4280; thirteen served
entry assets match its manifest. Existing tabs were not reloaded. It replaces the clipped reveal with real
rounded input-group width growth. Input identity and focus remain mounted; text
fades without scaling, then leaves before contraction. Page fades, material
layers, toolbar composition and product contracts are unchanged. Renderer:
`64cd77fc641545f543e97bbd2f60c942684d62e04fbeab1137bdb9c460108604`.

Ten focused browser checks pass, alongside TypeScript and clean Svelte checks.
Fifteen sampled intermediate frames cover320/390/1280px; reduced-motion reopening
passes at all three widths. The broader19-case search suite has the same11 passes
and8 failures on both v107b and v108a. Those existing centering, scroll/focus and
stale-selector failures remain unresolved; this is not a full-green claim.
Evidence: `artifacts/search-growth-v108/verification.json`.

At v108a, `artifacts/travel-content-proposal-v1` was a separate, unaccepted content proposal:
direct draft-lifetime copy and an image-owned Mount Fuji caption. It does not
change the product. Its manifest and four rendered projections are reproducible.

## Previous integrated verification — v107b

Frozen `build/landmarks-integration-v107b` previously served port4280 after the owner's23:11
rejection of the expanding toolbar. Renderer revision:
`0d3296131b419686abb8bb61a3edec8ba75d6cd3edafb2dc4a0a936adf1109a7`.
Thirteen served entry assets match the frozen manifest. Existing tabs were not
reloaded. The contract digest is unchanged.

Header identity, media and CTA are ordinary scrolling content. The expansion API,
compact-title copy and CTA transfer were removed. Both fixed edges, including
task footers, use `ToolbarLayout`. The lower fade exactly matches v105g's24% black
and32px feather; the upper edge mirrors it. Transients with no primary footer
action omit the redundant lower Close while preserving upper dismissal, Escape,
gesture and return focus. Continue plus secondary dismissal remains functional.

Independent expectations failed16/20 against rejected v106i before the change.
Final v107b checks:20 frozen browser cases,4 source/composition cases and14 root
regressions pass; these are bounded checks, not a maturity score. TypeScript
passes and Svelte has zero errors/warnings. Independent visual review inspected
45 captures,48 measured states, enlarged-text editing and original v1 geometry.
One320px/200% header overflow found in v107a was repaired before freezing v107b.
At that extreme size, Component still wraps inside the word: an explicit craft
limit. No new native Safari/iPhone/VoiceOver or software-keyboard certification.
See `artifacts/skeptics-v107/verification.json` for evidence and scope.

## Previous integrated verification — v106i (owner rejected)

Frozen `build/landmarks-integration-v106i` previously served port4280 after the owner's
21:42 toolbar correction. Renderer revision:
`ca9cc8829c7c63ad5943fdfcd1dd62c514757ed7d47a92268060069155b5d56e`.
Thirteen served entry assets match the frozen manifest. Existing tabs were not
reloaded. The brief intermediate v106h server was replaced by v106i.

Expanded prose scrolls away into a normal single title/icon rail. The hero CTA
becomes a circular icon without replacing its accessible button; its caption
fades before narrowing. The bank no longer pins an expanded search field and
uses the shared magnifier/overlay. Cancellation returns focus to the opener.
One mirrored surface-colored fade paints above media/content and below controls.
No separate toolbar reading panel or page-edge optical blur remains. This changes
the lower edge's old24% black shading as well, not just the upper edge.

Final frozen Chromium gates: independent20/20 and root14/14; TypeScript passes,
Svelte has zero errors/warnings. Independent visual review sampled366 intermediate
states across320/390/1280px and100/200% text without caption cropping, empty-face
intervals or CTA/title collisions. Twelve forward/reverse sweeps retained text
layout; compact light-title contrast measured15.46:1. See
`artifacts/skeptics-v106/verification.json`. Earlier candidates' failures remain.
The photo eyebrow's outlined appearance over the light feather remains optical
debt. This is bounded approval of the toolbar correction, not whole-product
maturity, native iOS parity or a new WebKit/VoiceOver validation.

## Previous integrated verification — v105g

Frozen `build/landmarks-integration-v105g` now serves the local preview on port4280,
replacing v104m after another independent skeptical round. Renderer revision:
`df5936b250266d891f4158dc45298f87e9d48cfb46d8e2390c1db61780ce1dd1`.
The unchanged contract digest is
`d0ffa7494d7e13e24e2c89c26bf7acdd6e7d65dd6c8cbc13a6f8fd5dc60afb63`.
Twelve served entry assets were hash-checked against the frozen build. Existing
user tabs were not reloaded; their local drafts were not intentionally changed.

Place focus now clears measured floating rails without fighting manual scrolling.
Multiline wells respect available height and retain native caret scrolling.
Calendar month and selection exploration survive popover/drawer replacement;
dismissal returns to the current owner without stealing external focus. The same
selection primitive serves both presentations. WebKit search-result activation
no longer loses its click to ancestor-focus dismissal. The compact toolbar core
no longer exposes ghost text; its existing feather and progressive opacity remain.

Final frozen gates: root33/33; independent Chromium22/22 and WebKit12/12 on the
unchanged full repeat. These overlap and are not an aggregate unique-test count.
TypeScript passes; Svelte reports zero errors and warnings. Source checks passed
35/35 before the final date restoration, then all11 relevant date/adaptation cases
including the added external-focus case. Final visual proof inspected four actual
captures in light/dark, preserving v1 geometry and200% editor access. Earlier
v105 evidence includes8 editing scenarios,66 focus observations and40 paint captures.

Evidence: `artifacts/skeptics-v105/verification.json` and its linked independent
interaction/visual reports. One initial WebKit module-import error did not recur
in an isolated repeat, six diagnostic starts or the full12-case repeat; its cause
is not established and it is not claimed fixed. The light hero title still has a
discrete white-to-dark ink handoff: a documented medium optical debt, not seamless
motion. Native iPhone/Safari/VoiceOver, software keyboards and the entire repository
are not certified. Settings remains disabled and feature video renderer-private.

## Previous integrated verification — v104m

Resumed after the owner's compaction checkpoint. Frozen
`build/landmarks-integration-v104m` now serves the local preview on port4280,
replacing v93. Renderer revision:
`6dc90e01a711210fd5aeb6f6726a76070c1395e1694b386c52048944cf7b84a2`.
Existing user tabs were not reloaded; a fresh Travel kit preview was opened.

The owner-designated `artifacts/surface-hierarchy-v1` governs measured captions,
insets, spacing, rows, separators and material ownership. Stacks are transparent
titled layout; individual inputs retain wells, only genuine groups share panes.
The public bank no longer adds category headings, painted specimen containers
or cumulative padding. Budget remains a titled sibling under the later owner rule.
Labels, support and disclosures follow the same content guide, including200% text.

Independent post-change review found and corrected hidden required indicators,
Money's incorrect radius, support-copy alignment, unnecessary compact-title
fragmentation, phantom upper search reservation and disclosure label inheritance.
The hero now centers at320/390; actions only share a rail when real text fits.
Source and frozen browser checks pass90 focused tests:40 root,34 independent
interaction,6 contrast/material and10 source/mounted checks. TypeScript passes;
Svelte reports zero errors and warnings. Independent visual evidence includes
34 captures across light/dark, narrow/wide layouts and enlarged text.

Evidence and remaining limitations: `artifacts/skeptics-v104m/verification.json`,
`artifacts/skeptics-v104m/interaction/findings.json` and
`artifacts/skeptics-v104m/visual/findings.json`. The original pause checkpoint and
rejected candidates remain historical evidence, not the current runtime state.
This is not native iPhone/Safari/VoiceOver parity or whole-repository certification.
Settings is still a disabled affordance, and video remains renderer-private rather
than a public authoring capability. Family-specific desktop widths and faint
content beneath compact chrome remain documented craft limits.

The historical entries below describe their named builds, not the current source
or blanket acceptance. In particular, obsolete assertions that PlaceHeader is
still the root header are superseded by the current implementation described in
WEB-RENDERER.md. No native Safari/iPhone or full repository certification is claimed.

## Historical candidate decisions

Motion correction, candidate v103: search retains its final field geometry and
reveals paint with clip-path instead of animating layout width/gap. Its control
plane remains above the material during dismissal, and outgoing field text is
retained without retaining the cancelled product query. Centered dialogs use
layout centering and vertical-only translation, never text scaling. Dialogs,
drawers and search share overlay entry/exit timing. Dialog/drawer/scrim transitions
continue from presented values when interrupted; Bits presence waits for their
completion rather than a replacement exit keyframe jumping to the settled pose.
Thirteen focused browser tests and six chrome/interruption checks pass against
v103. TypeScript and Svelte checks pass with no errors or warnings.
The independent v102 motion review rejected interrupted-dialog jumps and search
exit layer/text changes; independent v103 retest accepts both corrections,
including intermediate paint, six rapid search reversals and interrupted dialog/
transient dismissal at 390/1280px. Evidence: `artifacts/skeptics-v103/motion/findings.json`.
This is Chromium evidence, not native Safari/iPhone validation or whole-product acceptance.
The broader legacy focus suite still targets removed bank category navigation
and toolbar selectors (10 failures), and two 390px picker tests encounter unstable
trigger geometry after navigation. Representative failures reproduce on v101,
before these motion changes; they are not waived or counted as passing. The
unfinished header remains a blocker. Live v93 has not been replaced.

Owner composition refinement, 2026-10-16: the upper header and toolbar are one
component, expanded on place entry and continuously condensed by local scrolling.
Its identity, optional search, actions and supporting count retain their mounted
state. The lower toolbar uses the same component without expansion. Each place
contains titled sibling stacks. A docked sidebar is a floating child place: it
reserves layout space for content and controls, but does not cut the parent
surface or its full-width edge shadows. Adaptation follows available space,
not device labels. Both vertical page edges use the same mirrored shadow, never
blur, and respond only to overflow in their own direction.

Owner refinement, 2026-10-16 15:39: a place may declare feature media (image or
video), eyebrow, title, subtitle, search, actions and a primary action. The
expanded toolbar arranges an upper action rail, identity rail and optional search
rail, condensing toward the upper rail with local scrolling. There is one search
per place: expanded or expandable, not concurrent duplicate affordances. Component
bank removes category shortcuts and the component/state count from this region.
Actions may coexist on upper and lower rails. This is the target composition;
the unified toolbar and video contract are not implemented yet.

This anatomy is not yet fully installed. Source contains a Place frame and typed
stacks, but PlaceHeader and ToolbarLayout are still separate. The v95 independent
visual review rejected header overlap and excessive pinned height at enlarged
text. The v96 candidate removes top-edge blur; its isolated transient edge test
passes, but it is not an approval of the unfinished header refactor. The live
preview remains v93; no user tabs have been reloaded.

Search layer ownership correction, candidate v101: Place always binds edge effects
to its own viewport; the foreground search viewport cannot replace that owner.
Opening search no longer changes the retained viewport's overflow. Foreground
material, results and search controls stack above existing page edges. The lower
content has an unconditional stacking context. Navigation geometry is retained
under the overlay; inert/ARIA exclusion changes input ownership, not visibility.
Twelve targeted browser tests pass,
including edge instance/geometry/strength retention, focus, query changes,
dismissal, motion and opaque accessibility fallback. TypeScript and Svelte checks
are clean. Normal translucent search still has a clipped-edge backdrop sampling
artifact reproduced independently in minimal Chromium HTML; it is not certified
visually complete. This is not approval to serve the candidate.

Continuous parent surface, candidate v101: the place viewport and edge shadows
span the workspace behind the floating sidebar. Only content and controls reserve
the sidebar inset. CatalogBackdrop is no longer mounted: the original hero/detail
image supplies the entire width, without a second mirrored load or scroll-sync
effect. Component bank has one expanded local search and no category/count rails;
searches inside collection specimens remain legitimate independent examples.
Nine additional browser tests pass for media lifecycle, sidebar materials,
composited text contrast, preferences, aligned toolbars and navigation gestures.
Frozen v101 remains an isolated candidate; live v93 has not been replaced.
Independent visual review approves only these scoped ownership/inset/search
corrections (4/4 independent checks). It rejects whole-product readiness: the
bank's pinned header still overlaps content, and the normal search material has
the reproduced Chromium clipping artifact. Evidence and explicit limits are in
`artifacts/skeptics-v87/visual/landmarks-web-v101/findings.json`; the accompanying
mockup contract is a draft, not owner acceptance. Its generic metadata is saved,
but the Capibara-specific validator rejects product=desert as expected.

Owner composition ruling, 2026-10-16: every input belongs to a visibly titled
semantic group, including single-input groups. Budget is the explicit title for
the group containing Estimated budget. Stacks arrange groups without introducing
nested painted cards. This requirement is demonstrated in
`artifacts/surface-hierarchy-v2`; global renderer enforcement is not installed
in the current v93 preview. See the titled-input-group rule in WEB-RENDERER.md.

The latest owner decision retains direct selection, but supersedes anchored-only
pickers: selects and dates use anchored panels when their launch surface has room,
and bottom sheets when it cannot fit the readable panel plus visible context.
Contextual information popovers remain nonmodal and anchored. Task/dialog
frames remain separate. `desert.surface-frame/6` removes the obsolete selection
frame; `selection.confirm` remains recognized only for wire compatibility, with
no active host and no product-dispatch permission. Control nodes/events and the
Notebook controller contract are unchanged. Toolbar actions share ordinary
circular/capsule action faces and borderless chrome. A step-wizard exception is
not inferred from generic journeys; no wizard grammar is installed.

These are current requirements and source changes, not claims that older frozen
screenshots or test runs verify this revision. New integrated visual evidence is
required after rebuilding. See web behavior (SDK file: `docs/WEB-RENDERER.md`) and the explicitly
unimplemented native mapping (SDK file: `docs/NATIVE-RENDERER-MAPPING.md`).

## Experimental public catalog

Landmarks now has a separate read-only compiler and web host. Declared records,
logical media, search exposure and local exercise drafts project into the same
versioned interaction bank as the catalog. JSON Schema and explicit renderer
requirements prepare native adapters; Swift and Android implementations are absent.
Local exercise changes are not admitted commands, persisted product data or uploads.
Apple sample photos remain private external host bindings and are not redistributed
in the build. This increment does not migrate or repin Notebook/controller data.
Visual comparison and independent findings live under
`references/apple-landmarks-2026-10-15/benchmark/`; no Apple approval or complete
pixel/motion parity is claimed. Final integrated verification is recorded there
separately from targeted component tests.

### UI consolidation after independent skepticism — 2026-10-16

The current preview serves `landmarks-web-v93`, renderer
`0326e20d514c142629a48c3f84f02a66176acf5016edc052e754d3b4dc0d6917`.
Shared focus ownership, place/portal lifecycle, browser history retention, fit-based
calendar presentation, host-derived typography and continuous heading handoff were
consolidated. Calendar popovers are compact; sheets retain larger readable geometry.
The top edge uses shallow masked separation; the explicitly approved bottom is unchanged.
Detail reading and bank/form hierarchy were tightened without adding product commands.
Public catalog copy changes update its contract digest; controller semantics and stored
data were not changed. User tabs were not reloaded.

Independent reviewers rejected intermediate candidates and retested the fixes. Final
bounded visual and interaction reviews found no remaining high/medium finding in their
scope. Twenty-five source-browser checks, 21 compiled catalog integration checks and
eight edge/material checks pass. The latter include a fresh isolated Notebook build.
TypeScript and Svelte report no diagnostics. This is not a full repository validation.

At 320px and 200% application text, readable calendar targets require local two-axis
scrolling; its discoverability remains a limitation. Physical iPhone, WebKit, VoiceOver
and virtual keyboards remain unverified. No native parity or owner acceptance is claimed.
See implementation, evidence and remaining limits (SDK file: `artifacts/maturity-v93/README.md`)
and verification (SDK file: `artifacts/maturity-v93/verification.json`).

### Shared action glass and calendar toolbar — 2026-10-16

Previously verified in `landmarks-web-v85`, renderer
`c57e9ec6b5cdeab7de724fd05606f6419cdc3a15919cc16dc56095df1c02b3b6`.
Primary, secondary, outline and destructive Button variants now share a
translucent action material, optical blur and edge highlight. Primary actions
retain their semantic tint. Hover/held feedback layers use material color rather
than replacing it with an opaque fill. Reduced transparency/increased contrast
keep opaque fallbacks. Ghost, link, row, field and grip semantics are unchanged.
Search actions reuse this Button material instead of a separate local rule.

Date pickers render the visible month/year as the sole visual toolbar title,
with native Calendar previous/next controls on the trailing side and the shared
Close action on the leading side in sheets. Calendar context still owns bounds,
selection and keyboard navigation. At enlarged text, measured toolbar capacity
moves the title to its own full-width row; the day grid retains local scrolling.

Nine final source-browser tests and two compiled catalog integration tests pass;
TypeScript and Svelte report no diagnostics. Earlier integrated v84 checks passed
all 40 navigation/search/hover regressions; 31 source-browser checks passed before
the final enlarged-title layout refinement. Visual evidence covers both themes,
photo backdrops, 320/390/1024/1280px layouts and 200% text. See
verification (SDK file: `artifacts/action-glass-calendar-toolbar/verification.json`).
This is a CSS glass approximation, not native Liquid Glass or a full-repository
validation. Product/controller contracts and user browser tabs are unchanged.

### Place title handoff and sidebar chrome — 2026-10-16

Previously verified in `landmarks-web-v81`, renderer
`eef98888054088fc22f19c01e974814c5ff18f3a35d7511a89dd4d835feff6c2`.
The visible place heading hands off to the top toolbar when its lower edge
passes the toolbar, and returns on reverse scroll. Geometry is observed rather
than inferred from a device category or fixed scroll distance. Retained hidden
places do not own the title. Reduced motion removes the short transition.
The filled sidebar toggle sits beside the product name, or in the place's top
toolbar when navigation is closed. The obsolete bottom toggle dock is removed.
The sidebar footer contains a disabled Settings cog: no settings destination or
action is installed or implied. Search remains mounted across layout changes.

All 31 targeted compiled-browser tests pass; TypeScript and Svelte report no
diagnostics. Checked heading resize, detail return, search focus/composition,
sidebar toggle clicks, 390/1280px layouts and reduced motion. See
verification (SDK file: `artifacts/place-toolbar/verification.json`). No product contract,
controller data or user browser tab was changed. This is not a full repository run.

### Visible grouped-list panes — 2026-10-16

Previously verified in `landmarks-web-v78`, renderer
`d20412589de1d2a78f331da5f329fa2b5d879a78922bf9bcff6551072c0fcc5e`.
GroupedPanel now reuses the existing tinted glass-control material with one
boundary per list, not per row. Group headings remain outside. End-row radii
match the panel; inset keyboard focus and contiguous separators are preserved.
Reduced transparency and increased contrast retain an opaque fill and boundary.
This is a CSS material approximation, not native Liquid Glass.

Nine source-browser and two compiled catalog tests pass; TypeScript and Svelte
report no diagnostics. Both appearances, 390/1280px widths and enlarged text
were checked. See verification (SDK file: `artifacts/grouped-panel-material/verification.json`).
No product contract, controller data or user tab was changed. This is targeted
verification, not a complete repository test run.

### Writing-well focus coverage — 2026-10-16

Previously verified in `landmarks-web-v76`, renderer
`453359b9af6bd158b8d5f513e3d633ab70263eefc76f3ec9e01570323e29c146`.
FieldWell now focuses its associated text editor when its otherwise passive
padding or footer is clicked. Native inputs, labels, links, editable content,
selection controls and accessory buttons retain their own activation. Disabled
editors remain unfocusable; no extra keyboard target or synthetic edit is added.
The change preserves existing well geometry and native text selection.

Thirty-six source-browser tests and twelve frozen catalog integration tests pass;
TypeScript and Svelte pass with zero diagnostics. Initial reproduction and final
results are in focus verification (SDK file: `artifacts/field-well-focus/verification.json`).
Two older regression expectations were reconciled with already-installed behavior:
currency prefixes show symbols, and impossible monetary precision is rejected
without replacing the accepted draft. No controller data or user tab was changed.

### Shared picker toolbar and currency symbols — 2026-10-16

Previously verified in `landmarks-web-v75`, renderer
`6069ec07aedbba46691eaf784fff3bf001bbf974d0dc4660010e25f8ea78c17c`.
Picker sheets now compose the existing Toolbar and Action, with the same circular
close control before the title and no header divider. Toolbars without trailing
utilities no longer reserve an empty rail or stack their title unnecessarily.
Money renders one shared muted, unboxed currency symbol in the trigger and both
option presentations; generic option faces retain their existing behavior.

Thirty-four source checks plus five additional toolbar checks pass, along with
eleven public-catalog integration checks and six Notebook toolbar checks. The
Notebook integration uses a fresh isolated build and temporary test database;
its text-visibility probe now traverses text nodes rather than assuming a direct
text child. TypeScript and Svelte pass. Evidence, initial failures and captures
are recorded in verification (SDK file: `artifacts/picker-toolbar-consistency/verification.json`).
No full-repository green claim, stored-data migration or user-tab reload is implied.

### Picker regression reconciliation — 2026-10-16

Previously verified in `landmarks-web-v74`, renderer
`e0f94d8872eecf594b8b82b9355cfac1ae439ee9c547c5db55616a43fd84d877`.
All three previously reported popover-suite failures are resolved. Two tests
retained superseded anchored-only expectations; they now explicitly verify both
anchored lists and constrained modal sheets, including fit, dismissal and focus.
The monetary test supplied a dot decimal to an es-AR field. Investigation also
found a real shared-mask defect: native insertion incorrectly treated newly
supplied grouping as a displaced generated separator, silently changing the
amount. Newly inserted grouping is now validated strictly; ordinary digit edits
can still regroup existing separators. Rejection preserves writing, selection
and the accepted value without publishing an edit. Locale does not change when
the currency changes.

Forty-four source/domain/browser checks and eleven frozen-build integration
checks pass, including all five tests in the formerly failing suite. TypeScript
and Svelte pass. Independent RED evidence and scoped results are retained in
regression repair verification (SDK file: `artifacts/picker-regression-repair/verification.json`).
No full-repository green claim, controller migration, stored-data changes or
automatic user-tab reload is implied.

### Picker composition — 2026-10-16

Picker composition was verified in `landmarks-web-v73`, renderer
`dd4c7c770892e3e23f969dd5ef4f195cbbe009dacf85abcb78039fdc5c202ca0`.
Date/select presentation now budgets a 24rem panel plus 4rem of surrounding
context against the owning surface's usable width and root text size. Sheets
retain a bounded width, a distinct title/header and scroll padding for complete
focus outlines. Single-choice options and radio groups share the same visual
mark; existing multiple-option groups retain checkbox semantics. Calendar picker
geometry follows its content box, with square day faces and local grid scrolling
when enlarged text cannot fit seven columns.

Thirty source-browser/domain tests and five focused frozen-build integration
tests pass. TypeScript and Svelte pass with no diagnostics. Light/dark captures,
320/390/600/1024px coverage, 200% text and independent pre-change failures are in
picker verification (SDK file: `artifacts/picker-composition/verification.json`).
Three popover-suite failures reproduced in unchanged v72 and v73. Their subsequent
investigation and resolution are recorded above; the v73 evidence is retained
without counting those failures as passes. No controller, contract, stored data,
user-tab reload or VOID implementation changed in this increment.

### Catalog hierarchy — 2026-10-16

Hierarchy was verified in `landmarks-web-v72`, renderer
`9897a66c5b569d37d472f224ed451db7011bed6ef0ac20372d3f11fd0de877e3`.
Shared category headers, specimen groups and state rows now distinguish page,
category, component and metadata using existing type roles. Component identity
lives in the group's Card header; return navigation is an accessible icon accessory.
Unavailable specimens use a compact catalog annotation, not a product empty state.
Field descriptions and collection retrieval metadata use the caption role in
both product and catalog. Actual inputs and record contents retain their sizing.

Twenty-one frozen-build integration tests and six source-browser regressions pass.
Reflow, keyboard anchors and four scoped accessibility rules pass across eight
light/dark, 320/1280px and 100/200% text combinations. TypeScript and Svelte pass.
The old invalid-money color test was updated to use a permitted incomplete draft
instead of letters, which the existing mask intentionally rejects. No product
contract, persisted data or VOID implementation changed. Evidence and limits:
hierarchy verification (SDK file: `artifacts/catalog-hierarchy/verification.json`).

### Available-space layout and UI corrections — 2026-10-16

This increment was verified in `landmarks-web-v70`, renderer
`5d9e6cbc6c780e7defee9370860bc7aa4e62fa7fdf5ccfca2a0a8cc4ce86d4cd`.
Sidebar presentation is `docked | overlay`, measured from the provider's usable
content box against sidebar width plus the layout's explicit reading budget.
It is not a device classification; container changes, padding and larger text
are covered independently. Visible expansion is distinct from the retained
docked preference. The unused device-classification hook was removed.

The hero extends behind the floating sidebar's outer inset. Navigation separates
Explore and Developer groups, gives destinations colored faces, and places the
expanded sidebar disclosure bottom-trailing. Overlay Back is top-leading while
search stays below. Edge reveal/Back and header dismissal follow the pointer until
release. The shared modal motion includes messages, and the transient grip is a
slim mark with a full hit region. Date/select pickers adapt using their actual
owning surface; the calendar starts behind a whole-well trigger. Money displays
an unboxed muted symbol and rejects impossible lexical edits atomically.

The final frozen build passes 33 scoped integration tests. Source evidence covers
sidebar fit/state (3), picker behavior and actual catalog ownership (18), final
surface fit/motion (9), and decimal masks (41), with overlapping regressions not
summed as a global total. TypeScript passes; Svelte reports zero errors/warnings.
Independent visual checks cover light/dark, enlarged text and narrow/wide layouts;
final v70 smoke includes a 2000px/200% docked header. Evidence and limitations:
verification (SDK file: `artifacts/catalog-chrome-revision/verification.json`).

Two unchanged native-reference typography failures were reproduced on v66/v67:
hero size 32px versus 26px and detail line height 28px versus 26px. No full-suite,
native/Safari, physical touch or VoiceOver certification is claimed. The collapsed
sidebar opener remains bottom-leading; its expanded footer toggle is bottom-trailing.
VOID product definition remains deferred by the owner's UI-first instruction.
Notebook/controller data and the public contract are unchanged.

### Shared row alignment — 2026-10-16

This increment was verified in `landmarks-web-v66`, renderer
`5240eef890416750c99421155c9cbc4ef4e3845f33e73fa7055e03b1a9a859b9`.
Collection rows no longer reserve an empty metadata line; their complete content
stack is centered, with the chevron aligned to the heading. Grouped radio/checkbox
rows remove Field's inherited top-aligned control margin. No individual icon
translation or change to product contracts, activation or hit geometry is used.

Targeted source and frozen-browser checks cover light/dark, compact/wide layouts,
enlarged text, wrapping and existing pointer feedback. Independent review confirms
pointer/keyboard activation and identifies two pre-existing limits outside this
change: hidden search-label document overflow at 320px/200%, and an older grouped
panel test expecting a border that is already absent. Evidence and exact scope
are retained in row verification (SDK file: `artifacts/row-alignment/verification.json`).
No whole-page reflow certification or full-suite pass is claimed.

### Button icon rotation — 2026-10-16

This increment was verified in `landmarks-web-v65`, renderer
`f09f3c46176c2d473323efb96c9f11a4a97a9086c8af6910cde8c1350576af4f`.
Button's visual-only `spin` prop rotates marked SVG icons while inheriting the
button foreground. Pending Action uses this ordinary icon path and retains its
existing neutral disabled face, accessible name and geometry. Passive feedback
keeps its existing explicit status accent; reduced motion stops rotation without
removing busy semantics. Targeted source, frozen-browser and independent review
evidence is retained in `artifacts/icon-spin/`. No product contract or controller
data changed. See the verification record (SDK file: `artifacts/icon-spin/verification.json`)
for the separately reproduced pre-existing action-height test mismatch.

### Shared input clear accessory — 2026-10-16

This increment was verified in `landmarks-web-v63`, renderer
`7ed4942e35aed3af1998c36cd7e34d50962ce72d9d9685d1dd98b280d24ed399`.
Text, multiline, masked amount and search fields compose one ClearInput accessory
whenever their visible draft is nonempty. Clearing restores editor focus without
submitting, resets the textarea counter, and preserves Money's currency. Disabled
or read-only inputs remain inert; selectors and calendars are excluded. FieldWell
reserves an inline-end accessory space separately from its passive footer.
Narrow compound wells move their currency prefix to its own row instead of
squeezing the amount label or shrinking its clear target.

Targeted coverage includes local drafts, invalid masks, pointer/keyboard use,
native text undo/redo, mask history, IME composition, compact layouts and existing
search scope. Independent red baselines and final evidence are recorded under
`artifacts/input-clear/`. See the verification record (SDK file: `artifacts/input-clear/verification.json`)
and web behavior (SDK file: `docs/WEB-RENDERER.md`) for native-edit fallback limits. The product
contract and other running previews/controller data remain unchanged.

### Shared textarea character accessory — 2026-10-16

This increment was verified in `landmarks-web-v59`, renderer
`759f05d5375481c7935ba27ce94b011371078225669ba8585e69999f69e635e0`.
Every shared multiline input now has a passive bottom-trailing character counter:
written without a maximum, remaining with one, and explicit excess without
truncation. The existing command schema's maximum flows through forms and the
bank; Unicode code-point counts agree with canonical validation. No new product
validator or submission authority is introduced. The footer reserves its own row,
keeps caption typography, and shares existing focus/error/disabled behavior.
Authored portable multiline hints require `input.length-hint` renderer support.

Independent red baselines, source/browser verification and real light/dark renders
are retained under `artifacts/textarea-counter/`. The live in-app view shows both
modes. Scope and limitations are in the verification record (SDK file: `artifacts/textarea-counter/verification.json`).
The product contract and other running previews/controller data are unchanged.

### Typed decimal masks and dropdown faces — 2026-10-16

This increment was verified in `landmarks-web-v55`, renderer
`7c1a786407cee460d1138457c91305a50fd524d0b245f5adc73fd92d95cab2c1`.
Single-line bank inputs can declare a closed decimal mask with locale and scale.
Money uses that same editor, deriving scale from its currency; the bank specimen
uses `es-AR`. Grouped display never changes exact minor-unit values, rounds, or
converts currencies. Invalid paste/precision stays visible without a value event.
Caret, composition, local undo/redo, owner replacement and delayed acknowledgements
have targeted browser coverage. New flag/symbol Faces compose the existing Avatar
in dropdown triggers and options; visible codes and keyboard names remain intact.
Country flags are explicit metadata, not inferred from currencies.

The portable capability gate now distinguishes decimal masks, selection faces and
new face representations. This is reusable bank/renderer support, not an installed
Capibara financial domain, native adapter, generic regex-mask library or production
money command. Unsupported locale affix/bidi patterns fail explicitly.

All 70 scoped checks pass (53 source, 12 frozen-browser, 5 authoring), alongside
TypeScript and isolated Svelte validation (zero errors/warnings). Real light/dark
captures at 1280/390/320px and the live in-app result are retained under
`artifacts/money-mask/`; initial failures are preserved separately. Very long
amounts retain the input's horizontal text scrolling at narrow widths. The product
contract digest and running Notebook preview/controller/data remain unchanged.
See the verification record (SDK file: `artifacts/money-mask/verification.json`).

### Invalid field color ownership — 2026-10-16

This increment was verified in `landmarks-web-v54`, renderer
`1078f70bed901de4d304211a204e21d85e1666caf0ddbb4c684186ff8ce113a3`.
Invalid fields color their labels with the shared readable error-text token,
not the entire field subtree. Entered values retain their ordinary foreground;
error borders, associated explanations and keyboard focus remain unchanged.
The same rule covers floating wells and ordinary FieldLabel consumers.
Light/dark regression tests exercise text, multiline, money and ordinary fields,
including correction back to valid. Initial failures and actual component renders
are retained under `artifacts/invalid-field-label/`. Notebook data is untouched.

### Shared search fields — 2026-10-16

This increment was verified in `landmarks-web-v53`, renderer
`ecd7f774ae62494564c58e023aecf4145de31f0e7ec901b448d693f70ae8cf39`.
Toolbar search, catalog filtering and loaded collection retrieval now compose one
renderer-private SearchField from the existing shadcn InputGroup and Button.
Every field has a leading magnifier and an embedded Clear search accessory when
nonempty, including whitespace and no-match queries. Clear restores typing focus
without closing search or submitting; disabled/read-only values cannot be cleared.
The external toolbar Close action remains distinct. Duplicate external recovery
buttons and toolbar-only accessory styling are removed. Adaptive compact shells
retain 44px clear targets. Query scope, mounted drafts and authority are unchanged.

Source and frozen-build verification covers pointer/keyboard clearing, callback
counts, scope, focus return, overlay continuity, hover/held feedback, narrow layouts
and theme/text-size variants. An isolated Notebook build verifies collection,
catalog navigation and creation-origin regressions; the running Notebook preview,
controller and data remain untouched. Initial failures and test-harness migrations
are retained in the verification record (SDK file: `artifacts/search-field-anatomy/verification.json`).
This is scoped web evidence, not native-platform or full-suite certification.

### Shared fact states — 2026-10-16

The preceding preview served `landmarks-web-v51`, renderer
`8617e423aa61d0c7311a49b63c5929348972e29f267373d065ef42d520352e57`.
Fact rows and typed information share one passive value component and classifier.
Known content retains its normal emphasis; Empty uses a minus and Unknown a
circled question mark, both with secondary text. An accessible state prefix
distinguishes placeholders from literal stored "Empty" or "Unknown". Whitespace
fallbacks now agree in both consumers, and missing fact keys cannot expose
inherited JavaScript members. No storage, wire schema, title fallback or product
authority changes are introduced.

Targeted source coverage includes zero/literal values, multiline preservation,
reactive state changes, passive focus behavior, light/dark, 320px, 200% text and
increased contrast. Ordinary placeholder contrast measures 5.32–7.98:1 on card
and prose surfaces. All 37 targeted source and frozen-build cases pass, alongside
TypeScript, Svelte (zero errors/warnings) and authoring checks. Frozen-bank and
live in-app captures are retained in the
verification record (SDK file: `artifacts/fact-state-presentation/verification.json`).
The contract digest and Notebook preview/controller/data remain unchanged.
This is scoped Chromium/web evidence, not full-suite or native certification.

### Shared hover and held feedback — 2026-10-16

The preceding preview served `landmarks-web-v50`, renderer
`21a2af82ff5c4fc50ac5d9acb0363fb3394728e40367ea6f8946eddccfd1c8e9`.
Glass action styles now set `background-color` without resetting the shared
hover/held image layer. Sidebar destinations and the compact drawer grip compose
the same Button; custom sidebar children receive its stable feedback attachment
without losing their native markup, href, ARIA or caller events. Navigation focus
is inset so it is not clipped at the first scroll row. Featured and ordinary media
cards use sibling images, leaving action feedback visible above the photo.

The shared feedback strengths, timings, fixed hit geometry, disabled behavior and
system accessibility preferences remain unchanged. Initial regression evidence,
keyboard-focus repair, and fixture corrections are retained in the
verification record (SDK file: `artifacts/hover-consistency/verification.json`).
All 64 targeted cases pass (28 frozen feedback, 10 source and 26 regressions),
alongside TypeScript, Svelte (zero errors/warnings) and authoring checks.
The contract digest and running Notebook preview/controller/data are unchanged.
This is scoped Chromium/web evidence, not full-suite or native-device certification.

### Floating navigation and transient panels

The preceding appearance increment served `landmarks-web-v48`, renderer
`8eaeb064ba01ec1a66820428f806b1c8c3b3e0fe0bcaf116b8f6154064f63e91`.
Shared faces have an accent-tinted fill and border, including muted, image and
fallback states; warning/error faces retain semantic hues. Small floating Glass
controls gain a subtler accent tint. Reading surfaces, large panes, photo pixels
and existing system-transparency behavior remain unchanged. Increased-contrast
face borders use undiluted foreground. This is not a new appearance preference.
Five source cases and 18 frozen-build regressions pass, plus TypeScript, Svelte
(zero errors/warnings) and authoring checks. Landmarks' contract digest and the
running Notebook preview/controller/data remain unchanged. See the
verification record (SDK file: `artifacts/appearance-tint/verification.json`) and
live bank capture (SDK file: `artifacts/appearance-tint/final/live-bank.png`).

Compact navigation now uses the same shadcn `Dialog.Content` panel as task
transients, with a narrower width and leading-edge motion. Shared panel tokens
provide 28px corners, 12px screen insets, Glass and accessibility fallbacks.
Persistent navigation keeps its layout and adopts the same radius/material.
The product name occupies the header. A bottom ghost disclosure replaces the
top toggle; its external opener disappears while the panel or search is open.
Collapsed desktop content reserves space above the opener. Shared hover and
held feedback remain intact, and compact/coarse targets remain at least 44px.

The preceding navigation increment at `127.0.0.1:4280` served `landmarks-web-v46`, renderer
`cc66770f9d13692facf979476c466702c87150511f61f6845e006b63bea838aa`.
Landmarks' contract digest is unchanged. On this frozen build, 38 navigation,
search and material cases pass. Isolated `notebook-navigation-v3` passes 11
transient, slot, enlarged-reading and tag-contrast cases. Verification exposed
and repaired a pre-existing accent-label contrast issue in the shared tinted
foreground, without weakening the 4.5:1 test threshold. TypeScript and Svelte
checks pass with zero Svelte errors/warnings. Notebook's running controller,
preview and data remain untouched. See the
verification record (SDK file: `artifacts/navigation-panel/VERIFICATION.md`).

VOID is the new intended reference product, not yet an implemented operating
system. Its product definition (SDK file: `docs/VOID-PRODUCT.md`) retains collaboration,
identity-kind-independent authority, tasks, connections and media requirements.
Admin access to private content and the encryption trust model remain owner
decisions. Three branding directions (SDK file: `artifacts/void-brand-options/comparison.html`)
are available for review; none has been adopted. The current public catalog
continues to identify itself honestly as Landmarks.

### Shared Settings visual language — 2026-10-16

The owner superseded the Indigo visual language, preserving whole-well input
anatomy as the explicit exception. The shared shadcn foundation now uses system
typography, neutral system-aware light/dark palettes, quiet content groups,
inset separators and functional Glass. The Landmarks profile supplies geometry,
not a separate forced-dark skin. Public bank, product catalog and typed bench
share one specimen grouping primitive; unavailable capabilities stay explicit.
The 240px sidebar retains full labels. Regular nonhero toolbars identify the
current view; compact layouts keep search/actions below, with exclusive expanded
search and its retained workspace-wide material. Motion and system accessibility
preferences remain authoritative.

Verification also repaired shared semantic/interaction failures: invalid required
ARIA on a Select button, nested heading ranks in embedded page examples,
Calendar glyph crowding and local keyboard revelation at 200% text, and
oversized standard transient chrome. The Calendar header stays separate from
its two-dimensional scroll grid, with an inset visible focus ring. Complete
reading content is not clamped or reduced in size. Approved 62px well geometry
and whole-well feedback remain intact.

The design decision (SDK file: `artifacts/settings-language/DESIGN-DECISIONS.md`) and
verification ledger (SDK file: `artifacts/settings-language/VERIFICATION.md`) preserve
baseline and intermediate failures. These are web-renderer changes, not native
Swift/Android implementations, Apple approval or pixel-parity certification.
Landmarks' contract digest remains
`7d179eb9d6cbe2c5622fd71f12d55c789a88750562846f684f0ca778f7b61963`.
Notebook's controller/data and running preview are untouched; isolated
`notebook-settings-v4` retains its contract, distribution and surface digests.
Its 8 regression cases (SDK file: `artifacts/settings-language/notebook-settings-v4/regression.tap`)
and Svelte check pass (zero errors/warnings).

This preceding increment served frozen
`landmarks-web-v41`, renderer revision
`109a3cde9b454c6413a9844333e5312c1c4d27fb727dc2788dc61fa7d0e28a01`.
Its 10 independent browser cases (SDK file: `artifacts/settings-language/landmarks-web-v41/independent-10.tap`),
38 interaction regressions (SDK file: `artifacts/settings-language/landmarks-web-v41/regression-38.tap`)
and 21 source contract cases (SDK file: `artifacts/settings-language/landmarks-web-v41/source-21.tap`)
pass. TypeScript passes. Live in-app-browser captures show the
desktop bank (SDK file: `artifacts/settings-language/landmarks-web-v41/live-desktop-bank.png`)
and compact search (SDK file: `artifacts/settings-language/landmarks-web-v41/live-mobile-search.png`).
This is scoped verification, not a full-suite, native-device or WCAG-certification claim.

### Coherent inspiration and shared avatars — 2026-10-16

This preceding increment ran frozen `landmarks-web-v35`. The inspiration card no longer
invents a traveler called “Your trip” between its sample destination and facts;
the canonical bank keeps its real avatar specimens. Shared shadcn/Bits avatars
have a visible secondary-surface fallback, an unblended person outline, one
accessible adjacent identity and wrapping full names. All four permitted fallback
characters remain visible using a compact decorative type role; object/status
faces retain their existing tones and geometry.

Validation: 3 frozen-build cases (SDK file: `artifacts/avatar-identity/landmarks-web-v35/final-frozen.tap`),
2 independent source cases (SDK file: `artifacts/avatar-identity/final-source-v35/final-source.tap`)
and 18 catalog/message/toolbar regressions (SDK file: `artifacts/avatar-identity/final-regression.tap`)
pass, including narrow layouts, 200% text, failed images, actual light/dark themes,
long names and four wide initials. TypeScript and Svelte checks pass (zero
Svelte errors/warnings). The live capture (SDK file: `artifacts/avatar-identity/landmarks-web-v35/live-verification.png`)
shows the corrected card. Baseline v33 failures and the
intermediate evidence caveat (SDK file: `artifacts/avatar-identity/landmarks-web-v34/EVIDENCE-NOTE.md`)
remain recorded; this is scoped verification, not a full-suite green claim.
The intended fixture/copy correction changes Landmarks' contract digest to
`7d179eb9d6cbe2c5622fd71f12d55c789a88750562846f684f0ca778f7b61963`.
Notebook's contract, running preview, controller and data are untouched.

### Compact macOS-inspired messages — 2026-10-16

This preceding increment ran frozen `landmarks-web-v33`; isolated Notebook
validation uses `notebook-dialog-v5`. The running Notebook preview and its data
are unchanged. Product contract/distribution digests remain unchanged.

Problem messages retain shadcn Dialog, the shared Toolbar/SurfaceFrame and the
canonical secondary Close action. A renderer-private message presentation centers
face, visible native title and description in a compact 20rem panel. It removes
only the duplicate header dismissal, not task navigation. Non-message frames
reject this presentation. Separate vendor typography variants prevent registry
defaults competing with message type roles. Short windows reduce decoration,
never text size. System transparency/motion preferences remain authoritative.

Validation passes: 6 independent frozen-build cases (SDK file: `artifacts/macos-messages/landmarks-web-v33/final-independent-run.tap`),
8 source identity/lifecycle/guard/accessibility cases (SDK file: `artifacts/macos-message-source-regression-v33.txt`),
4 isolated Notebook cases (SDK file: `artifacts/macos-messages/notebook-final-v5.tap`),
and 8 whole-well regressions (SDK file: `artifacts/macos-messages/well-final-v33.tap`).
The shared frame/toolbar contract checks also pass (22 cases). TypeScript,
Svelte (zero errors/warnings) and generated authoring checks pass.
The longer warning also remains fully readable at 320×568 and 200% text;
extreme long copy remains scrollable while Close stays visible. Actual light/dark
palettes are checked separately from Landmarks' forced-dark benchmark profile.
The in-app capture (SDK file: `artifacts/macos-messages/landmarks-web-v33/live-verification.jpg`)
shows the current alert, left open for review.

The rejected v29 primary-dismissal attempt, v32 short-window clipping, initial
test harness/DOM-selector mismatches and earlier evidence remain preserved.
No bank guard was weakened. This is a macOS-inspired web composition, not native
pixel parity or a new prompt/confirmation capability. Previously recorded
unrelated legacy-selection test failures remain outside this increment.

### Whole-well selection increment — 2026-10-16

This preceding increment shipped frozen `landmarks-web-v28`; isolated
Notebook validation used `notebook-field-well-v2`. The running Notebook preview
and its approved data remain untouched. Both contract digests are unchanged.

Standalone selection now has one native shadcn Select/Button owner spanning
the entire well, including caption, value, chevron and padding. Hover/press paint
the outer plane; the inner content compresses together without changing the
border/hitbox. Text and money retain InputGroup and share the same flowing
caption/value geometry. Currency remains independently operable from amount.
Accessible selection names include the visible caption and current value.

Validation: 10 independent whole-well/accessibility cases (SDK file: `artifacts/field-well/landmarks-web-v28/final-independent-run.txt`),
14 current-contract regression cases (SDK file: `artifacts/field-well/regression-v28.tap`),
1 light/dark axe and narrow-layout case (SDK file: `artifacts/field-well/accessibility-v28.tap`),
and 3 isolated Notebook/geometry/wrapping cases (SDK file: `artifacts/field-well/notebook-field-well-v2/notebook-geometry-wrapping.tap`)
pass. TypeScript, Svelte diagnostics (zero errors/warnings) and generated
authoring checks pass. In-app verification opens the selector by clicking the
caption and top padding, selects Second option directly and restores focus after
Escape; live capture (SDK file: `artifacts/field-well/landmarks-web-v28/live-verification.jpg`).
Chromium touch cancellation is synthetic, not physical-device qualification.

The initial v27 broad run (SDK file: `artifacts/field-well/regression-v27-v1.tap`) remains
preserved: 18/25 passed. Six failures expect the superseded modal/sheet selection
and confirmation behavior; those legacy tests still need reconciliation. The
seventh exposed a real accessible-name mismatch, corrected and rechecked in v28.
The full legacy suite is not claimed green. Independent v26 evidence reproduced
caption/padding misses, but its first appearance helper measured the inner stack;
that measurement caveat and a corrected native-pointerdown cancellation
expectation are retained alongside the original failed evidence. Shared geometry
assertions were not loosened; only the selector value measurement follows its
new span instead of a nested button.

### Focused search and material increment — 2026-10-16

The preceding increment was verified on frozen `landmarks-web-v26`, paired with
isolated `notebook-scroll-edge-v8`. Search starts as a magnifier and expands
across the available toolbar, with a close X and no competing toolbar actions.
Compact layouts move the toolbar below content. Every query state stays on one
workspace-wide Glass layer, including beneath navigation; local drafts and the
originating page remain mounted. Outside pointer/focus dismissal, Clear, explicit
result activation, Escape/IME and return-to-result continuity are tested separately.

`ScrollEdges` now shades rather than blurs content. Only actual panes use Glass;
the sidebar's current-image extension is clipped to its silhouette without a
separate ribbon or exposed photographic gutter. System reduced-transparency,
contrast and motion preferences remain authoritative. Notebook's running build
and data were not repinned or changed.

Evidence includes 41 catalog regression cases (SDK file: `artifacts/public-catalog-benchmark/regression-v26.tap`),
26 independent search/sidebar cases (SDK file: `artifacts/public-catalog-benchmark/search-sidebar-v26-responsive-ready.tap`)
and edge/material plus isolated Notebook checks (SDK file: `artifacts/scroll-edge/final-v26-v8-edge-shading-notebook.tap`).
The previous v25 search failures (SDK file: `artifacts/public-catalog-benchmark/search-sidebar-v25.tap`)
and pointer/focus trace (SDK file: `artifacts/public-catalog-benchmark/search-pointer-trace-v25.json`)
are preserved: inspecting focus during its temporary BODY state prematurely
dismissed a real input click. The correction honors internal focus destinations
and checks unresolved focus after the browser completes the transfer. A separate
compact focus-ring probe initially sampled obsolete desktop coordinates during
responsive adaptation; the failed run and stale crops remain alongside the
corrected test, which waits for the provider's actual compact layout.
Earlier edge tests and material measurements remain historical, not evidence
for superseded visual requirements. These checks use Chromium, synthetic IME
events and the local in-app preview; they do not qualify real assistive technology,
physical mobile keyboard behavior, Safari or native-platform parity.

Known visual finding: search backdrop blur retains fine detail at the outermost
viewport edge in Chromium. A striped pixel probe (SDK file: `artifacts/public-catalog-benchmark/search-edge-probe-v26.json`)
measures about 49% residual stripe contrast at the last pixel versus 1.4% at
40px inward. Overscan and compositing-boundary variants did not resolve it. This
remains open; functional test success does not establish complete visual parity.

## Implemented and checked

The foundation correction is tracked in evidence 017 (SDK file: `docs/EVIDENCE-017.md`); the subsequent
whole-experience iteration is tracked in evidence 018 (SDK file: `docs/EVIDENCE-018.md`). Ordinary reading
is now nonmodal with contract-derived prose, exact-version review changes lead the
confirmation, field feedback derives from canonical validators, and navigation restores
the human's place and focus. Catalog search and counts derive from the same bank.
These changes do not establish complete bank coverage, native parity or new product
input capabilities. Collection retrieval is explicitly local to loaded exposed values;
large-collection paging, screen-reader operation
and cross-browser/device qualification remain open. See exact frozen evidence below
before treating an individual test run as acceptance of the integrated revision.

- Closed product/object shape definitions with required text and bounded integer
  facts. Text length uses the JSON Schema validator's Unicode code-point semantics.
  Integer values are restricted to JavaScript's safe integer range; this is not
  an arbitrary-precision quantity or money type. Bounds are explicit in schemas.
- Bootstrap runtime grammar and TypeScript authoring types share TypeBox schemas.
- Unknown vocabulary and extra semantic fields fail compilation. Contradictory
  ranges, duplicate object identities and unknown lookups are rejected.
- Generated JSON Schema is the actual input to shared Ajv validation. No coercion,
  default insertion or removal of unknown data is enabled.
- Source snapshots and generated schemas cannot be modified through caller
  references. JSON normalization rejects accessors, cycles and non-JSON data;
  this is not a sandbox for hostile code executing in the same process.
- A versioned JSON-serializable shape projection and a client validation entry
  that bundles for the browser without the compiler, Node crypto or authoring code.

Historical evidence before the current bank integration: 166 root tests and 19
real browser tests passed. Current integrated evidence and remaining limits are
recorded separately in bank maturity evidence (SDK file: `docs/EVIDENCE-016.md`). See build evidence (SDK file: `docs/EVIDENCE-013.md`)
and visual bank fidelity (SDK file: `docs/EVIDENCE-014.md`). The follow-up
typed composition correction (SDK file: `docs/EVIDENCE-015.md`) closes the arbitrary drawer-child
path and checks chrome geometry, well containment, semantic feedback and row presses.
The general derived verification includes three interpreter mutants, independently
rejected by persisted-effect checks.
Svelte diagnostics report zero errors/warnings; production build succeeds;
Notebook inspection and local runner execute;
the bundled draft skill passes the skill creator's structural validator.
The intermittent PostgreSQL checkout failure recorded in authoring evidence (SDK file: `docs/EVIDENCE-008.md`)
was reproduced and corrected with a connection-lifetime error guard. The regression
failed before the fix, then passed with real backend termination tests, 20 repeated
recovery groups and five full-suite runs. See recovery evidence (SDK file: `docs/EVIDENCE-009.md`)
and all Notebook journey cases (SDK file: `docs/JOURNEY-TESTS.md`). Broader resilience is not implied.
See initial evidence (SDK file: `docs/EVIDENCE-001.md`), contract evidence (SDK file: `docs/EVIDENCE-002.md`)
and dependency evidence (SDK file: `docs/EVIDENCE-003.md`). See local execution evidence (SDK file: `docs/EVIDENCE-004.md`)
for real PostgreSQL integration and the persistent runner. Availability integration (SDK file: `docs/EVIDENCE-005.md`)
adds real database failure/recovery, credential lifecycle and live observer evidence.
The Svelte increment (SDK file: `docs/EVIDENCE-006.md`) adds the running human surface, standalone
validation, local HTTP transport and browser integration evidence.

## Contract compiler increment

- Literal-preserving authoring helpers, enum/principal facts, `FactsOf` and `InputOf`.
- Typed create/update expressions, read/mutation journeys, ownership declarations,
  human/agent surface definitions and controller/client distribution definitions.
- Closed runtime grammar from TypeBox also supplies the descriptor TypeScript types.
- Semantic reference checking, complete create effects, field assignment compatibility,
  immutable owner declarations, enum/range checks, language/navigation coverage.
- Canonical command input schemas derived from object facts and shared with surface
  projections; private policy/effect bodies are not included in those projections.
- Web/iOS/CLI distribution planning references the same human interaction artifact.
  Plans report `unbuilt`; renderer names are requirements, not installed capabilities.
- Compiled metadata is recursively frozen and readonly in TypeScript. Unsafe casts
  and untyped input still pass through runtime grammar and semantic validation.
- Negative static examples are checked at their expected source lines with
  suppression removed in memory, alongside positive controls and raw-contract tests.

The supported policy vocabulary currently covers private ownership only. It does
not redefine all TPA policies as ownership policies. The finite journey/navigation
families reject unsupported compositions rather than pretending universal support.

## Dependency and availability increment

- Every read/mutation journey declares a controller role and additional dependencies.
  Unknown references, cycles and controller/object mismatches fail compilation.
- Transitive dependencies are derived and projected identically to human and agent
  surfaces. No Internet-online boolean is a product availability rule.
- Each client distribution binds its complete requirements locally or remotely.
  Local bindings need no remote service. Missing/duplicate/unused bindings fail;
  remote services must explicitly provide the dependency and serve the surface.
- `createAvailability` consumes trusted compiled plans and normalized adapter reports.
  It updates per-journey readiness through subscriptions, expires observations,
  rejects obsolete-session callbacks, and distinguishes unknown, stale, incompatible,
  unreachable, session-required and unavailable dependencies.
- Tests cover local, remote and mixed bindings; the mixed provider is a test fixture,
  not a new rule added to Notebook. All three Notebook journeys require `notes`.
- Client availability bundles without Node, compiler, dependency or binding authoring.

The client module is availability computation, not a controller executor or network probe.
`dependenciesReady` grants no authorization and does not imply an executable assembly.
Distribution bindings alone do not install adapters. Local execution now has a
separate explicit bootstrap. Remote adapters remain unavailable; the new explicit
distribution build boundary currently supplies only the existing Svelte web renderer.

Shared-controller authoring now checks object membership rather than requiring
every owned object to have the journey's object type. The runtime compiler still
rejects actual ownership mismatches. A two-object fixture executes six journeys
in one local store, with per-object identity isolation and controller reopen.
This does not add multi-object command effects or change the single-object human
renderer. See shared-controller evidence (SDK file: `docs/EVIDENCE-010.md`) for verification results.

## Local controller increment

- `openLocalController` installs only a compiler-produced contract in a private local
  PostgreSQL database. Product, contract digest, controller role and schema revision
  must match on reopen; there is no implicit migration or remote fallback.
- Local host administration issues random credentials; only their SHA-256 hashes
  are stored in PostgreSQL. Credentials resolve durable identities and are checked
  on every operation, including expiration/revocation and again before commit.
- Sessions admit an exposed journey, prepare a stable effect and accept only its
  exact confirmation digest. Run, actor, surface, contract and subject are bound.
- The interpreter consumes command expressions, conditions and ownership from the
  existing contract. No Notebook-specific rules exist in the executor.
- Object changes, completed run state and receipts commit in one PostgreSQL
  transaction. Row locks and expected versions reject competing stale preparations.
  Reaccepting the same intent returns its receipt; recovery does not replay writes.
- Real tests cover ownership, rollback, retries, concurrent acceptance, revocation,
  expiry under contention, durable restart and recovery from a process that returned
  no result. Tests and runner use private Unix sockets; no IP listener is started.
- `products/notebook/run-local.ts` is a persistent developer runner. It provisions
  its own cluster and OS-private credential file under `.local/notebook`, and stops
  that cluster after each invocation. It is not the Human Terminal renderer.

## Real local availability increment

- `session.watchAvailability()` derives the exposed journeys and their dependencies
  from the compiled product, and observes only the installed controller role.
  Other roles remain unknown; a healthy local store does not certify them.
- Read-only PostgreSQL probes check the actual installation, durable writable-primary
  settings and the session credential. No Internet status or injected readiness
  is used. The public observer exposes snapshot, evidence, subscribe and dispose only.
  Evidence includes its remaining freshness lifetime for conservative transport.
- Polling recovers from real PostgreSQL shutdown/restart. Idle connection errors
  invalidate observations without crashing the host. No command is automatically retried.
- Observations expire independently of slow probes. Late completions cannot revive
  a disposed observer. Controller close disposes observers and drains the pool.
- Every session operation also rechecks installation compatibility, independent
  of availability. Readiness remains dependency evidence, never authorization.
- The developer runner's `watch` operation prints real transitions and shuts down
  cleanly on SIGINT/SIGTERM. No visual renderer or remote monitor is implied.

This boundary trusts the host process, its OS user and database administrator.
Application ownership is enforced between credentialed sessions; this is not a
sandbox against arbitrary code or another process running as that same OS user.

## Svelte human surface increment

- A finite English, single-object text-record renderer consumes the compiled human
  artifact, ordered fields and standalone validators generated from command schemas.
  Unsupported form primitives and compositions fail the renderer build.
- A loopback HTTP host bridges a credentialed local session to that renderer.
  Browser access uses a private single-use invitation and an HttpOnly/SameSite cookie;
  origin, Host, exact contract and closed request shapes are checked. The controller
  credential stays server-side. This is not a production Internet-facing auth system.
- Browser polling transports real session availability with expiring evidence. Each
  action checks its own journey dependencies; the observer never accepts a command.
- An unavailable controller leaves the mounted editor and draft alive. Reconnection
  refreshes reads in place, never replays a write. Uncertain confirmation checks the
  original receipt; an explicit retry uses the same intent and confirmation digest.
- Subject offers evaluate the controller's existing ownership and condition rules;
  the surface does not restate `state === active`. Acceptance still rechecks them.
- Real browser tests cover create/read/archive, PostgreSQL stop/restart, interrupted
  transport, lost acceptance response, identity revocation and HTTP access boundaries.
  Desktop/light and mobile/dark screenshots were inspected. No full accessibility,
  cross-browser or native conformance is claimed.

## Object context and optional review increment

- Human contracts declare an explicit `submit` or `review` commit mode for every
  exposed mutation. Missing/unknown modes, unexposed references and modes on reads
  are rejected. The frozen projection and installation digest include that choice.
- Notebook creates directly from its form. Reading a note mounts `ObjectContext`,
  showing facts and an Actions section, without a mutation-journey footer. Its
  Archive action still enters the contract-required review before acceptance.
- Context Actions use shared destination rows with title and trailing chevron,
  not command CTA styling. Keyboard entry to Archive leaves the note active;
  the separate confirmation performs acceptance. The catalog reuses this composition.
- Both modes use the same admitted run, exact prepared effect and atomic acceptance.
  The controller's `prepare` remains noncommitting; the human client's `invoke`
  orchestrates the declared interaction. Readiness and a review screen grant no authority.
- A draft changed during preparation cancels that invocation before acceptance.
  Once acceptance starts it refers only to the submitted snapshot; newer edits survive.
  An uncertain result enters recovery, not an unsolicited review or a new submission.
- Tests change only the contract to prove both modes against real PostgreSQL, check
  invalid input and double invocation, and verify context/Actions in Chromium.
  No controller migration or Tres Marías integration was added. See
  context and review evidence (SDK file: `docs/EVIDENCE-007.md`).

## Portable authoring increment

The authoring bundle pairs the version declared in SKILL.md with this exact implementation, generated
API/Notebook/support/runtime references, independent tests and a content manifest.
References are checked against source; portable exports exclude runtime data and
refuse overwriting destinations. This improves onboarding and reproducibility,
not SDK execution semantics or full behavioral certification of an agent using the skill.
See `AUTHORING.md` at the SDK root.

Skill releases now include a changelog and update protocol. Export derives the
version from SKILL.md and requires its latest changelog entry; verification rejects
false skill/SDK manifest metadata as well as file drift. The two additional release
tests passed and the skill structural validator passed. No consumer installation
or public registry publication is implied.

## Distribution build increment

`buildDistribution` resolves a validated target against installed SDK builders.
The first is `svelte-web`: one generic template consumes the compiled interaction
and derived validators, without a Notebook-owned application or product callbacks.
CLI, native and controller builds fail explicitly. Unsupported primitives and
bindings are rejected rather than silently omitted.

The output records contract, surface, distributions, renderer source/lockfile/Node
revision and every file hash. `serveBuiltLocalSurface` verifies those against a
genuine local session before importing a private copied handler. Builds and live
session authority remain separate. Build consistency is not cryptographic origin
attestation or conformance. See distribution builds (SDK file: `docs/DISTRIBUTION-BUILDS.md`).

## Not implemented or claimed

- Arbitrary journey graphs, external effects, outbox and provider reconciliation.
- Remote controller transport, federated identity and adversarial process isolation.
- Alternative local stores, native hosts and automatic distribution installation.
- Full language/profile conformance, agent protocol renderer or native hosts/renderers.
- Package resolver, compatibility/migration, exact build attestation and signing.
- Full product inference and cross-language generation (including Swift bindings).
- Device/native parity, offline browser installation, full visual/accessibility gates.

Notebook compiles into checked, frozen plans marked `not-installed`; interaction
format is now `desert.interaction/6`. The separate local bootstrap installs execution
against PostgreSQL. The explicit web bootstrap now serves a real Svelte GUI over
loopback HTTP. The explicit build entrypoint supports only the Svelte web target;
there is no generic `execute` bypass or automatic installation.
No complete offline-app or device-quality claim follows from compilation.
`describe()` and `executionPlan()` are trusted compiler
inspection APIs; client consumers use the deliberately limited `surface()` projection.

## Known engineering limits

The independent bank audit reproduced over-disclosure of unexposed non-owner facts
in prepared mutation responses. Human review rendering filters these facts, but the
transport response does not yet share that restriction. This is an open controller
boundary, not a cross-owner bypass; see the exact finding (SDK file: `docs/BANK-SECURITY-FINDING.md`).
Do not treat the current system as production-ready for confidential field projection.

The bank is not complete Tres Marías coverage. Select, popover, local-file,
cardinality options, exact money, calendar date, semantic tags, images and avatars
are renderer-only mechanisms, not product authoring or upload support. Catalog
0.2.0 includes their typed specimens; it does not promote them into product facts.
See the coverage inventory (SDK file: `docs/BANK-COVERAGE.md`) before claiming capabilities.

`createShapeValidator` compiles trusted schemas at runtime using Ajv code generation.
That is unsuitable for a strict web Content Security Policy that forbids dynamic
function construction. The Svelte build now uses standalone build-time validator
generation instead; it does not ship the Ajv compiler or allow `unsafe-eval`.
Unknown remote schemas must not be treated as trusted input. The projection has no signature.

Shape identity does not include the complete toolchain or mechanisms and is not
an execution authority token. Query/source provenance, sensitive field projection
and authorization require separate future contracts. Never export an entire future
server contract merely because the current specimen contains only public shapes.

## Next increment

Extend the demonstrated human renderer and future agent renderer without duplicating
execution. Additional distribution builders need their own runtime and parity evidence.
Expand evidence for host crash/power loss, identity lifecycle and installation before
claiming a complete offline application. Preserve the same admission/acceptance boundary
when adding remote transports. No synchronization or automatic write queue is implied.
See execution dependencies (SDK file: `docs/EXECUTION-DEPENDENCIES.md`).
Keep changes small enough for the owner to read the product definition directly.

## Pending architectural review

The earlier Notebook-specific evidence increment is preserved in
EVIDENCE-011.md (SDK file: `docs/EVIDENCE-011.md`). The general testing entrypoint now derives
obligations, inputs and preparation paths directly from any supported product
definition; no product-name branches or duplicate fixture declarations are used
in `src/testing`. Notebook and the two-object/six-journey product execute the same
checks. Renamed fields/identifiers, additional bounded integer inputs and a new
read journey also work without new fixtures.

The checker observes persisted effects independently from the production interpreter.
Three isolated interpreter mutations (preservation, ownership, guards) are rejected.
Missing generated witnesses remain blocked. Immutable in-process reports require
complete passing inventories and the exact contract/mechanism revision. They are
not portable signed evidence. Read derived verification (SDK file: `docs/DERIVED-VERIFICATION.md`)
and observed evidence (SDK file: `docs/EVIDENCE-012.md`) for finite bounds and reproduction.
This is general local-session verification within the installed vocabulary, not
exhaustive behavior, UI/MCP certification or complete TPA conformance.

The owner asked to discuss Capacitor with skeptics later. The question is whether
it can meet the required native experience and API integration, not whether it can
produce an IPA. No review was dispatched during this increment. See `STACK.md`.
