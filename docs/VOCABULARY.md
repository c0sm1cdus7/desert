# Vocabulary

One term, one meaning. Code identifiers, documentation and owner-facing text use these words.
Agreed with the owner on 2026-10-23 (Visual Catalog exclusivity plan, section 4).

## Product

| Term | Meaning | Lives in |
| --- | --- | --- |
| Product | The one composed root: modules, workspace, entry, navigation and exposures. | `composeProduct` |
| Module | One capability: objects, commands, reads, journeys, views and destinations, with explicit exports. | `defineModule` |
| Object | A typed record definition: facts and policies. | `objectType` |
| Fact | One typed field of an object. | `text`, `integer`, `enumeration`, `principal`, `file`, `labels` |
| Command | A declared change of one object (create or update) with its inputs. | `createCommand`, `updateCommand` |
| Read | A declared authorized read: object, facts, filter. | `readJourney` |
| Journey | The binding of a view's outputs to actions: submit a command, navigate, select, close, back, lock. It neither draws nor executes. | `*.journey.ts`, `ViewJourney` |
| Activity | A journey that collects one command's inputs over several saved steps. | `activityExperience` |
| View | What is shown: an ordered sequence of catalog compositions plus ports (inputs and outputs). It is inert. | `defineView` |
| Output | A named event a view can emit, for example `save` or `close`. The journey decides what it means. | `viewPorts` |
| Action | What a journey does with an output. | `outputs[].action` |
| Destination | A navigable place: label, icon and the journey that opens it. | `ViewDestination` |
| Exposure | The journeys offered to one participant kind (human or agent). Availability is not authority. | `humanExposure`, `agentExposure` |
| Execution | The fixed path every command takes for every participant: begin, preflight, prepare, accept, receipt. | `LocalSession` |

Journey kinds today: presentation, read, create, update, action, activity. Human review before
a command: required (review screen), confirmation (dialog), not-required.

## Visual

| Term | Meaning |
| --- | --- |
| Visual Catalog | The typed set of pieces. Nothing outside it is drawn. |
| Piece | Any catalog entry: a foundation or a composition. |
| Foundation | A leaf piece: the only kind that emits DOM, CSS, SVG, text or vendor components. |
| Composition | A branch piece: composes pieces and owns no DOM. |
| Mechanism | A shared stylesheet or recipe with one owner (the theme or a foundation). |
| Renderer | A dispatcher composition from resolved node kinds to pieces (`NodeRenderer`). |
| Resolved node | Runtime data the interpreter produces for a renderer (`ResolvedNode`, `ResolvedNodes`). |
| Variant / State | A declared axis of meaning of a piece / a declared runtime condition. |
| Specimen | One variant in one state, rendered in the Visual Catalog. |
| Approval | The owner's stamped digest of a piece's appearance, in `src/svelte/catalog/approvals.json`. |
| Surface | The frame that holds content and toolbars: one main, lateral beside it, transient above it. |
| Page | A view shown in the main surface for a destination. A role, not a type. |
| Dialog | A transient surface with face, title, subtitle and actions, and nothing else. |
| Toolbar | The docked strip of actions and identity at the top or bottom of a surface. |
| Dock | A slot of a view: top and bottom hold toolbars; left and right hold lateral surfaces. |

"Catalog" means only the Visual Catalog. Other registries are indexes: `moduleIndex`,
`viewIndex`, `activityIndex`, and the product index derived by `composeProduct`.

## Renamed in slice 0

`humanSurface`/`agentSurface` → `humanExposure`/`agentExposure`; the composition key `surfaces` →
`exposures`; `moduleCatalog` → `moduleIndex`; `viewCatalog` → `viewIndex`; `activityCatalog` →
`activityIndex`; `InteractionCatalog` → `ResolvedNodes`; `PrimitiveId` → `ResolvedNodeId`;
`BankNode*` → `ResolvedNode*`; `BankRenderer` → `NodeRenderer`; `webRenderers` → `nodeRenderers`;
`BankEvent` → `NodeEvent`; `ControlBank` → `ControlSpecimens`; product `*Experience` constants →
`*Journey`.

## Not renamed yet, and why

- Serialized names keep their spelling until generated migrations exist (slice 7.3), because they
  feed the installation digest: the domain field `surfaces`, the database columns, protocol
  version strings such as `desert.bank-node/1`.
- `Components.Fact`: the `fact` item is shared by view leaves and information content; it is split
  with the one-grammar work (slice 5).
- `SurfaceIntent`: it mixes outputs and actions; it is replaced with the grammar (slice 5).
- `Place*` pieces: rebuilt as the surface composition (slice 4).
- `preferredDock`: it overlaps with `presentation: "transient"`; one presentation field is a
  grammar change (slice 5).
- CSS classes and data attributes named `bank-*`, and `PublicCatalogBank*`: the visible catalog is
  regenerated in slice 6.
