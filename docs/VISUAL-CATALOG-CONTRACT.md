# Visual catalog ownership contract

Definition dated 2026-10-20, based on the owner's requirements. Enforcement and
migration are not implemented by this document. The preserved UI baseline is
`v127a-stable` at commit `d0a50d2ca5119645c89cb5a4ec6cb227a38e9360`.

## Governing rule

Only the visual catalog may define or produce application presentation.
Consumers provide content, semantic intent and state. They cannot define,
replace or override a piece's structure, appearance, geometry or interaction.
This applies equally to products, renderer adapters, examples and compositions
that consume other catalog pieces. Internal code is not exempt.

The renderer is an interpreter and event adapter, not a second design system.
A missing catalog capability is an error, not permission to handcraft a fallback.

## Architectural responsibilities

| Layer | Permitted responsibility | Prohibited authority |
| --- | --- | --- |
| Product contract | Meaning, content, permitted intents, constraints and state | Markup, styling, visual parameters or component implementation selection |
| Renderer adapter | Validate descriptors, resolve installed catalog entries, route typed events, maintain nonvisual application state and resource lifecycles | Visual DOM, CSS, layout recipes, breakpoints, transitions, gesture choreography or alternative controls |
| Catalog composition | Own its structural regions and arrange permitted children through closed slots | Restyle children, replace their internal DOM or inject an alternative implementation |
| Catalog primitive | Own its DOM, geometry, material application, accessibility, states and behavior | Accept arbitrary presentation supplied by a consumer |
| Shared catalog mechanisms | Own material, typography, motion, feedback, measurements and adaptive algorithms | Let consumers replace their tokens, recipes or algorithms |
| Platform integration | Supply validated environment facts and capabilities; mount the catalog root | Decide per-product aesthetics or expose raw host elements to consumers |

The dependency direction is product meaning → renderer adapter → catalog
descriptor tree → catalog implementation → platform. Browser/native APIs and
framework markup belong to the catalog implementation or its sealed host adapter,
not to product-specific orchestration.

The target renderer is nonvisual TypeScript producing a closed descriptor tree.
One catalog-owned root view interprets that tree and mounts registered pieces.
The adapter cannot emit even unstyled tags or raw text nodes: those still create
layout or typography. The root view's name and module path are implementation
details, not a new product-authoring API.

Nonvisual mounting and lifecycle work uses an explicitly registered internal
host capability. Calling a styled wrapper "infrastructure" does not exempt it.
Focus, scroll, dismissal, hit testing, docking and animated presence have visible
or interaction consequences and therefore belong to catalog owners.

## One authoritative catalog

A versioned manifest is the sole inventory for validation, imports, dispatch,
documentation and the component bank. Its metadata must include:

- Stable identity, semantic purpose and kind: `primitive` or `composition`.
- Closed input/state/event schemas and permitted child slots with cardinality.
- One owning implementation module set, its private parts and permitted dependencies.
- Shared mechanisms used, supported environments and explicit unsupported cases.
- Deterministic examples, behavioral expectations and visual acceptance evidence.

Private parts and mechanisms are recorded for ownership and reachability, not
exported as extra consumer components. "Control" is a discovery category, not a
third ownership model. States, presentations and filenames are not component counts.
The current broad `PrimitiveId` must not continue naming compositions as primitives.

The current 23 semantic IDs remain compatibility inputs during migration. They
resolve to entries in this same manifest; they must not become a parallel visual
catalog. Existing schemas cannot silently gain product execution capabilities.

Every production visual module and asset dependency has an owner. Unregistered
markup, CSS, render factories, component aliases and newly introduced dependencies
fail ownership validation, including code not currently reached by the preview.
Moving a file into a folder or adding its name to an allowlist does not establish
ownership: its API, dependencies, examples and acceptance obligations must qualify.

## Required coverage of the existing UI

These are ownership families for current functionality, not proposed new widgets
or final public constructor names. Subparts stay private.

| Owner family | Existing responsibilities that must be covered |
| --- | --- |
| Surface | Main canvas, content viewport, perimeter, edge docking, adaptive side panels, anchored and transient hosts, grip, scrim, focus and dismissal |
| Toolbar | Leading action, identity, trailing utilities, overflow and bottom actions |
| Header | Title/subtitle, optional image/video/gallery canvas, content alignment and dock handoff |
| Stack and rows | Titled stacks, grouped panels, content guide, rows, separators and horizontal rails |
| Action | Button faces, semantic state, pointer/keyboard feedback and activation |
| Field | Label, well, feedback, width adaptation, text/multiline, masks, clear/count accessories and date/money/file compositions |
| Choice | One divided option anatomy, single/multiple marks, selection and exploration behavior |
| Text and status | Heading/body/support roles, facts, availability, tags, empty/unavailable states and messages |
| Media | Image identity/loading, avatar, photo collection, pagination, thumbnails and viewer gestures |
| Navigation and search | Menu/selection, sidebar content, destinations, search expansion, results and navigation gestures |
| Semantic compositions | Collections, forms, context, review, problems, destination cards, catalog home and reading detail |
| Catalog inspection | Bank navigation, specimen frames, metadata and evidence presentation using the same pieces |

