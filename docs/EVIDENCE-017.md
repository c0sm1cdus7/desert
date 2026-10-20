# Shadcn foundation and typed composition correction — 2026-10-15

## Scope and acceptance boundary

This increment repairs the shared renderer, not Notebook-specific pages. The
product contract and installed store are unchanged. It does not certify the bank
as complete, visually accepted, production-ready or accessible on every platform.
Money, dates, options, media and files remain renderer-only capabilities; mounting
them in a catalog does not install their product grammar, persistence or authority.

## Mechanisms

- `WebRendererBank` checks each entry's component props and event family against
  canonical control types. Twelve negative Svelte examples must fail at their
  intended locations; valid bindings must compile. A real multiline/text registry
  mismatch was detected and corrected while introducing this boundary.
- Text, money and selection compose one `FieldWell` over shadcn Field/InputGroup.
  Cardinality selects RadioGroup or Checkbox within the same FieldLabel anatomy.
  Products cannot supply markup, classes, layout slots or widget implementations.
- Header faces compose Avatar. Message severity is typed header identity; body
  content is text. Critical causes wrap instead of being visually truncated.
- Dialog and Popover own their portals and overlays. Private presentation
  variants host closed DESERT frames. Spinner and Empty are shared foundation
  components, not independently drawn feedback in every consumer.
- Typography has shared roles. Field values remain 16px; action labels and body
  copy use the approved 14px role. This is intentional hierarchy, not a claim
  that every text fragment should have the same size.
- Failed image loading retains the declared aspect ratio and accessible name.
  Option labels own full hit targets and indicators align with their labels.
- Checkbox and RadioGroup share a meaningful choice-outline token, distinct from
  decorative well borders. Their selected styling targets the `data-state`
  emitted by installed Bits UI 2.19.2, rather than inactive `data-checked` selectors.
- Frame revision 4 uses closed journey/back/accept/recover/close intents. A valid
  product journey named `accept` previously reached the renderer's acceptance
  operation instead of invoking the journey. `back` and `surface.close` also
  collided with chrome validation. The correction separates operation meaning
  from authored identifiers; it does not reserve or rename product vocabulary.
- An independent actual-component reproduction found that MoneyControl retained
  `1.00` after its owner changed the value to `2.00`, and even after changing
  currency. Red-first component browser regressions now cover owner amount,
  currency, reset, identity and scale changes, acknowledgements, lexical drafts
  and invalid partial input. Reconciliation emits no edit event.

## Source provenance and skill

The visual reference is Tres Marías commit
`81198c3c4a6351b3994b8731312612591315f1a0`, with the original imported base at
`301327eda40c9472d20736412ad79919b3464cde`. That branch itself contains a partial
CSS migration, so it is a source of authored anatomy, not a blanket quality
certificate. Local adaptations and new registry components are recorded in
`src/svelte/vendor/PROVENANCE.json`; existing customized Button files were preserved.

The installed shadcn-svelte skill was compared with its official upstream source.
Nine files already matched; two small documentation/metadata differences were
updated. All eleven files now match the latest skill-changing commit
`7c99619bf299e893053cabc007d4c0f26fc0fabf` (also present in repository revision
`7e463da6dbf4b9cf086ce3e7d845650bc2a1163b`). This was not an obsolete-skill problem:
the relevant composition guidance was already available and needed to be applied.

DESERT's project-local skill is `0.9.0-draft`, with migration notes and generated
source references. No portable release, external consumer installation or SDK
publication is performed here.

## Independent review

A fresh whole-experience review used the ordinary product and catalog, desktop
and compact widths, light and dark appearance. Its captures are retained under
`artifacts/whole-bank-v14`. It rejected consumer readiness:

- Long prose is presented like a scalar metadata value, including trailing
  alignment and a narrow reading column on desktop.
- Ordinary note reading is overly modal and spends too much compact space on
  chrome, status, disclosure and repeated identity.
- Collection composition and healthy-state technical messaging do not yet make
  a focused consumer product.
- Compact error headings hid the cause. This defect is corrected and protected
  by full-title geometry checks at 1280, 390 and 320 CSS pixels, in both themes.

The review preserved the restrained palette, rounded wells, minimum hit targets,
keyboard access, draft retention and direct-create/reviewed-archive behavior.
Passing layout assertions does not close its broader reading/navigation findings.

## Verification history

The pre-correction baseline reproduced option indicators displaced by 13 pixels,
image fallback changing a 318px frame to 128px and message identity in content.

- The first integrated v14 browser run passed 62/65 cases. Two failures referenced
  superseded body-severity selectors; one exposed a real fixed Avatar size that
  broke compact detail alignment. The latter was fixed at the shared face boundary.
