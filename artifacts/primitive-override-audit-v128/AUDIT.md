# Primitive ownership audit

2026-10-20. Source baseline after v127a. Audit only; renderer, product contracts
and running previews were not modified.

The product-contract boundary rejects arbitrary presentation, but internal
renderer consumers can still alter shared primitives. The owner requirement is
stronger: consumers provide meaning, content and state; the primitive owns its
appearance, geometry and behavior. Reuse without enforced ownership does not meet
that requirement.

## Scope and evidence

The static inventory covers 326 `.svelte`, `.css` and `.ts` files under
`src/svelte`, `src/build/svelte` and `products`, including installed vendor source.
All Svelte templates parsed successfully.

`inventory.json` preserves file hashes and individual source locations:

- 219 component class/style/directive/spread attributes, 73 outside vendor code.
- 1,023 CSS inventory entries, including comments, foundational definitions,
  responsive rules and Svelte style rules. This is not a violation count.
- 18 runtime style/animation references, including reads and cleanup.
- 447 lines matching extensible attributes, class merging or prop forwarding.
  This is not a count of independently exploitable APIs.

`scan.mjs` reproduces the inventory without writing source files. It inventories
mechanisms, not computed CSS winners. Generated builds, old mockups, dependencies
and test-only styles are excluded. Dynamic spreads and generated classes require
semantic inspection; this inventory is not proof that every reachable visual
state has been exercised.

## Why the architecture permits this

1. `src/svelte/vendor/components/ui/button/button.svelte:38` exposes HTML button
   and anchor attributes, rather than a closed presentation interface.
   Its calls at lines 72 and 87 merge caller classes after built-in classes.
2. `src/svelte/vendor/utils.ts:4` implements `cn` with `twMerge(clsx(inputs))`.
   Executed example: base `p-4 rounded-full` plus consumer `p-0 rounded-none`
   produces `p-0 rounded-none`. The API actively resolves conflicts in favor of
   consumer customization.
3. Primitive implementations forward arbitrary props onto their DOM. This also
   permits inline style and, depending on spread order, replacement of internal
   data attributes. Button and InputGroup are concrete examples.
4. `ToolbarLayout`, `Heading`, `Place` and `MeasuredField` propagate this
   extensibility above the vendor layer. `Place` additionally exposes viewport
   HTML attributes. An otherwise closed product schema does not close these APIs.
5. Global CSS targets descendants through `data-slot`, `.workspace-header`,
   `.toolbar-row` and similar implementation details. Removing `class` alone
   would not stop these overrides.
6. Geometry variables are inherited and set by consumers. A shared token name
   is not an ownership restriction.
7. Surface composition is not singular: SurfaceFrame, PickerSheet, the unused
   CompactPickerSheet, sidebar and media viewer assemble different chrome paths.

## Confirmed external rules and divergent compositions

Locations below identify source-level ownership crossings. Some effects are
intentional and previously approved; their implementation still needs to belong
to a closed owner rather than a context-specific override. A declaration can
also be redundant or lose in the CSS cascade; visual failure is not asserted
for every row.