No independent hero or collapsible-content family is admitted. Dormant competing
implementations are removed from shipped source after migration qualification.
The bank must demonstrate every consumer-facing entry and every distinct installed
presentation, including structural pieces, not only the current 23 semantic nodes.
Private subparts can be inspected through their owner's examples.

## Closed composition rules

Slots accept validated catalog descriptors, not HTML, Svelte snippets, components,
render callbacks or untyped property bags. Each slot declares which entries it
accepts, their number/order semantics and the catalog-owned arrangement.

Consumers may supply meaning such as navigation intent, selected value, date
bounds, selection cardinality or media identity. They may not supply pixels,
spacing, radius, font size, color, duration, easing, arbitrary density/size/style
variants, breakpoint rules or a replacement toolbar.

Local UI events such as changing month or zoom remain typed local events, not
invented business commands. Routing an event does not grant execution authority.
Hover, press, focus and gesture state belong to the piece, not to product state.

The owning composition allocates its own slots using a catalog-owned layout
algorithm. The child adapts to measured capacity through its own rules. A parent
does not set the child's CSS variables, classes, internal geometry or behavior.
Consumer preferences cannot masquerade as environment measurements.

Identical semantics, state and environment produce the same presentation wherever
the entry is used. Responsive layout, accessibility preferences and genuine
semantic states remain supported by the owner; "always the same" does not mean
fixed dimensions or ignoring disabled/invalid/selected state.

A new semantic distinction requires a contract change, examples and acceptance.
It cannot encode a caller name such as "calendar-padding" or "sidebar-button".
An approved visual difference must be modeled by its real meaning, not preserved
as an arbitrary customization option.

## No presentation escape hatches

Consumer boundaries reject `class`, `style`, utility classes, CSS custom-property
maps, arbitrary HTML attributes, reserved data markers, component references,
DOM refs and unsanitized spreads. Accessibility metadata is typed and validated;
it cannot overwrite owner-controlled roles or states. Meaningful labels remain
authorable without exposing a general HTML API.

This also excludes broad HTML attribute/component-prop types, index signatures,
symbol-keyed attachments, Svelte actions/transitions and caller-provided handlers
that replace owner interaction. Library trigger wiring stays inside a sealed
catalog bridge, with no arbitrary attachment forwarding from the renderer.

Cross-owner selectors, inherited presentation overrides, injected stylesheets,
style/attribute mutation, foreign DOM queries, animation calls and render-time
HTML injection are forbidden. Shadow/portal boundaries are not ownership exceptions.
Global theme and preference rules have one catalog owner and cannot be replaced
by a page. Images, video and validated media handles are content, not stylesheet
or executable-markup channels.

Catalog compositions also obey these restrictions. A composition may create
only its own structural DOM; it consumes children through their closed contracts.
Framework/library interoperation is private to the owning implementation.
Vendored shadcn/Bits code is a dependency, not a consumer-facing escape hatch:
no direct imports from products, adapters or unrelated catalog owners.

Reusable material/state mechanisms apply their approved recipe once at the
appropriate owner boundary. They do not grant consumers a writable theme scope.
Runtime measurements/transforms are permitted only through owner-bound references
inside that owner's registered mechanism; arbitrary DOM access is not exported.

## Failure and acceptance behavior

Unknown entries, forbidden properties, invalid slots, unowned visual source and
unsupported presentations fail validation/build. Runtime unknown descriptors
are rejected before rendering; any visible error uses an installed catalog error
composition. No raw-HTML fallback, silent downgrade or best-effort custom control.

The enforcement plan and independent acceptance cases are in
[visual catalog enforcement](VISUAL-CATALOG-ENFORCEMENT.md). A rule is not
implemented merely because TypeScript types or a document say so.

This boundary governs supported authored inputs and the reviewed build graph.
It is not a sandbox against arbitrary hostile same-origin JavaScript or someone
rewriting the checker. Generated code, dependencies and build configuration are
part of the validated trusted build; arbitrary executable plugins are not admitted.

## Preserving the approved UI

First close architectural authority while retaining approved behavior. Do not
promote every existing override into an owner variant. Rules that duplicate an
owner are deleted; genuine shared requirements move to that owner; conflicting
visual behavior requires an explicit before/after decision.

The calendar mismatch is known outstanding work, not an approved geometric rule.
Preserve accepted behavior elsewhere while qualifying the common surface/toolbar
anatomy. No architectural migration may silently alter material, search motion,
button feedback, content guides, docking, gallery or accessibility behavior.

Changing this definition does not modify `v127a-stable`, its release or preview.
Implementation proceeds in separately verified slices; no migration is complete
while a consumer still has authority to override the migrated family.
