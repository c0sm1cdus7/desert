# Human experience iteration — 2026-10-15

## Scope

This iteration keeps the existing Notebook product contract and persistent store.
It changes the shared Svelte renderer, its typed presentation and canonical validation
diagnostics. The foundation remains shadcn-svelte/Bits UI with the audited Tres Marías
visual language. It is not an Apple review, native certification or a universal SDK
completion claim. The bank still has eleven product-backed and nine bench-only families.

## Independent review and corrections

Fresh reviewers received the product's purpose and access to an isolated running build,
not a list of desired conclusions. Their actual interactions and screenshots rejected
earlier iterations despite passing functional tests.

- Ordinary reading was modal, duplicated its identity and treated prose as trailing
  metadata. `ProductWorkspace` now uses collection/context document flow; compact
  reading gets the available width. The existing multiline input need derives prose
  reading without field-name rules. Unknown and visually blank values have distinct
  presentation fallbacks without changing domain validation or stored facts.
- A v20 screenshot exposed centered collection text despite an intended leading layout.
  A geometry regression failed before shared shadcn Button composition was corrected.
- Touched-field reasons now come from the same immutable validation issues as the
  standalone schema validator. Pristine inputs stay quiet. Blur, newer edits during
  acceptance, empty allowed values and controller loss have explicit regressions.
- Catalog search, family counts and jump links derive from its canonical inventory;
  hidden mounted specimens retain local edits. Bench-only controls remain labelled.
- The v21 reviewer reproduced Escape losing context while toolbar Back preserved it.
  All dismissal paths now use the same typed navigation intent. Cancellation returns
  focus to its action; successful create/archive focus the resulting object.
- Product error text measured 4.394990993018437:1 on the actual light drawer fill,
  despite looking acceptable on catalog cards. A new exact, composited-color regression
  failed all eight light cases before the shared destructive-text token correction.
  V23 measures at least 7.090176418611963:1 in light and 10.91269070916425:1 in dark,
  across two fields, desktop/compact and system/explicit appearance. Typography remains
  14px regular. The test threshold stays 4.5:1 without rounding or special exceptions.
- Review no longer hides its known change behind unchanged prose. Only an exact
  object identity/version baseline can produce a before/after summary. Exposed changed
  facts move first; unknown, stale and unexposed values cannot become invented evidence.
- Collection retrieval operates only on the exposed collection values already loaded.
  Search and clear use the canonical input/action pieces. Ordering derives from the
  first declared collection field, with a stable identity tie-break, without mutating
  records. Search never invokes a journey or includes separately loaded detail/private
  fields. The current row remains visibly selected after pointer and keyboard focus leave.
- Creation remembers whether it began in a collection or a reading context. Every
  cancellation channel restores that origin, its scroll position and unsent writing.
  Back focuses collection search when filtering removed the original opener. Successful
  creation selects the admitted result even if the retained search does not match it.

The frame grammar advances to `desert.surface-frame/5`: closed facts can identify their
exposed multiline fields, and form fields can carry canonical error feedback. Invalid
references are rejected. This is not a product-contract migration or new input capability.

## Verification trail

- V20 new browser checks passed while the subsequent visual review still found a real
  collection-alignment defect. Green functional checks were not accepted as visual proof.
- V21 root checks passed 220/220 with zero skipped. Focused browser checks also covered
  real PostgreSQL/transport loss, newer drafts in flight, recovery and enlarged text.
- V22 introduced focus/dismissal fixes. One test initially sent Escape before the async
  review was mounted; waiting for the intended visible state corrected this test race.
- V23 focused navigation and compact review tests passed 8/8, including five geometry
  cases from 320×568 at 100% through 390×700 at 200% text. Exact-version review unit
  regressions were red before implementation and are now green.
- V23 field-feedback contrast passed all sixteen measured cases on actual product fills.
- V23 integrated root verification passed 223/223. Full browser verification passed
  75/76: the revocation test's global text locator matched both background status and
  active journey status. It now selects the active journey explicitly; its revocation,
  disabled-command, retained-draft and authority assertions remain unchanged.
- A second independent running-product assessment found no new blocking regression in
  its exercised v23 scope. It rechecked actual dismissal, reading scroll, success focus,
  product contrast, compact review changes and catalog edit retention. It still found
  limited collection retrieval, an overridden selected-row background, and creation
  cancellation returning to collection instead of its originating reading context.

- New collection regressions failed before the retrieval controls existed. The final
  component checks pass 4/4 and browser checks pass 3/3, including zero extra API calls,
  hidden-field canaries, current-row styling in both themes and 320/390px layouts.
