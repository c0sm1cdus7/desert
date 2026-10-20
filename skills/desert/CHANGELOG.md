# DESERT skill changelog

Every distributed skill revision includes this history, migration instructions
and matching SDK references. Entries describe agent-facing changes, not merely
file edits. Published snapshots remain immutable. Dates are YYYY-MM-DD.

## 0.12.0-draft — 2026-10-15

### Changed

- The owner's later decision explicitly replaces the old universal transient
  chrome rule. Selects and contextual popovers are nonmodal and anchored, without
  overlay or toolbars. Activating a permitted option commits its local value
  directly; no staged candidate or Confirm step is required.
- Task/dialog frame revision 6 removes the selection frame. The deprecated
  `selection.confirm` intent remains recognized for bank compatibility only,
  without a current host; the product dispatcher still rejects it.
- Toolbars are borderless and share ordinary circular/capsule Action faces.
  Container rows and field wells are not standalone buttons. A genuine step
  wizard is the only scoped exception, but no wizard contract is installed.
- The native mapping preserves the same logical choices and events through
  future platform-native adapters, not a second manually authored product model.

### Compatibility and migration

Read SKILL.md, web-renderer, runtime and support references. Rebuild local surface
artifacts using `desert.surface-frame/6`; revision 5 is not silently interpreted
as revision 6. Bank-node/control-node versions and controller semantics remain
unchanged. Do not migrate or repin Notebook or its data. This is a working local
draft, not an exported/verified bundle or a global skill installation. Generated
references and build evidence must be refreshed only after source freeze.

### Not included

No new product input families, wizard authoring, Swift/Android implementation,
native adaptive-popover parity or new claim of full accessibility/conformance.
Historical modal-select screenshots/tests do not approve the revised behavior.

## 0.11.0-draft — 2026-10-15

### Changed

- Experimental public catalog compiles declared records, logical media, grouping,
  exposed search fields and local exercises into the same typed bank used by web
  product and diagnostics. Catalog inventory advances to 0.3.0 with three new families.
- Landmarks imports Apple's sample data for a private local benchmark. Photos remain
  external host bindings: the sample license excludes them from the redistribution
  grant. Builds contain logical identities and hashed bindings, not bundled photos.
- Portable schemas, typed events and explicit requirements prepare future adapters.
  JSON Schema is not sufficient by itself: reference integrity, selection and other
  semantic validations also apply. UIKit informs all surface implementations; web
  continues to compose shadcn-svelte, not a web port of UIKit.
- Related collection rows and choice options share one panel owner, with internal
  separators and stable boundaries during press feedback. Field wells share label
  and value geometry. Transient placement budgets include both toolbars; reduced
  transparency removes blur without erasing the underlying page.
- Field preserves explicitly intrinsic children such as Calendar while ordinary
  inputs stretch naturally. The reference profile separates filled-primary and
  primary-text colors so small labels remain readable in normal, hover and press
  states. These contrast corrections intentionally differ from literal Apple pixels.
- Global catalog search leaves detail; Back restores the originating bank or home,
  focus and local draft. Catalog CTA and Back use the same registered Action owner.
- Every exposed fact requires a nonempty qualified human label; incomplete standalone
  and composed fact nodes fail validation instead of rendering unlabeled values.

### Compatibility and migration

Read SKILL.md, public-catalog and web-renderer references. Public catalogs use their
own build/host entrypoints; do not pass them to the controller-backed product runtime.
Existing Notebook controller/data are not migrated or repinned. This is an unexported
local draft, not installation into another project or a published portable release.
Rebuild older catalog snapshots against the updated fact-label validation rather
than mixing an old artifact with newer source validators.

### Not included

No Swift/Android renderer, native Liquid Glass compositor, pixel-parity certification,
map, persistent favorites/collections, booking, uploads or accepted travel commands.
Local controls are not newly installed controller input families. Diagnostic gaps
remain explicit; gallery coverage does not establish product execution capability.

## 0.10.0-draft — 2026-10-15

### Changed

- Frame revision 5 carries exposed multiline fact references and field-error feedback.
  Ordinary object reading is nonmodal; declared multiline needs also govern prose.
  Blank and unknown presentation fallbacks never rewrite domain facts or constraints.
- Core and standalone input validation share immutable diagnostic issues. Touched
  fields explain invalid input; pristine fields stay quiet and newer writing survives
  in-flight commands. Shared FieldError contrast is measured on actual product surfaces.
- Dismissal channels consume the same typed navigation intent. Cancellation restores
  context and focus; successful commands focus the resulting object. Creation retains
  its originating reading context and scroll position when cancelled.
- Review can lead with changed exposed facts only against an exact object/version
  baseline. Missing or stale information never supplies an invented before value.
- Collection filtering is explicitly local to already-loaded, exposed collection
  values, with declared-field ordering. It neither searches private/detail-only facts
  nor invokes a journey. Catalog search also preserves mounted specimen edits.