| Area | Locations | Rules supplied outside the target primitive |
| --- | --- | --- |
| Calendar toolbar | `src/svelte/pieces/DateCalendar.svelte:25,42,50–54` | Calendar padding removed; Toolbar padding, shrink and overflow replaced; navigation buttons forced to 36/44px; grid viewport padded independently. |
| Calendar sizing | `src/svelte/pieces/DateCalendar.svelte:43–49` | Calendar cell variable, day minimum width and table cell height replaced by host presentation. |
| Calendar popover | `src/svelte/controls/DateControl.svelte:84` | Popover receives `p-3` and inline width/overflow instead of owning its geometry. |
| Selection popover | `src/svelte/pieces/SelectionField.svelte:109` | Same Popover receives a different inline padding, gap, width and minimum width. |
| Picker frame | `src/svelte/pieces/PickerSheet.svelte:24–36`; `src/svelte/pieces/surface-chrome.css:102–104` | Independent content wrapper/insets; `contentToolbar` omits the frame toolbar and lets content supply it. Narrow inset shrinks to 4px. |
| Parallel picker frame | `src/svelte/pieces/CompactPickerSheet.svelte:28–37` | Handwritten title/close row, separate padding, close on the right. No incoming source reference found; latent divergence, not blamed for the screenshot. |
| Reading panel | `src/svelte/reading.css:7–11,21–28` | Toolbar title overflow/clamp, header padding/border, content overflow and compact padding changed by parent. |
| Sidebar container | `src/svelte/explorer/catalog-shell.css:6–8,28–29,52`; `src/svelte/vendor/components/ui/sidebar/sidebar.svelte:60–64` | Container padding/radius, transition/animation behavior and dialog padding supplied by sidebar/catalog context. |
| Sidebar controls | `src/svelte/explorer/catalog-shell.css:11–17,22–26,53–59` | Toolbar gap/inset; group and label padding; menu button height, padding, gap, type, radius, wrapping and icon size; toolbar button dimensions. |
| Page toolbar actions | `src/svelte/explorer/catalog-shell.css:38–44` | Toolbar geometry and row alignment; Action label/glyph visibility forced externally; button/trigger dimensions overwritten. |
| Viewer toolbar | `src/svelte/pieces/media/media.css:16–19,26,36` | Toolbar padding, gap, wrapping, bottom alignment and Dialog title truncation owned by viewer CSS. |
| Viewer thumbnails | `src/svelte/pieces/media/media.css:28–30` | Generic Button dimensions, radius, padding, border and opacity; internal button-content dimensions changed externally. |
| Shared Image consumers | `src/svelte/pieces/media/media.css:22–23,33–34` | Stage resets Image background and fit; card/Avatar selectors reach Image placement/radius. Fit should be resolved by the media owner's closed semantics. |
| Search input composition | `src/svelte/pieces/search-field.css:2–9,11–20` | InputGroup, editor, addon, icon and clear-button dimensions, padding, font, focus and disabled appearance replaced by composition selectors. |
| Catalog search | `src/svelte/explorer/catalog-search.css:17–46` | Another layer replaces InputGroup shape/geometry/motion, child opacity, editor type/placeholder/focus, addon color, toggle button size and internal glyph motion. |
| Search empty state | `src/svelte/explorer/catalog-search.css:79–83` | Empty header/title/description/icon widths, gaps, typography and icon size supplied by search context. |
| Catalog cards | `src/svelte/explorer/catalog-media.css:1–21` | Card shape/material declarations; Button full-image geometry; Card header/title/description/footer padding, typography, alignment and background. Featured/item branches define additional presentations. |
| Catalog prose | `src/svelte/explorer/catalog-media.css:30–34` | Parent removes Stack title inset and changes paragraph typography. |
| Collection rows | `src/svelte/Collection.svelte:35`; `src/svelte/layout.css:14–18` | Button gets row-specific layout/padding and selected background; record class sets minimum height and focus offset. |
| Catalog navigation buttons | `src/svelte/catalog/CatalogNavigation.svelte:22–23` | Generic button wrapping/alignment and child type role changed by catalog navigation. |
| Field composition | `src/svelte/pieces/FieldWell.svelte:19–22`; `src/svelte/pieces/field-well.css` | InputGroup padding/layout plus editor, label, addon, prefix and clear-button geometry/focus controlled through descendant rules. This is a shared composition, but its dependency on overriding primitives remains. |
| Field accessories | `src/svelte/pieces/ClearInput.svelte:40–41`; `CharacterCounter.svelte:11–13`; `TextInput.svelte:52,57,61` | Addon/button minimum height, counter padding/type/color, and child editor focus suppression supplied by consumers. Preserve whole-well focus when moving ownership. |
| Selection triggers | `src/svelte/pieces/SelectionField.svelte:81`; `src/svelte/controls/DateControl.svelte:58`; `src/svelte/vendor/components/ui/select/select-trigger.svelte:14` | Generic Button receives field layout classes from multiple wrappers. |
| Stacks and grouped rows | `src/svelte/pieces/StackLayout.svelte:11–15`; `src/svelte/pieces/place.css:7–13`; `src/svelte/pieces/structured-content.css:25–72` | FieldSet/Legend/Group and generic row/label/button internals restyled by composition. Centralized composition is useful, but should not require an open primitive API. |
| Facts in reading context | `src/svelte/reading.css:13–20` | Fact rows lose padding/borders; labels/values change typography, alignment and spacing in prose contexts. |
| Face and Avatar | `src/svelte/pieces/Face.svelte:10`; `src/svelte/theme.css:89–95`; `src/svelte/pieces/surface-chrome.css:17,91` | Avatar size supplied as class/variable; contexts alter face size, icon scale and semantic ink. |
| Generic Action and Destination | `src/svelte/pieces/Action.svelte:44–50`; `DestinationRow.svelte:8`; `src/svelte/pieces/structured-content.css:7–14` | Generic Button gains composition-owned width, overflow, internal glyph/label layout, minimum height and focus offset. |
| Toolbar action and grip | `src/svelte/pieces/surface-chrome.css:8–10,52–55` | Toolbar sets child button size/padding; grip has separate geometry and primary-colored pressed mark despite generic neutral feedback. Grip behavior must remain owner-defined. |
| Message and transient framing | `src/svelte/pieces/surface-chrome.css:42–48,85–109` | Presentation-specific type variables, padding, alignment, truncation, flex and minimum content height are spread over frame/toolbar/body descendants. Message semantics differ legitimately, but ownership must be explicit and sealed. |
| Application headers | `src/svelte/HumanProduct.svelte:47`; `src/svelte/catalog/KitchenSink.svelte:23`; `src/svelte/layout.css:4–5` | ToolbarLayout callers attach topbar/catalog-header rules that alter padding, wrapping, gap and alignment. |

