# Bank maturity increment — 2026-10-15

## Scope

This increment repairs shared composition and adds a bounded local-control bench.
It does not certify the full Tres Marías framework or production TPA conformance.
The authored Notebook product and installation digest remain unchanged; no existing
store was reset, migrated or repinned. The interaction projection advances to `/6`
for explicit derived review fields; typed surface frames advance to `/2`.

## Mechanisms

- Closed top/content/bottom slots, semantic toolbar roles and required action icons.
  Contexts reject command footers and mutation forms at type and runtime boundaries.
- A single Action renderer handles actual label fit, icon fallback, pending-only
  spinner, accessible naming and fixed geometry. Svelte consumer counterexamples
  prove missing/invented icons fail diagnostics; valid consumers pass.
- Transient host owns top Close and lock behavior, with consistent footer slots.
  The same navigation action appears at top-left and in the bottom toolbar;
  locking disables it in both places rather than removing the exit.
  Desktop drawers have no handle. Mobile drag dismisses upon crossing 100 CSS pixels,
  before release; a shorter drag springs back. Unsupported browser vibration is
  reported as unsupported; native physical haptics are not certified.
- Collapsible Details, focus return on each opening, semantic status colors,
  dialog hierarchy, overlay dismissal and inset field/row feedback.
- Reviews include exposed consequential fields, not just command inputs. Empty
  allowed strings stay valid, and the initial draft agrees with the displayed form.
- Catalog form transitions use the product's generated validator; an unread
  collection no longer claims to be empty.
- Typed select, popover and local-file descriptors/events. These remain isolated
  renderer mechanisms, not product-bound selectors or durable attachments.

## Independent criticism and corrections

Fresh reviewers audited architecture/meaning and experience separately. Their
counterexamples exposed omitted review effects, empty-string disagreement, false
catalog readiness, unread-as-empty presentation and prepared-response over-disclosure.
The last remains explicitly open in `BANK-SECURITY-FINDING.md`; review filtering is
not a confidentiality boundary.

Browser testing also caught actual file-input failure from an upstream `bind:value`,
missing popover role and missing disabled-option ARIA state. Corrections belong to
the shared mechanism, not Notebook-specific markup. Initial failing builds are not
counted as passing evidence. Test assumptions about combobox role and whitespace
were corrected without weakening behavioral assertions.

## Reproduction

Use Node 24 and the existing PostgreSQL prerequisites:

```sh
npm run authoring:generate
npm run check
npm run web:check
npm run web:build -- build/your-new-build
DESERT_WEB_BUILD=build/your-new-build npm run test:web
```

Build outputs are immutable. Serving checks contract, projection and renderer
fingerprints. Never silence mismatches by overwriting a build or repinning a store.

## Historical verification record — toolbar v5

Frozen renderer: `build/notebook-toolbar-v5`, revision
`5684c4a704ff8db1fcce13308eb367207b0c31096ec7f0e70700e93bfaa080f9`.

- Root suite: 181/181 passed, zero skipped, with test-file concurrency 1.
- TypeScript diagnostics: passed.
- Svelte diagnostics: zero errors and warnings.
- Independent v5 controls run: 3/3 passed; all twelve control/select/popover
  desktop/mobile and light/dark captures inspected without browser errors.
- Final integrated browser suite: 32/32 passed, zero skipped, with concurrency 2.
- Live preview at port 4276 serves the frozen v5 build against the unchanged
  existing store. Its actual context was inspected and captured as
  `artifacts/typed-bank/live-v5-context.jpg`.

Earlier v3 independent interaction-polish run: 5/5 passed. The first v4 full
browser run: 31/32 passed; disabled select option lacked `aria-disabled`, corrected
in v5. A simultaneous root/browser v5 run exhausted macOS PostgreSQL shared-memory
segment capacity during `initdb`; those failed setups are not behavioral passes.
Default scripts now bound root test-file concurrency to 1 and browser concurrency
to 2. Run these database-heavy suites sequentially; no OS limits were changed and
no unrelated database processes were stopped. Screenshots live in `artifacts/typed-bank`.

## Remaining boundaries

- Prepared-response over-disclosure remains open; no confidential-field guarantee.
- See `BANK-COVERAGE.md`: dates, money, tables/charts, rich composition, full
  selection/attachment semantics and broader navigation are not installed.
- No cross-browser, VoiceOver, native-device, full accessibility or universal
  reduced-transparency certification. Automated Chromium checks are finite.
- No skill release, external agent installation or SDK publication in this increment.
  Generated authoring references are refreshed locally from the actual source.

The shadcn-svelte skill guided component reuse and composition; motion-design
guided gesture feedback and reduced motion. Apple-design informed the review of
hierarchy, keyboard alternatives, status cues and enlarged text as web principles,
not imported native platform conventions. Owner rules remain authoritative where
they differ (for example full footer rails and spinner-only pending buttons).

## Follow-up integration — bank v7 findings