- The initial root run passed 198/203 cases: three generated reference snapshots
  were stale, and two database setups exhausted macOS shared-memory capacity while
  root and browser suites ran simultaneously. These were not behavioral passes.
  References were regenerated; four confirmed idle test clusters were stopped
  gracefully, without deleting data or stopping the user's Notebook store.
- The next root run passed 204/204 with zero skipped, including negative renderer
  contracts, real PostgreSQL execution and mutation-counterexample verification.
- V15 focused browser checks passed 18/19; the remaining assertion counted the new
  accessible Dialog.Description together with visible copy. It now selects the
  visible content slot explicitly, while retaining the accessible description.
- V16 integrated browser checks passed 61/65. Two failures exposed duplicate
  collection landmarks introduced by Empty composition; this is corrected to a
  non-landmark group. A scroll test sampled before the responsive grip was mounted;
  it now waits for the intended edge before comparing stable chrome. The final
  assertion expected a field selector to use action typography; it now compares
  selection with the shared field-value role. No accessibility check was disabled.
- A separate v16 test attempt after a source edit correctly failed with
  `BUILD_RENDERER_MISMATCH`. It supplies no layout evidence. Builds are immutable
  and must be regenerated rather than repinned to conceal drift.

- V17 integrated verification passed: root `npm run check` 209/209, browser
  `test:web` 66/66, zero skipped; Svelte diagnostics zero errors/warnings;
  authoring reference checks and the production build passed. Its renderer
  revision is `a4920d91dd6cdaaec548d3477d806f50a57e1ddcb38fac7d1852691b1297f614`.
  Captures are retained under `artifacts/composition-repair/v17`.
- A subsequent actual-bank contrast audit rejected v17: unchecked checkbox/radio
  boundaries measured only 1.29–1.44:1 against adjacent fills. V18 corrected the
  shared outline, but a new exact-state assertion exposed inactive selected-state
  styles. V19 passed all 16 system/explicit light/dark cases: unchecked boundaries
  6.33–8.12:1, checked markers 4.78–5.47:1, with primary fill/border and matching
  foreground. Colors are measured after alpha composition over actual ancestor
  fills; disabled controls are excluded. This isolated compiled-bank test does not
  exercise or certify controller behavior.

Earlier successes are not automatically inherited by later source revisions.

## Final frozen verification

Build: `build/notebook-bank-v19`, served at `http://127.0.0.1:4276` using the
existing `.local/notebook-approved-bank` store. The previous preview was stopped
gracefully; the store was not reset, deleted, migrated or repinned. The isolated
v14 review server was stopped after its review; its store and evidence remain.

- Renderer revision: `cee578c191ad14e514df4e7f2ecb9ab4fa0ae21630f8c052e7e2d07c8b567e0f`.
- Product contract: `e2df70817bff909c54635f9f7c4581737503e5e719cff1e4869bba6d5ced4240` (unchanged).
- Human surface: `b6f1f3b939741bbc339deb39784538cb36173e140e6cde9fc0c51c6dd0ed605c`.
- `authoring:check` passed; `npm run check` passed 209/209, zero skipped.
- `web:check`: zero errors/warnings; production build passed.
- Full browser suite against v19: 67/67, zero skipped.
- Manifest files and current renderer source revision match.

The actual preview tab was reloaded and selection, option alignment and field
composition were visually checked. After renewing browser access following the
host restart, an access notice remained visible alongside ready state; reloading
cleared it. This manual reauthorization edge is not diagnosed or closed by the
passing suite. The real create form was subsequently opened and dismissed without
writing a note, and the tab was returned to the catalog. Build-specific captures are retained under
`artifacts/composition-repair/v19`. This verifies the correction, not consumer
acceptance or completion of the remaining findings below.

## Remaining limits

The web registry is not yet a universal renderer-neutral composition protocol;
legacy frame bodies use closed direct imports. Forced-snap drawer physics remain
a custom DESERT extension, not a verified migration to the official Vaul Drawer.
No native-device haptics, VoiceOver certification, cross-browser parity, full
product capability inventory or visual acceptance is claimed. The existing
prepare-response security finding remains open. Product form validation also
needs to preserve field-level reasons rather than only disabling submission.

## Reproduction

Use Node 24 and run database-heavy suites sequentially:

```sh
npm run authoring:generate
npm run authoring:check
npm run check
npm run web:check
npm run web:build -- build/a-new-immutable-build
DESERT_WEB_BUILD=build/a-new-immutable-build npm run test:web
```

Never overwrite a build, reset a store or repin its contract to bypass verification.