- The creation-origin browser regression failed all four reading-origin cancellation
  paths on v23; its collection-origin control passed. On v24, an initial verification
  mistakenly read body text from a collection projection that intentionally excludes it.
  The test now uses the admitted subject read without changing its expected fact. All
  seven browser scenarios pass; focused model/feedback checks pass 9/9.
- V24 integrated root verification passes 229/229, with zero skipped. Type checking
  also passes. Svelte diagnostics report zero errors and warnings; production build
  succeeds. Generated authoring references and skill structure validate.
- The first complete v24 browser run passed 85/86. The existing floating-label test
  used a page-wide text-input locator; adding the canonical collection search made
  that locator ambiguous. It now scopes the field to the active dialog. Floating
  geometry, required indicator, 130% text scaling and retained-draft assertions are
  unchanged; this correction changes only the test, not the frozen renderer.
- The final independent v24 assessment found no blocker in the exercised flows. It
  interacted with loaded-local retrieval, current selection, all cancellation origins,
  review, successful archive/create under a nonmatching filter, validation and compact
  layout. Reading scroll remained 141→141 on cancellation. After an archived row left
  an `active` filter, the result stayed readable and Back focused search. The private
  reviewer browser, server and database were stopped without touching user data.

- The repeated complete v24 browser suite passes 86/86, with zero skipped, including
  the five nested compact/enlarged-text geometry cases. Root TypeScript checks and
  generated authoring-reference checks were repeated successfully after the test-only
  correction. No renderer source changed after the frozen build.

Earlier passes were not inherited by later source revisions. The final verification
uses the exact frozen build below.

## Frozen revision

`build/notebook-bank-v24` was built with Node `v24.16.0`. Every output file verifies
against its manifest, and the manifest renderer revision matches the current source
and lockfile. The product and installed surface/distribution identities are unchanged.

| Identity | SHA-256 |
| --- | --- |
| Renderer | `8cba9ee1e57e47ea98dba59306f3952ea7e7b3b5658e419b631029867feac59d` |
| Product contract | `e2df70817bff909c54635f9f7c4581737503e5e719cff1e4869bba6d5ced4240` |
| Distribution | `6793947205edc227e64c5c095f52b6e3ba0e8f0cffb963e3d367cd811813e1c9` |
| Surface | `b6f1f3b939741bbc339deb39784538cb36173e140e6cde9fc0c51c6dd0ed605c` |

## Preview handoff

The previous v19 host was stopped gracefully and v24 now serves port 4276 using the
same `.local/notebook-approved-bank` persistent directory. No user notes were created,
archived or deleted, and no store reset, migration or repin was performed. Browser
access was renewed through the existing private local launch flow after restarting
the host. The product visibly reports `Local controller ready`.

The existing browser tab was reloaded and inspected. Catalog search, shadcn options
alignment, message identity in the header, paired dismissal and Escape focus return
were exercised. The tab is left on the complete catalog with no search filter or
modal. `user-preview-catalog.jpg`, `user-preview-options.jpg` and
`user-preview-message.jpg` under the v24 evidence directory show the served output.
The longer-note screenshots use the reviewer's isolated fixture, not user records.

## Evidence locations

- `artifacts/reading-workspace/`: leading collection alignment and compact prose.
- `artifacts/experience-gate/v21/`: independent review, including long realistic notes,
  compact confirmation, both settled themes and the measured contrast failure.
- `artifacts/experience-gate/v23/`: independent re-evaluation of the corrected product.
- `artifacts/experience-gate/v24/`: final independent product interactions, settled
  desktop light/dark reading, compact collection/reading and validation.
- `artifacts/collection-retrieval-v24/`: seven visually inspected desktop/compact
  normal, filtered, selected and no-results states.
- `artifacts/field-feedback-contrast/notebook-bank-v22/`: failing color measurements.
- `artifacts/field-feedback-contrast/notebook-bank-v23/`: corrected measured colors.
- `artifacts/toolbar-overflow/notebook-bank-v23/`: enlarged-text reading and review.
- `artifacts/field-feedback-contrast/notebook-bank-v24/` and
  `artifacts/toolbar-overflow/notebook-bank-v24/`: final integrated measurements.

## Remaining limits

Collection retrieval is limited to already-loaded values; there is no new search journey
or pagination capability. Native haptics, actual
VoiceOver use, real mobile keyboards, browser zoom beyond text enlargement, cross-browser
parity and an offline-installable PWA are not certified. The prepared-response exposure
security finding remains open. Custom forced-snap drawer physics are not a verified
Vaul migration. The local skill advances to `0.10.0-draft` with matching generated
references and a migration changelog; no public skill release, external consumer
installation or SDK publication is performed by this iteration.