The bank v7 run exercised 49 browser tests: 43 passed and 6 failed. Three tag
tones failed text contrast (reported by two tests); four assertions referenced
superseded copy or old navigation/heading selectors. These failures were kept
separate: selector updates are not evidence that the contrast defect was fixed.

Independent reviewers, without the implementation team's defect checklist,
found two additional reproducible failures in v7: a valid long note title pushed
fixed chrome outside a compact viewport, and the catalog's locked information
specimen had no completion path except reloading the page. Evidence is retained
under `artifacts/fresh-bank-review-v7`. The fixes are shared bounded chrome and
an explicit, finite catalog-only lock lifecycle; product hosts never unlock an
operation because a demonstration timer elapsed.

The expanded bank has nine renderer-only control families in the same typed
catalog. It does not install product-bound money, date, media, options or files.
The shared press mechanism is in the Button layer: the content compresses,
container bounds and separators do not, and the press overlay is common rather
than a primary tint assigned only to rows. Reduced motion suppresses compression.

A bundling regression was also found in v6: component-side global CSS introduced
the components layer before Tailwind's layer prelude, allowing the base reset to
override spacing and borders throughout the bank. Styles now enter through one
theme; an AST import guard and rendered geometry assertions protect that boundary.

Final follow-up results will be recorded against a frozen build, not inferred
from these source changes. The original v5 user store remains intact.

The expanded v8 press checks passed the held pointer/Space/Enter matrix in light
and dark, but failed both cancellation cases: moving the held pointer outside a
control left its contents scaled to 0.985. The common press state is being corrected
at the Button boundary, not by adding row-specific rules. Compact-title geometry
passed at 100% and 130% text but still failed at 200%; that result is not a pass.

The fresh v7 review also found a calendar accessible-name mismatch (the upstream
default was “Event”, not the typed Date label). The supported calendarLabel input
now receives that label, with an accessibility-tree assertion. Its prose-layout
recommendation remains open: desktop multiline facts still use scalar trailing
alignment. Fixing that requires preserving text presentation meaning in the typed
read frame, not a Notebook-specific CSS exception.

## Press and compact-layout regression record

The v10 integrated run passed 52 of 60 cases. Three press checks exposed a real
CSS precedence defect: hover's 8% overlay overrode the held 12% overlay. Two
cancellation tests stopped at an ambiguous Close locator after navigation became
present in both toolbars. Two enlarged-text geometry cases and their parent test
failed because compact spacing applied only to short viewports, not narrow ones.
These are recorded separately from a passing result; keyboard press passing did
not establish pointer feedback or text enlargement correctness.

V11 makes hover and held feedback mutually exclusive in the shared Button rule,
scopes the test's intended focus target to the bottom toolbar, and applies bounded
chrome spacing to narrow or short viewports. It does not reduce text or control
sizes. Native click semantics, semantic foreground/background colors and product
execution remain unchanged. A targeted run passed all 16 cases, including the
five viewport/text-scale cases, cancellation, native activation counts and reduced
motion. Final integrated evidence follows separately.

## Frozen bank v11 verification

Build: `build/notebook-bank-v11`. Renderer revision:
`d1fcfa830e015e22d4f02bc898b45a6cc7892afcfec151c734819ce76e8e181a`.

- Integrated browser suite: **60/60 passed**, zero skipped, concurrency 2,
  107.2 seconds. This includes five viewport/text-enlargement subcases.
- Focused press/cancellation/compact-layout run: **16/16 passed**, zero skipped.
- TypeScript: passed. Svelte diagnostics: zero errors and zero warnings.
- Root suite: **202/202 passed**, zero skipped, concurrency 1, 107.4 seconds;
  run after the browser suite, against unchanged source and regenerated references.
- Draft skill structure: valid. Authoring references are generated from the exact
  implementation and checked for drift; no external installation is implied.

Held states and cancellation evidence are under
`artifacts/visual-scale/green-v11-integrated`. Long-title, complete-content and
footer geometry evidence is under `artifacts/toolbar-overflow/notebook-bank-v11`.
The product contract and original Notebook store remain unchanged. These finite
checks do not close the security, product-capability or cross-platform gaps above.

The independent v11 recheck, using actual Chromium interactions against the
separate review store, confirmed the two v7 blockers and calendar naming mismatch
were resolved in its selected cases. Its report and captures remain separate:
`artifacts/fresh-bank-review-v11/VERIFICATION.md`. Desktop multiline prose remains
an open presentation recommendation; no global usability certification follows.

After verification, the existing user server at port 4276 was gracefully restarted
with v11 and the same `.local/notebook-approved-bank` store. No notes were reset,
repinned or migrated. The actual served catalog was checked read-only: holding its
middle destination row leaves the container transform at `none`, compresses the
content to 0.985, and retains both Close controls. Live capture:
`artifacts/typed-bank/live-v11-pressed-row.png`. The private browser launch was
queued in Codex; that queued UI action is not claimed as a completed navigation.