### Compatibility and migration

Read the updated web-renderer and support references. Rebuild with matching source
and use frame revision 5; do not combine it with revision 4 frames or generated
references. Product/controller, distribution and surface installation digests remain
unchanged; no store migration or repin is authorized. This is a local draft update,
not publication, a portable release, or installation into another agent's project.

### Not included

No additional product input families, server-side search, paging, native certification
or complete TPA conformance. Nine control families remain bench-only. Actual assistive
technology and device qualification, the prepared-response exposure finding and the
documented custom gesture boundary remain open. A bounded independent web review is
not Apple approval or proof that all future products are visually accepted.

## 0.9.0-draft — 2026-10-15

### Changed

- Web renderer bindings now check per-entry props and control events, not merely
  catalog names. Wrong components, nodes and callback families are rejected.
- Surface frame revision 4 puts the typed face in the header. Message content is
  text; error/warning severity belongs to that header identity.
- Toolbar operations carry typed journey/back/accept/recover/close intents. Product
  journey names cannot collide with renderer operations; form and dismissal checks
  use operation meaning, never labels, icon names or reserved product IDs.
- Shared shadcn field wells, option rows, Avatar-based faces, Dialog/Popover
  presentations, Spinner and Empty compositions replace duplicated construction.
- Critical message headings wrap; media failure preserves geometry. Typography
  follows explicit shared roles rather than broad catalog selectors.
- Money owner updates reconcile display and obsolete errors while self-edit
  acknowledgements preserve lexical drafts without feedback events.

### Compatibility and migration

Read web-renderer and support references. Rebuild with matching source and use
frame revision 4; do not mix it with earlier body-face or string-action contracts.
The product/controller contract and installed data are unchanged; no store repin
or migration is authorized. This draft has not been published, bundled for another
consumer or installed in another agent's project.

### Not included

No new product-bound money/date/options/media, uploads, complete bank, native
parity or visual acceptance. Prose reading, collection/navigation composition and
custom gesture foundations remain open. A passing type or browser suite is not
consumer-quality certification; the prepare-response security finding also remains.

## 0.8.0-draft — 2026-10-15

### Changed

- Catalog 0.2.0 includes nine renderer-only control families, with states derived
  from canonical typed specimens. This is not product input support.
- Transient hosts require shared leading/bottom Close or Back, including locked
  states and a primary CTA. Information popovers use anchored/modal chrome and
  compact content-height sheets. Error messages use closed message frames.
- Buttons, destination/disclosure rows and calendar actions reuse press behavior;
  typography, chevrons, focus and semantic contrast use shared renderer rules.
- Press feedback compresses only the shared content layer, never the hit target,
  container or separators. Hover and held states are exclusive; leaving the target,
  cancelling a touch or losing keyboard focus clears the held feedback. Reduced
  motion retains non-motion feedback. Native activation remains owned by the control.
- Compact shared chrome bounds long titles while keeping their full text in the
  reading area; enlarged text does not move the footer outside the surface.
- Recovery feedback identifies the pending action and stays in the active surface;
  uncertain results are not described as known failed writes.

### Compatibility and migration

Read the updated web-renderer and support references. Rebuild with matching source,
lockfile and Node revision; do not mix catalog revisions. The product/controller
contract is unchanged; no store repin or migration is authorized. This source
revision has not been installed into another agent's project or published.

### Not included

No complete Capibara/Tres Marías inventory, product-bound money/date/options/media,
uploads, native parity or full conformance. Preserve the open security finding and
independent audit reports; renderer-only controls cannot close those gaps.

## 0.7.0-draft — 2026-10-15

### Changed

- Adds the renderer-neutral, typed desert.human-interaction@0.1.0 bank and the
  matching Svelte binding. Unknown primitives, unknown input references and
  incomplete renderer declarations are rejected.
- Human surfaces may select input.text or input.multiline for exposed text inputs.
  Field order, requiredness and validation still derive from canonical contracts.
- Reuses audited Tres Marías/shadcn visual pieces, with provenance and licenses;
  introduces drawer lifecycle, spring gestures, focus handling, dialog layering,
  responsive presentation and the bank's complete finite visual-state catalog.
- Adds references/web-renderer.md with actual contract-to-controller modules,
  support boundaries, tests and reproduction instructions.

### Compatibility and migration

Human projections now use desert.interaction/5 and carry the exact catalog.
Notebook declares its multiline content, changing its contract digest.
Rebuild against matching source; use a new preview store, not an implicit repin
or migration of an old store. Existing r5 bundles and running databases stay intact.
Read this entry, SKILL.md, web-renderer, API, Notebook and support references.
The project-local run-web command now accepts build directory, store directory
and port as positional arguments. No existing consumer installation is changed.

### Not included

