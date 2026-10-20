# Bank coverage — 2026-10-17

DESERT has a finite executable text-record surface, not the complete Tres Marías
bank. Nine control families now have typed renderer-only source;
that does **not** install product selection, attachment or upload semantics.

This is a source inventory, not a complete framework certification. The following
frozen-build results are historical and do not validate the later nonmodal-choice
or shared toolbar-action revision. The integrated
browser suite on frozen `notebook-bank-v11` passed 60/60 cases, with zero skips.
The same source passed 202/202 root tests and zero-error/warning Svelte diagnostics.
The preceding failures, exact revision and independent findings are recorded in
`EVIDENCE-016.md`. The following v3–v5 results are historical.
`notebook-slots-v4` predates the new controls;
`notebook-toolbar-v1` also predates their integration.
An independent run of `tests/web/interaction-polish.test.ts` against frozen
`build/notebook-toolbar-v3` passed all five tests (zero skips/failures): disclosure,
repeat focus return, grip/drag behavior, overlays/locking, feedback hierarchy and
positive readiness color. Screenshots: `artifacts/typed-bank/polish-*.png`.
The separate v5 controls run passed 3/3 browser tests. Twelve screenshots cover
the control bench, select and popover across desktop/mobile and light/dark.
Neither focused result promotes the controls' domain scope. Integrated evidence
is recorded in `EVIDENCE-016.md`.

## Status vocabulary

| Status | What it establishes |
| --- | --- |
| Product-backed | The existing compiled product projection drives the renderer and admitted controller workflow; only the stated finite scope is installed. |
| Renderer-only | Closed typed visual/local-interaction data exists, without product authoring, command effects or persistence for that control. |
| Vendor-only | Low-level source is available internally; no corresponding public DESERT capability follows. |
| Missing | No installed DESERT contract/renderer mechanism for the stated capability. An upstream component is not an implementation. |

## Complete declared DESERT bank

The authoritative declared inventory remains `src/interaction/catalog.ts`, with
23 entries at revision 0.3.0, consumed by `src/svelte/renderer-registry.ts`. Nine control entries and
their states derive from `src/interaction/control-bank.ts`. Catalog specimens are
isolated demonstrations, not controller execution. Declared states are test
obligations; listing them does not prove their visual or behavioral correctness.

| Entry | Declared states | Installed scope and boundary |
| --- | --- | --- |
| `input.text` | empty, value, invalid, disabled | Product-backed string input with contract-derived requiredness; no numeric/date/enum editor. |
| `input.multiline` | empty, value, invalid, disabled | Product-backed multiline string input; no rich text or attachments. |
| `fact` | known, empty, unknown | Product-backed display of projected string/number facts; no specialized currency, date, media or relationship presentation. |
| `action` | ready, unavailable, pending | Closed typed product, local and catalog intents; a styled button alone grants no authority. |
| `availability` | unknown, ready, unavailable | Product-backed dependency observations and surface feedback; readiness is not authorization. |
| `collection` | empty, records | Product-backed finite collection with local filtering/ordering over loaded exposed facts; no server search or paging. |
| `form` | incomplete, ready, disconnected | Product-backed supported create inputs and draft retention; no arbitrary form graph or generic subject-action editor. |
| `context` | available, unavailable | Product-backed always-visible facts and eligible destination rows; no collapsible Details group. |
| `review` | prepared, uncertain | Product-backed explicit commit mode, prepared facts and recovery; no universal review requirement. |
| `transient` | open, locked | Product-backed hosting of supported frames with focus/dismissal/drag behavior; not arbitrary nested modal composition. |
| `problem` | error, warning | Product-backed error presentation and isolated warning specimens; no generic notification or recovery-policy engine. |
| `catalog.card` | featured, item | Experimental public record destination; logical media, not owned records or remote APIs. |
| `catalog.home` | populated | Experimental featured record and declared groups; children use the same card owner. |
| `catalog.detail` | reading | Experimental public record reading; no map, favorites or persistence. |

Supporting task/dialog composition is `desert.surface-frame/6`: required top/content/
bottom, content restricted to facts, form, context, review, ordered information or message. Toolbars
have explicit leading/trailing or primary/secondary action slots. Destination
rows, visible metadata, icon/label button faces, focus, motion and semantic
colors are renderer mechanisms, not additional product object types. Raw HTML,
CSS, snippets and arbitrary business callbacks are not admitted frame content.

Notebook itself demonstrates only create, read and archive of privately owned
notes. Create submits directly; archive reviews before separate acceptance.
The wider object/compiler vocabulary includes bounded integers, enumerations and
principals; their existence does not provide matching human input controls.

## Newly integrated typed control bench — renderer-only

Source: `src/interaction/control-nodes.ts`, `src/svelte/controls/`, and
`src/svelte/catalog/ControlBench.svelte`. These are renderer-only entries in the
same versioned bank; they are not admitted product form primitives.