## Customization already exists inside the foundation

The vendor directory is not automatically a sealed primitive boundary:

- `input-group-button.svelte:46` restyles Button through its own size/class map.
- `input-group-input.svelte:17` and `input-group-textarea.svelte:17` strip
  Input/Textarea border, radius, background and focus treatment.
- `calendar-day.svelte:36`, `calendar-prev-button.svelte:21` and
  `calendar-next-button.svelte:21` style generic Button through calendar classes.
- `calendar.svelte:58–64` offers inline/picker styles and contextual background
  selectors, then accepts caller classes.
- `sidebar-input.svelte:19`, `sidebar-separator.svelte:17` and
  `sidebar-menu-skeleton.svelte:28–32` restyle Input, Separator and Skeleton.
- Dialog and Sheet each position their own close Button (`dialog-content:59`,
  `sheet-content:53`) with different offsets and separate header/footer recipes.
- `field-label.svelte:17` restyles Label and includes descendant-field recipes.

These instances need ownership decisions, not a blanket deletion of their
styles: editing interiors, day cells and whole surfaces have different semantics.
Their rules must be implemented by their owners without callers supplying CSS.
Unused vendor exports must not become an alternative route around that boundary.

## Shared rules that are not evidence of consumer drift

`pane-material.css`, `control-feedback.css`, `navigation-selection.css`,
`typography.css` and the token file define shared owners or semantic states.
Reduced motion, high contrast and reduced transparency are owner behavior, not
consumer exceptions. Focus, invalidity and disabled state must remain supported.

The search dimming/blur plane is currently a separate noninteractive scrim
(`catalog-search.css:49–65`), not a pane. Its different opacity alone does not
prove a pane-material violation.

Runtime image transforms, docking opacity, scroll masks and editor capacity are
recorded in the inventory. A mechanism changing its own state is not equivalent
to an arbitrary consumer redefining a primitive. The missing restriction is who
may access those internals.

## Existing checks pass despite the ownership defect

Executed unchanged on this source baseline:

`node --test tests/pane-ownership.test.ts tests/interaction-catalog.test.ts`

Six tests pass. This is evidence of limited coverage, not architectural closure.

- Product contracts reject arbitrary class/style and unknown presentation.
- The pane gate checks an explicit set of files/selectors and material properties:
  background, filter, border, shadow and opacity.
- It does not generally reject consumer geometry, typography, custom properties,
  arbitrary component classes/styles or cross-owner selectors.
- The reviewed calendar browser tests check toolbar existence, month navigation,
  selection, focus and containment, not geometric equality with another surface.

## Required architectural boundary

The owner rule must apply to renderer composition as well as product authoring:

1. Expose only closed semantic contracts. Remove visual `class`, `style`,
   arbitrary variants, presentation variables and unsanitized attribute spreads
   from consumer-facing APIs. Do not replace them with a generic `custom` option.
2. Establish one owner for each primitive's DOM, CSS, state and motion. Contexts
   cannot target its descendants or redefine its custom properties.
3. Let the surface owner resolve edge, available space, density, toolbar slots,
   content guide and responsiveness. A consumer supplies content and intents,
   not numerical padding, button size or a replacement toolbar.
4. Enforce imports and ownership at build time. Block direct foundation bypass,
   cross-owner CSS selectors, style props, reserved data-attribute replacement
   and runtime writes to another owner's internals.
5. Add negative tests: every forbidden customization must fail validation/build,
   not merely be absent from one screenshot. Add cross-consumer geometry and
   interaction comparisons, including calendar, select, generic surface,
   sidebar, search and gallery.

No repair or new approval-grade visual proposal is included in this audit.
The full recorded source locations are in `inventory.json`; classification above
must not be mistaken for an exhaustive list of browser-visible defects.