No complete port of every legacy primitive, arbitrary layout/composition grammar,
new business journey, native/CLI renderer, native haptics, offline PWA installation,
browser-exit draft persistence or complete accessibility certification.

## 0.6.0-draft — 2026-10-15

### Changed

- Adds `buildDistribution` and the first installed `svelte-web` builder, using
  one generic SDK template instead of a separate Notebook-owned application.
- Builds actual web artifacts from the contract, surface and distribution;
  records exact definitions, renderer revision and output file hashes.
- Adds verified mounting against a genuine local controller session, with a
  private snapshot, revision/binding checks and explicit public-asset routing.
- Includes build rejection tests and a renamed-product browser case with a
  contract-only review change. No product-name branches or copied CRUD handlers.

### Compatibility and migration

No product schema or database migration. The web bootstrap now consumes verified
builds, not arbitrary handler paths. Read references/distributions.md, Notebook,
support and API references. Build to a new directory; existing destinations are
never overwritten. Pair this skill with its matching executable source bundle.
Source, lockfile or Node revision changes require a new build before mounting.
Keep the old approved bundle immutable; replacing the skill does not upgrade code.

### Not included

CLI, native and controller builders remain unavailable. No new MCP transport,
remote deployment, renderer primitives, visual redesign, grants, installation,
artifact signing or complete conformance. No other agent's repository is changed.

## 0.5.0-draft — 2026-10-15

### Changed

- Adds the real general `deriveVerification(Product)` testing entrypoint and an
  isolated PostgreSQL host. Inventory, bounded input samples and setup journeys
  derive from canonical contracts, without Notebook or other product-name branches.
- Includes independent persisted-effect, preservation, authority, guard, rollback,
  concurrency/retry and actual database loss/recovery checks for local sessions.
- Adds blocked generation diagnostics and exact revision/inventory checks on
  immutable in-process execution reports. Copied reports are not accepted evidence.
- Ships generated testing API/reference documentation and runnable Notebook
  verification, plus tests using two objects and renamed/extended contracts.

### Compatibility and migration

No product schema, production controller or database migration changes. This adds
test infrastructure; use the matching SDK source, not instructions alone. Read
SKILL.md, references/verification.md, references/testing.md and references/support.md.
Run `npm run verify:derived` from the source bundle. Keep historical independent
regression tests; replace duplicated fixture definitions, not independent assertions.
Use the returned report with the same instance's `assertComplete`; serialized
reports remain inspection artifacts, not resumable certificates.

### Not included

No exhaustive proof over all inputs, portable attestation, general grants, external
effects, UI/MCP transport certification or complete TPA certification. No changes
to another agent's product, installed skill or repository are performed.

## 0.4.0-draft — 2026-10-15

### Changed

- Fixtures reference canonical product/journey entities instead of redeclaring
  Notebook. Independence belongs to verification, not a parallel product definition.
- Verification explains contract-derived cases, independent preservation checks,
  interpreter mutation and rejection of incomplete or stale local evidence.
- Adds an explicit update protocol, including rereading changed references and
  acknowledging the version and exact bundle digest before resuming work.
- Bundle metadata derives its skill version from SKILL.md and requires a matching
  latest changelog entry. Metadata mismatches fail verification.

### Compatibility and migration

No public runtime API, product contract or database migration is introduced.
Use the exact accompanying source bundle for the new test/evidence commands.
Read SKILL.md, references/verification.md, references/updating.md and generated
references/support.md. Review existing duplicated fixture definitions; do not
remove independent assertions or assume arbitrary fixture generation exists.
Replacing instructions alone does not upgrade executable SDK code.

### Not included

No general fixture framework, grants, new external-effect capabilities, native
renderer, new authority policy or full TPA certification.

## 0.3.0-draft — 2026-10-15

Historical entry reconstructed from the preserved r2 delivery, not a modification
of that snapshot.

### Changed

- Includes corrected multi-object controller authoring, runtime mismatch rejection
  and a six-journey shared-controller specimen.
- Documents the PostgreSQL checkout-race correction and real recovery evidence.
- Clarifies unsupported Kenon capabilities and project-local Claude Code installation.

### Compatibility and migration

Read the matching API and support references before adapting controller definitions.
A controller owning multiple objects does not imply multi-object command effects.
Pair the skill with its exact r2 source bundle; new capability proposals remain
unapproved and unimplemented.

## 0.2.0-draft — 2026-10-15

Historical baseline reconstructed from the preserved initial authoring delivery.
No claim is made about an unverified earlier distributed version.

### Included

- Portable skill with generated real-API, complete Notebook, support and runtime
  references; source bundle, lockfile and content manifest.
- Finite authoring guidance, verification boundaries and capability-gap workflow.
- Notebook context/Actions and explicit optional human review, distinct from
  controller acceptance and authorization.

### Adoption

Read the complete entrypoint and routed references. Verify the exact bundle before
execution; do not infer a public npm package or install only SKILL.md.