| Control | Present in source | Still required for product capability |
| --- | --- | --- |
| Select | Single direct choice, explicit null/unset, requiredness, disabled control/options and optional clear. Nonmodal anchored selection; no toolbar, overlay or separate confirmation. | Bind choices and selected values to product schemas and commands; projection/admission/validation tests. Search, multi-select and dynamic option loading are not installed. |
| Popover | Nonmodal anchored typed information; no overlay or toolbar. Focus/dismissal guards are separate from modality. | Product anchors/content/lifecycle binding. No arbitrary child markup, general action menu or nested form. |
| Local files | Native chooser, metadata list/removal, count/type/per-file/total-size rejection, typed local events, ephemeral browser `File` handles outside serializable descriptors. | Attachment ownership/reference schema, trusted content inspection, durable storage, authorized upload/download/delete, retries and lifecycle guarantees. No file bytes are uploaded or persisted; MIME metadata is not trusted inspection. |
| Options | One canonical descriptor with minimum/maximum cardinality; radio/checkbox presentation, disabled options and typed selection. | Product fact/command binding and dynamic sources; this does not confer authority. |
| Money | Exact decimal input to minor-unit strings, declared currency/precision, direct currency choice, invalid precision feedback, no implicit conversion. | Domain money semantics, arithmetic, currency authority, persistence and command binding. |
| Date | Real calendar grid, calendar-date strings, valid days and declared bounds. | Product date facts, command binding; no time, timezone, recurrence or scheduling semantics. |
| Tag | Closed neutral/accent/success/warning/destructive tones. | Product state projection; no arbitrary colors or author CSS. |
| Image, Avatar | Logical asset references in public catalogs; legacy same-origin sources in the bench. Accessible descriptions and bounded unavailable/image fallback. | Authorized media ownership, remote sources, transformations, uploads and lifecycle. |

Executed unit coverage: `tests/control-nodes.test.ts` exercises closed descriptors,
illegal events, limits and ephemeral handle ownership. The v5 browser controls
run checks keyboard selection, disabled options, clearing, popover focus return,
file rejection/removal and absence of upload requests. This finite coverage does
not establish every browser, native host or assistive-technology behavior.

## Approved port versus upstream breadth

The approved port was selective: nine private directories (`button`, `field`,
`input-group`, `input`, `textarea`, `label`, `separator`, `badge`, `card`), plus
tokens/fonts/utils. Current source additionally contains `select`
and `popover` wrappers, plus registry calendar, checkbox, radio-group and avatar.
The original `vendor/PROVENANCE.json` records the initial
subset; update the audit/provenance for additions rather than implying every new
wrapper was copied unchanged from that snapshot.

Badge and supporting Field/InputGroup/Card exports are private implementation
assets, not public typed DESERT primitives. Input/textarea/label are used inside
installed controls; that does not expose their entire HTML-property API to a
product. Bits UI supplies dialog behavior directly; a vendor directory count
therefore neither proves nor disproves a feature.

The following maps all visual component names exported by the inspected upstream
`src/lib/components/index.ts`; equivalent names do not mean equivalent coverage.
Upstream README examples are broader/staler than that export list. Upstream engine
behavior remains reference material, not DESERT authority.

| Upstream family/names | DESERT disposition |
| --- | --- |
| Button, Icon, Toolbar | Partial typed action/icon vocabulary and toolbar slots; not the full upstream button/menu/icon API. |
| Fact, Field | Product-backed plain facts and two text inputs only; local file selection is renderer-only. |
| Row, RowGroup, Stack | Destination rows, grouped facts and collection cards cover a subset; no general typed row/stack/board authoring. |
| Disclosure | Prohibited for content: facts and explanations remain visible in titled stacks. The legacy authoring variant, renderer and private Collapsible wrappers were removed. |
| Frame, Surface, Place, Journey | Finite DESERT frames and Notebook workflows, not upstream layout/navigation/journey engines. |
| Transient, Presentation, Scrim | Supported modal drawer/problem hosts and overlay behavior; no complete adaptive presentation family. |
| Select | Renderer-only single-select bench; no product selection input. |
| Badge | Renderer-only semantic tag descriptor; no product projection binding. |
| Empty | Simple collection empty state; no general typed empty-state composition. |
| Calendar, Clock | Renderer-only calendar/date interaction; time and domain semantics remain missing. |
| Composer | Missing rich composer, attachment submission and composer-specific lifecycle. |
| Face, Mark | Renderer-only image/avatar descriptors; metric/chart/gauge contracts remain missing. |
| Menu, Segmented, Slider, Toggle | Missing typed DESERT controls/product bindings. |
| Bar, ScrollEdge | Missing corresponding general presentation/scroll-edge mechanisms. |

Upstream internal helpers also include Popup, SelectSheet, DateField, SearchScope
and Otp. The new PopoverControl is a finite local mechanism, not a port of that
whole adaptive family. The upstream Field `file` option does not install DESERT
upload or attachment behavior.

## Next acceptance gates

1. Freeze the integrated source and build; execute root and browser tests with
   matching projection/build fingerprints. Keep stale-build rejection separate
   from a behavioral failure or pass.
2. Verify select/popover/files as local controls: keyboard, focus return, disabled
   states, empty/selected/rejected states, compact widths, enlarged text and dark
   appearance. Show their renderer-only boundary in the catalog.
3. Promote one capability at a time through product grammar, projection, renderer,
   controller semantics where applicable, independent tests and authoring docs.
   Do not promote by adding its name to a visual registry.
4. Prioritize product-bound selection and durable attachments before claiming
   general forms. Date/time, money, tables/charts and nested-object editing remain
   explicit gaps; add only when a concrete product needs their semantics.

See `STATUS.md`, `TRES-MARIAS-AUDIT.md`, `EVIDENCE-014.md` and `EVIDENCE-015.md`
for historical implementation/evidence boundaries. This inventory does not claim
native parity, complete accessibility, full Tres Marías coverage or TPA conformance.

The independent [Capibara semantic census](../artifacts/capibara-bank-inventory/lab-reference-inventory.md)
covers 44 declared compositions, 41 registrations and 14 field controls. This is
the remaining-needs reference, not a claim those needs are installed. Specialized
contacts, search, composition branches, galleries, charts, secure-provider flows
and general layouts remain outside this increment. No legacy engine or visual
implementation was imported from that lab.
