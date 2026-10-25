# Web renderer: ownership and boundaries

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/WEB-RENDERER.md

Source SHA-256: 695439b4fa9e5eb93f23d555304fa0f5a54b0b8b1c1d1fa73d398501b2b87c9a

# The DESERT human web renderer

This describes the current source contract, not certification of every state or
device. The installed human renderer uses SvelteKit and the shared shadcn/Bits UI
bank. It interprets the product's admitted View program; it does not invent
product pages, commands or presentation rules.

Historical approvals and screenshots remain evidence for their exact revisions.
They do not qualify a later build automatically. See STATUS (SDK file: `docs/STATUS.md`),
bank coverage (SDK file: `docs/BANK-COVERAGE.md`) and VOID verification (SDK file: `../void/docs/VERIFICATION.md`)
for recorded limits.

## The product declares its experience once

Notebook is an example composed product in `products/notebook/src/`. Its modules
publish objects, commands, execution journeys, Views and destinations. Root
composition supplies the workspace, navigation and entry destination. Root
Notebook files are compatibility reexports, not another product definition.

The actual Notes View uses SDK-issued component values:

```ts
import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });

export const NotesView = defineView({
  name: "notes", outputs: Ports.outputs,
  topDock: Components.Toolbar({
    actions: [{ output: Ports.output.create, label: "Create note", icon: "create" }],
  }),
  content: [
    Components.Header({ title: "Read notes", subtitle: "Your private notebook." }),
    Components.Stack({ title: "Notes", items: [
      Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select }),
    ] }),
  ],
});
```

The Header is a sibling of the Stack, not another stack. Each component has
closed typed properties. The SDK emits component wire identities. View/output
names are local declarations; references to other Views, journeys, facts and
inputs use admitted objects or issued references. Internal serialized IDs are
not a second product authoring API.

Static authoring checks reject extra nested Toolbar properties, including values
held in variables. `defineView` checks top/bottom Toolbar outputs and Collection
outputs nested in Stacks against the declared output ports; widening to `string[]`
or `ViewDeclaration` does not bypass that check. This is a bounded guarantee, not
a claim that TypeScript proves every nested property of every component. Runtime
admission still checks untyped inputs.

`ReadNotesJourney` binds this View to the read journey, its object View and
its outputs. Create emits a journey intent; Select emits a selection intent.
The View cannot execute either operation. Object publication selects the object
View, title fact, field labels/representations and toolbar actions. Notebook
publishes body as `paragraphs` and Archive as an icon action. The command remains
the single owner of its input requirements and effects.

The navigation surface is declared too. `WorkspaceView` has
`leftDock: Components.Dock(NavigationView)` and `Components.Destination()` as
content. `NavigationView` uses `ViewTitles.product` and `Components.Navigation()`.
The sidebar is not an implicit extra surface added by the renderer.

`composeProduct` registers that workspace, the modules, surface exposure, entry
destination and navigation groups. Notebook's entry is Notes; VOID's entry and
access policy belong to VOID's composition/host, not a Notebook fallback.
Surface declarations expose journeys and locale. They no longer author another
entry, primary action, subject-action list, input map or commit map. The compiler
derives field presentation, read scopes and confirmation behavior from the
registered publications and journeys.

Public `compile(composedProduct)` accepts only an issued composition. Builds and
controller hosts derive its one bound View program. They reject raw wire
applications and a separately supplied `viewProgram` override for a served UI.
Internal protocol tests may compile wire definitions; this is not a public
authoring path or an alternative renderer.

## From declarations to pixels

```text
Product modules + Views + journeys + workspace/navigation
  → composeProduct → compile(composedProduct)
  → admitted ViewProgram + projected HumanSurface + command validators
  → AccessGate → ViewProduct → typed client projection
  → registered adapters → shared web catalog owners
  → Place / Toolbar / content / adaptive panel
```

| Owner | Responsibility |
| --- | --- |
| `src/modules/compose.ts` | Admit and connect module/root declarations. |
| `src/modules/compiled-product.ts` | Bind the application to its admitted View program. |
| `src/views/program.ts` | Validate View bindings against the exposed surface. |
| `src/web/build.ts` | Generate surface/program and standalone command validators. |
| `src/svelte/catalog/compositions/access-gate/AccessGate.svelte` | Mount content only for an admitted session or explicit developer host. |
| `src/web/client/view-program.ts` and `view-projection.ts` | Resolve destinations, Views and panels without drawing. |
| `src/web/client/view-scopes.ts` | Derive read/mutation scopes while sharing one connection observer. |
| `src/svelte/views/` | Forward typed projections through the registered adapter catalog. |
| `src/svelte/catalog/compositions/view-workspace/ViewWorkspace.svelte` | Adapt the resolved workspace to the existing catalog shell. |
| `src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte` | Compose shared navigation, main surface, search and panels. |
| `src/svelte/catalog/compositions/view-panel/ViewPanel.svelte` | Adapt the panel to existing Drawer/SurfaceFrame owners. |
| `src/svelte/catalog/renderer/bank-renderer/NodeRenderer.svelte` and `renderer-registry.ts` | Validate and dispatch installed bank descriptors. |

`DESERT-BUILD.json` format `desert.distribution-build/3` binds files, renderer
revision, contract, distribution, surface and `viewProgramDigest`. Activities add
their derived digest when present. Two products with the same wire domain but
different View programs cannot serve each other's build. A source change
invalidates the prior renderer fingerprint; source must stay fixed throughout
the entire browser verification window, not only during compilation.

Products cannot provide CSS, classes, HTML, arbitrary callbacks, Svelte snippets,
motion timings or component overrides. `defineView` admits only issued
`Components` values. The Visual Catalog gate (docs/VISUAL-CATALOG-ENFORCEMENT.md)
also constrains renderer compositions and every nonvisual module the page reaches.
Pieces with closed contracts have finite props; a composition renders only the
slots its declaration names.
This is not a sandbox against a trusted developer editing the SDK itself.
Historical visual debt is inventoried, not permission for a new bypass.

## One semantic bank and one web implementation catalog

`src/interaction/catalog.ts` is the renderer-neutral semantic inventory.
At this source revision, `desert.human-interaction@0.4.2` contains 24 entries and
60 specimen states. Counts derive from that object, not this document.
`catalog-ownership.ts` records owners, axes, fixture identities, assertions and
evidence paths. A referenced test path is not certification.

The inventory includes text/multiline inputs, facts, actions, availability,
collection, form, context, review, transient and problem compositions; public
catalog card/home/detail; and select, popover, files, labels, options, money,
date, tag, image and avatar controls. A visual specimen alone does not install a
product-command field. Text, labels and private-image inputs have canonical
bindings; other controls remain local exercises unless their command grammar
and execution binding are installed.

`NodeRendererTable` associates each entry with its own props/events.
`renderer-registry.ts`, generated from the `renders` field of each catalog
declaration, binds entries to actual components. Renderer compositions import the
pieces they mount from the generated catalog index. Neither is another product
definition.
`RendererTable<T>` alone checks inventory, not component compatibility.

A registered View requests `Components.VisualCatalog()`. It does not require
a `?catalog=1` alternate renderer. Specimens reuse production owners. Missing
form/review execution is labelled as a gap, not fabricated with fake commands.
Real Notebook/VOID journeys exercise actual controller effects and receipts.
Search filtering retains mounted specimens and their local writing.

Native and terminal renderers are not installed or certified here. Future
renderers must consume the same semantic program while owning their platform's
catalog. The agent surface shares journeys and command semantics, not HTML or
decorative controls.

## Shared surface anatomy

```text
WorkspaceView
├─ left dock: NavigationView → navigation Place
│  ├─ ToolbarLayout: product title + navigation toggle
│  ├─ destination groups
│  └─ ToolbarLayout: installed utility actions
└─ active destination → main Place
   ├─ fixed ToolbarLayout: identity + icon actions
   ├─ native scroll viewport
   │  ├─ ordinary PlaceHeading / media hero
   │  └─ typed sibling content and titled Stacks
   └─ optional fixed bottom ToolbarLayout

Search and adaptive panels compose above retained workspace content.
Each scrolling surface owns its ScrollEdges and focus revelation.
```

`Place.svelte` owns the viewport; `PlaceHeading.svelte` is ordinary scrolling
content. There is no `ExpandingToolbar` API or phantom header reservation.
`ToolbarLayout.svelte` owns page, navigation, picker and transient geometry.
An unpreceded toolbar title shares its surface's reading axis; a leading action
occupies the defined leading lane. Consumers cannot replace toolbar padding.

The navigation Place is one named landmark including its top toolbar,
destinations and bottom toolbar. It is not a nav fragment beneath a page banner.
Internal toolbar/heading wrappers do not declare banners. Shared embedding
context controls semantic heading levels, independently of typography. Catalog
annotations use note semantics rather than unrelated landmark asides.

The main surface stays full width. Docked navigation reserves a leading
content/control inset without clipping hero media underneath it. Fit depends on
available host space and text size, not device names. Navigation becomes an
overlay when its shared width and reading budget no longer fit.

An adaptive right panel retains one mounted identity across docked, right-
transient and bottom-transient presentations. Fit reserves a 45rem main Place,
36rem pane and 24px spacing after navigation. A right transient fits at 36rem
plus 24px; less available space selects the bottom presentation. This is a
shared renderer rule, not a per-product media query. Adaptation does not replay
entrance motion or discard drafts. Wide entrance is lateral; compact entrance
is vertical. Reduced motion removes entrance/exit animation.

A held drag stays reversible. Release beyond the dismissal threshold closes;
a short or reversed drag returns to rest. Right transients have no bottom grip.
Close/Escape remain alternatives whenever dismissal is permitted. Locked or
uncertain work cannot silently disappear through ordinary navigation.

SurfaceFrame's closed `desert.surface-frame/6` carries typed top/content/bottom
data. A transient without a primary action omits redundant bottom Close.
A form with a primary action keeps its paired secondary action and top icon
dismissal. Messages use a closed message presentation with one secondary Close.
A context has no command-step footer or invented Actions list: published object
actions appear as icons in its top toolbar. Conditional activities reuse these
owners; they do not add a separate wizard layout.

## Material, text and interaction

`catalog/mechanisms/pane-material/pane-material.css` owns Glass: a neutral 88% translucent fill, 24px blur
and one perimeter. Independent action faces, wells, grouped lists, navigation
and transient surfaces use it; interiors stay transparent. Primary actions tint
the same material with the primary color. This supersedes the earlier neutral-
primary treatment without adding a button owner. Reduced transparency/increased
contrast use the common opaque fallback. Disabled content dims once, not its
pane. Invalid/focus outlines are semantic ink. This is web Glass, not certified
native Liquid Glass refraction.

`ScrollEdges` observes each surface's own viewport and actual toolbar bounds.
Mirrored, pointer-inert surface-colored fades appear only beside installed
toolbars where content overflows. They clear at beginning/end and cannot enlarge
the document. The earlier black wash is superseded. There is no page-edge
backdrop blur: toolbar text/actions paint above the fade, content below; actual
panes alone filter their background. Focus revelation reserves measured chrome
and feather without taking over ordinary wheel/touch scrolling.

Click/tap or keyboard activation of the top toolbar's title/free area scrolls
its surface to zero. Action buttons retain their own operations. Catalog section
arrows are not another scroll-to-top control.

Stacks group visible content with a title and spacing, not a painted card,
disclosure or accordion. Text uses shared semantic roles. Supporting metadata
must not outrank its group. Field wells keep accessible labels. Collections do
not inject sort captions as Stack subtitles. Embedded heading levels follow
actual hierarchy, not font size.

FieldWellContent owns label/value geometry across text, selection and money.
Labels reserve actual wrapped height. The editing row is separate; textarea
scrolling cannot run beneath its caption. Selection uses the whole well as
trigger. Multiline counters live outside the editor scrollport and join errors
in `aria-describedby`, without per-keystroke live announcements. Counts follow
JSON Schema Unicode code points; native UTF-16 `maxlength` does not truncate
drafts. Controls grow for content/enlarged text rather than shrinking type.

Clear retains editing focus and uses the existing input pipeline. It does not
submit, dismiss, or change Money's currency. Plain-text native undo is attempted
through the existing browser bridge; cross-browser undo parity is not certified.
Money uses exact minor-unit strings, never floating-point amounts, rounding or
FX conversion. Locale-aware incomplete writing stays editable without emitting
a canonical value. Invalid precision/scale changes preserve the prior value.

Selection/date pickers use an anchored panel when readable width/context fits,
otherwise the shared bottom sheet. Exploring a choice does not commit it;
activating a permitted value does. Calendar has a local seven-column horizontal
viewport at enlarged text sizes. Native keyboard/listbox behavior is retained.

`labels()` is a canonical string-array field, not CSV or JSON text. Its shared
control adds/removes labels; reading uses the existing Tag owner. The policy is
at most 12 labels of 64 Unicode code points each, preserving order and case.
Explicit Add trims the candidate. The server rejects noncanonical whitespace
and exact duplicates rather than silently changing the submitted intent.
The canonical command validator owns validity.

Shared Button owns stationary bounds/perimeters and inner press feedback.
Pending replaces the face with a loader while retaining geometry and accessible
name. Disabled controls do not acquire hover/press. Reduced motion retains
color feedback without compression. Toolbar actions have icons and accessible
names; footer labels adapt to actual available width through the same Action
owner. An icon or enabled-looking control does not grant authority.

## Search, reading and execution

Search is a toolbar action opening the common overlay, never a permanent field
inserted into destination content. SearchField supplies magnifier/input/Clear.
The overlay retains its originating page, scroll and drafts, restoring focus on
Close/Escape. The actual rounded input capsule grows inside a stable rail; no
reveal mask, glyph scaling or page reflow substitutes for that growth. Reversing
retains the same input. Compact placement, safe areas and reduced motion belong
to the owner.

Search uses only declared scope: loaded published collection values, installed
catalog metadata or public media data. It cannot inspect hidden facts or claim
remote search. Unknown collection state, known empty and no matches stay distinct.
Typing does not execute a command; activating a result navigates.

Object title/fields/actions derive from publication and its canonical read.
Prose, labels and images have explicit representations, not field-name/array
heuristics. Unknown/Empty/Untitled are display states, never rewritten facts.
Literal stored values such as "Empty" remain ordinary text. Current offers,
policies and subject version determine available actions; acceptance rechecks
authority.

Execution is `begin → prepare → accept`, with explicit review when required.
`src/web/client/mutations.ts` sends the canonical operation through transport,
gateway and dispatch. Local admission/preparation/acceptance own identity,
subject/version, effects and atomic receipts. Availability is an observation,
not permission. Uncertain responses use receipt recovery, never implicit replay.

Preparation visibility is enforced in the controller for both human and agent
surfaces: only their own published reads and operation input targets authorize
returned facts. Ownership/internal facts remain excluded. The earlier
prepare-response finding (SDK file: `docs/BANK-SECURITY-FINDING.md`) is corrected; its historical
reproduction is retained. UI filtering alone is not that confidentiality
boundary. Complete stored effects and their confirmation/receipt integrity
remain canonical.

One shared connection observer reports controller availability to active read
scopes. Eligible reads refresh through a bounded coalescing scheduler.
Navigation, selection, stop and connection loss invalidate obsolete work.
Equal snapshots do not remount the view or replay motion. Drafts remain editable
during controller loss; reconnection refreshes without replaying writes. These
are controller-specific states, not a generic Internet-connected badge.

Conditional activities collect ordered typed inputs and prepare the same
command. VOID's Guided note reuses the real create command. Durable runtime
drafts/revisions and pending receipts are separate from the identity/contract/
surface-scoped browser journal. Conditional business requirements, human subject
activities, delegated identity assignment and a Capibara document product are
not installed. Activity conditions cannot weaken current command requirements.
See ACTIVITIES (SDK file: `docs/ACTIVITIES.md`) for grammar, recovery and remaining limits.

## Media and access boundaries

The common media library/viewer supports installed public image/video/audio
fixtures in one layout. Playback state belongs to a queue entry, not only its
URL. Image gestures and thumbnails remain shared; media-specific playback/time/
volume controls use the same toolbar owners. This does not trust arbitrary
uploads or external media URLs.

Private images use canonical `imageAsset()` inputs. Browser acquisition stages
bytes through the authenticated controller, preserves the original and produces
bounded renditions. Prepare/accept bind issued references to identity, run,
input and contract. Private bytes never enter the public build media directory.
Reading a blob requires a canonical authorized read, not knowledge of its UUID.
The private-image context/resource aborts requests, discards stale results and
revokes blob URLs on invalid scope, controller unavailability, departure or
lock. A rendition change of the same authorized image retains the current
image while the replacement loads instead of deliberately flashing blank.

VOID supports private image import, detail viewing, rename and recoverable
Trash/Restore. Its private collection is title-only: private thumbnail galleries,
private albums and private video/audio import are not installed. The public
demo library is separate from this private authority path.

AccessGate keys admitted content by identity. Lock/revocation removes the private
product scope. The local lock barrier survives offline lock/reload and propagates
across tabs; an old valid cookie cannot clear that barrier. Explicit developer
mode is distinct from identity authentication. This does not complete identity
administration, password recovery, remote deployment or MCP OAuth provisioning.
No installable offline PWA, native renderer or persistent ordinary text draft
after browser exit is claimed. Initial page delivery still requires its host.

## Verification and reproduction

Runtime/type tests establish admission and operation invariants, not pixel
acceptance. Shared-owner browser tests cover geometry, keyboard, motion,
overflow, accessibility and interaction. Passing fixtures do not certify every
combination, browser or native assistive technology.

Historical visual approval remains at
`artifacts/ui-maturity-v118/acceptance.json`. Its bytes are unchanged. Current
source supersedes the old expanding chrome, black fade, neutral primary and
standalone product renderer; those older descriptions are not current APIs.
Semantic-wrapper fixes have their own screenshot-parity tests rather than
resetting approved baselines.

The test-only InspectionProduct composes real Notebook modules with an authored
Visual catalog View. It is not a user preview or alternative renderer.
`tests/web/inspection-migration.json` records retired assumptions and retained
invariants. Diagnostic callbacks do not replace real create/review/accept/
recovery tests. Rebuild after source changes, then freeze source for the complete
browser run.

From the SDK directory, with Node 24 and local PostgreSQL available:

```sh
npm ci
npm run web:check
npm run web:build -- build/my-notebook-preview
npm run notebook:web -- build/my-notebook-preview .local/my-notebook-preview 4273
```

Use the host launch/access flow in LOCAL-CONTROLLER (SDK file: `docs/LOCAL-CONTROLLER.md`) and
DISTRIBUTION-BUILDS (SDK file: `docs/DISTRIBUTION-BUILDS.md`). Never publish a private invitation.
Use a new build/store when a contract is incompatible; do not repin or overwrite
an older store to silence a mismatch. The generated
source walkthrough (SDK file: `skills/desert/references/web-renderer.md`) is hash-checked
and must be regenerated for its own source checkpoint. Documentation does not
replace executable evidence.

# Complete contract-to-controller source walkthrough

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- products/notebook/src/exposures.ts
- products/notebook/src/messages/keys.ts
- products/notebook/src/modules.ts
- products/notebook/src/modules/notes/commands/archiveNote.command.ts
- products/notebook/src/modules/notes/commands/createNote.command.ts
- products/notebook/src/modules/notes/journeys/archiveNote.journey.ts
- products/notebook/src/modules/notes/journeys/browseNotes.journey.ts
- products/notebook/src/modules/notes/journeys/createNote.journey.ts
- products/notebook/src/modules/notes/journeys/readNotes.journey.ts
- products/notebook/src/modules/notes/note.object.ts
- products/notebook/src/modules/notes/note.publication.ts
- products/notebook/src/modules/notes/notes.dependencies.ts
- products/notebook/src/modules/notes/notes.module.ts
- products/notebook/src/modules/notes/views/createNote.view.ts
- products/notebook/src/modules/notes/views/note.view.ts
- products/notebook/src/modules/notes/views/notes.view.ts
- products/notebook/src/notebook.product.ts
- products/notebook/src/views/navigation.view.ts
- products/notebook/src/views/workspace.view.ts
- products/notebook/distributions.ts
- src/interaction/catalog.ts
- src/field-representation.ts
- src/interaction/form.ts
- src/interaction/resolved-node-schema.ts
- src/interaction/resolved-node.ts
- src/interaction/node-events.ts
- src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte
- src/check-surface.ts
- src/project-surface.ts
- src/web/build.ts
- src/build/svelte/template/src/routes/+page.svelte
- src/svelte/renderer-contracts.ts
- src/svelte/renderer-registry.ts
- src/views/program-schema.ts
- src/views/program.ts
- src/views/resolved.ts
- src/web/client/view-program.ts
- src/web/client/view-projection.ts
- src/svelte/catalog/renderer/view-product/ViewProduct.svelte
- src/svelte/catalog/renderer/workspace/Workspace.svelte
- src/svelte/catalog/compositions/view-workspace/workspace-data.ts
- src/svelte/infra/media-data.ts
- src/svelte/catalog/renderer/media-content/MediaContent.svelte
- src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte
- src/svelte/catalog/foundations/shell/Shell.svelte
- src/svelte/catalog/foundations/shell/ShellNavigation.svelte
- src/svelte/catalog/foundations/bar/BarSearch.svelte
- src/svelte/infra/workspace-navigation.ts
- src/svelte/infra/workspace-search.ts
- src/svelte/catalog/renderer/view-content/ViewContent.svelte
- src/svelte/catalog/renderer/view-item/ViewItem.svelte
- src/svelte/catalog/compositions/view-binding/ViewBinding.svelte
- src/svelte/catalog/renderer/panel/Panel.svelte
- src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte
- src/svelte/catalog/compositions/inspection/inspection-fixture.ts
- src/svelte/infra/inspection-media.ts
- src/svelte/catalog/compositions/access-gate/AccessGate.svelte
- src/svelte/catalog/compositions/collection/Collection.svelte
- src/svelte/collection-retrieval.ts
- src/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte
- src/interaction/surface-frame.ts
- src/interaction/frame-presenters.ts
- src/interaction/fact-presentation.ts
- src/interaction/review-changes.ts
- src/web/client/frame.ts
- src/svelte/catalog/renderer/frame-body/FrameBody.svelte
- src/interaction/toolbar.ts
- src/interaction/intent.ts
- src/interaction/face.ts
- src/interaction/selection-option.ts
- src/interaction/transient-frame.ts
- src/interaction/control-nodes.ts
- src/interaction/control-specimens.ts
- src/interaction/extended-nodes.ts
- src/interaction/extended-controls.ts
- src/interaction/money.ts
- src/interaction/input-mask.ts
- src/interaction/decimal-mask-locale.ts
- src/interaction/information-content.ts
- src/svelte/catalog/compositions/toolbar/Toolbar.svelte
- src/svelte/catalog/foundations/face/Face.svelte
- src/svelte/catalog/foundations/field-well/FieldWell.svelte
- src/svelte/catalog/foundations/search-field/SearchField.svelte
- src/svelte/catalog/foundations/measured-field/MeasuredField.svelte
- src/svelte/catalog/foundations/field/field-measure.css
- src/svelte/catalog/foundations/grouped-panel/GroupedPanel.svelte
- src/svelte/catalog/foundations/choice-row/ChoiceRow.svelte
- src/svelte/catalog/foundations/selection-field/SelectionField.svelte
- src/svelte/catalog/compositions/collection-state/CollectionState.svelte
- src/svelte/catalog/foundations/action/Action.svelte
- src/svelte/infra/action-icons.ts
- src/svelte/vendor/components/ui/button/button.svelte
- src/svelte/catalog/mechanisms/press-feedback/press-feedback.ts
- src/svelte/catalog/compositions/select-control/SelectControl.svelte
- src/svelte/catalog/compositions/popover-control/PopoverControl.svelte
- src/svelte/catalog/compositions/file-control/FileControl.svelte
- src/svelte/catalog/renderer/control-renderer/ControlRenderer.svelte
- src/svelte/catalog/compositions/options-control/OptionsControl.svelte
- src/svelte/catalog/compositions/money-control/MoneyControl.svelte
- src/svelte/catalog/foundations/date-control/DateControl.svelte
- src/svelte/catalog/compositions/media-control/MediaControl.svelte
- src/svelte/catalog/foundations/popover/Popover.svelte
- src/svelte/catalog/foundations/popover/PopoverSurface.svelte
- src/svelte/catalog/foundations/files/Files.svelte
- src/svelte/catalog/compositions/fields/Fields.svelte
- src/svelte/catalog/foundations/field/Field.svelte
- src/svelte/catalog/foundations/field/FieldEditor.svelte
- src/svelte/catalog/foundations/text-input/TextInput.svelte
- src/svelte/catalog/foundations/masked-input/MaskedInput.svelte
- src/svelte/catalog/foundations/character-counter/CharacterCounter.svelte
- src/svelte/catalog/foundations/clear-input/ClearInput.svelte
- src/svelte/catalog/foundations/masked-input/input-edit-history.ts
- src/svelte/catalog/compositions/context-panel/ContextPanel.svelte
- src/svelte/catalog/renderer/facts/Facts.svelte
- src/svelte/catalog/compositions/review/Review.svelte
- src/svelte/catalog/foundations/destination-row/DestinationRow.svelte
- src/svelte/catalog/foundations/drawer/Drawer.svelte
- src/svelte/catalog/foundations/modal/Modal.svelte
- src/svelte/catalog/foundations/modal/ModalPane.svelte
- src/svelte/catalog/foundations/modal/drawer-motion.svelte.ts
- src/validation-result.ts
- src/web/client/field-feedback.ts
- src/web/client/model.ts
- src/web/client/mutations.ts
- src/web/client/transport.ts
- src/web/gateway.ts
- src/web/dispatch.ts
- src/local/session.ts
- src/local/admission.ts
- src/local/prepare.ts
- src/local/accept.ts
- src/local/database.ts

## products/notebook/src/exposures.ts

Source SHA-256: 23bb863a893e027f2bd5c0d32e3fa828eb239b13f9ee28d3b8c8cc8890706a29

```ts
import { agentExposure, humanExposure } from "desert-sdk/src/index.ts";
import { Journeys } from "./modules.ts";

const ExposedJourneys = [Journeys.createNote, Journeys.readNotes, Journeys.archiveNote] as const;
export const HumanNotebook = humanExposure({ id: "human", journeys: ExposedJourneys, locale: "en" });
export const AgentNotebook = agentExposure("agent", ExposedJourneys);
```

## products/notebook/src/messages/keys.ts

Source SHA-256: 357bf99cd64ac3155dba97e69e1f59df39e0e6ceb0897207309a9bbd99a16d6f

```ts
// Generated from en.json by `npm run messages:write`; do not edit.
import { messageCatalog } from "desert-sdk/src/index.ts";

export const Messages = messageCatalog({
  "en": {
    "notebook": {
      "label": "Notebook",
      "explore": "Explore"
    },
    "notes": {
      "destination": "Notes",
      "readNotes": "Read notes",
      "subtitle": "Your private notebook.",
      "all": "Notes",
      "createNote": "Create note",
      "archiveNote": "Archive note",
      "close": "Close",
      "titleField": "Title",
      "contentField": "Content",
      "statusField": "Status"
    }
  },
} as const);
/** The accessor declarations use: `m.notes.title` is the message `{ key: "notes.title" }`. */
export const m = Messages.m;
export const MessageKeySchema = Messages.keySchema;
export type MessageKey = typeof Messages.keys[number];
```

## products/notebook/src/modules.ts

Source SHA-256: 2e748cd34f69791c10737084573a261f16e126cad043cd1dade39f5026fb574a

```ts
import { moduleIndex } from "desert-sdk/src/index.ts";
import { NotesModule } from "./modules/notes/notes.module.ts";

export const Modules = moduleIndex([NotesModule]);
export const Journeys = Modules.journeys;
export const Views = Modules.views;
export const Commands = Modules.commands;
export const Destinations = Modules.destinations;
export const Dependencies = Modules.dependencies;
```

## products/notebook/src/modules/notes/commands/archiveNote.command.ts

Source SHA-256: 089e17553c2419e87038ef5ff9a30c97e02b8333c6e27dd9255d4884c8386e8e

```ts
import { literal, updateCommand } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [], when: { state: "active" }, set: { state: literal("archived") },
});
```

## products/notebook/src/modules/notes/commands/createNote.command.ts

Source SHA-256: 982cdaff8b1af83a122df5be58ed4d7cb7f92a3cc2b0f6c3068f379f2a2da5d9

```ts
import { actorId, createCommand, fromInput, literal } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: { title: fromInput("title"), body: fromInput("body"), owner: actorId(), state: literal("active") },
});
```

## products/notebook/src/modules/notes/journeys/archiveNote.journey.ts

Source SHA-256: ec5d8d3445f640e8da4be4c83d01e6f613f89163725a3e52134d3da829ae033b

```ts
import { mutationJourney, type ViewJourney } from "desert-sdk/src/index.ts";
import { ArchiveNoteRecord } from "../commands/archiveNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, { controller: NotesController, dependencies: [] });
export const ArchiveNoteJourney = { id: ArchiveNote.id, kind: "action", source: ReadNote, outputs: [] } satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/browseNotes.journey.ts

Source SHA-256: f10ad5e9c559eac71f02d2a09cd56b4f3183ed78edc0ba8d5b1394892b048d8f

```ts
import { viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { NoteView } from "../views/note.view.ts";
import { NotesView } from "../views/notes.view.ts";
import { CreateNote } from "./createNote.journey.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const ReadNotesJourney = {
  id: ReadNote.id, kind: "read", view: NotesView, detailView: NoteView,
  outputs: [
    { ...viewOutput(NotesView, "create"), action: { kind: "journey", journey: CreateNote } },
    { ...viewOutput(NotesView, "select"), action: { kind: "select" } },
    { ...viewOutput(NoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/createNote.journey.ts

Source SHA-256: 512963fbd95a086cdca7b9495f7355a834a209c91748230ba5edec75ce905bb6

```ts
import { mutationJourney, viewOutput, type ViewJourney } from "desert-sdk/src/index.ts";
import { CreateNoteRecord } from "../commands/createNote.command.ts";
import { NotesController } from "../notes.dependencies.ts";
import { CreateNoteView } from "../views/createNote.view.ts";
import { ReadNote } from "./readNotes.journey.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, { controller: NotesController, dependencies: [] });
export const CreateNoteJourney = {
  id: CreateNote.id, kind: "create", source: ReadNote, view: CreateNoteView, preferredDock: "right",
  outputs: [
    { ...viewOutput(CreateNoteView, "save"), action: { kind: "submit" } },
    { ...viewOutput(CreateNoteView, "close"), action: { kind: "close" } },
  ],
} satisfies ViewJourney;
```

## products/notebook/src/modules/notes/journeys/readNotes.journey.ts

Source SHA-256: 73f003644cc55f21cca8c8d25f54ff251ece86222c3489270dd3b958560eeacb

```ts
import { readJourney } from "desert-sdk/src/index.ts";
import { Note } from "../note.object.ts";
import { NotesController } from "../notes.dependencies.ts";

export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"], collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});
```

## products/notebook/src/modules/notes/note.object.ts

Source SHA-256: 6ebaa8ea294933c9047bdc908a6d7aba241d4d0c9be994e8af5cf5f65c03f659

```ts
import { enumeration, objectType, ownershipPolicy, principal, text } from "desert-sdk/src/index.ts";

export const Note = objectType({
  id: "note",
  facts: {
    title: text({ minLength: 1 }),
    body: text({ minLength: 1 }),
    owner: principal(),
    state: enumeration(["active", "archived"]),
  },
});

export const OnlyOwnerCanAccess = ownershipPolicy(Note, "owner");
```

## products/notebook/src/modules/notes/note.publication.ts

Source SHA-256: f9279e6bd7f2326303361ef1964c7d1b5843d5a38d85aa0735226dd5f5661572

```ts
import { factReference, publishObject } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";
import { NoteView } from "./views/note.view.ts";
import { m } from "../../messages/keys.ts";
import { ArchiveNote } from "./journeys/archiveNote.journey.ts";

export const PublishedNote = publishObject(Note, {
  view: NoteView, title: factReference(Note, "title"),
  fields: [
    { fact: factReference(Note, "title"), label: m.notes.titleField, representation: "text" },
    { fact: factReference(Note, "body"), label: m.notes.contentField, representation: "paragraphs" },
    { fact: factReference(Note, "state"), label: m.notes.statusField, representation: "text" },
  ],
  actions: [{ journey: ArchiveNote, icon: "archive" }],
});
```

## products/notebook/src/modules/notes/notes.dependencies.ts

Source SHA-256: daa1acd09dea50cda2d9d38c0047056f0a3944f7a85be5f2877b9c9e47de1a50

```ts
import { controllerRole } from "desert-sdk/src/index.ts";
import { Note } from "./note.object.ts";

export const NotesController = controllerRole({ id: "notes", objects: [Note], requires: [] });
```

## products/notebook/src/modules/notes/notes.module.ts

Source SHA-256: 8fd313cfa94ccab60d94afa11779a7a379af36e7feb60807811ed4b123bdc4b7

```ts
import { defineModule } from "desert-sdk/src/index.ts";
import { OnlyOwnerCanAccess } from "./note.object.ts";
import { PublishedNote } from "./note.publication.ts";
import { NotesController } from "./notes.dependencies.ts";
import { CreateNote, CreateNoteJourney } from "./journeys/createNote.journey.ts";
import { ReadNote } from "./journeys/readNotes.journey.ts";
import { ReadNotesJourney } from "./journeys/browseNotes.journey.ts";
import { ArchiveNote, ArchiveNoteJourney } from "./journeys/archiveNote.journey.ts";
import { NotesView } from "./views/notes.view.ts";
import { NoteView } from "./views/note.view.ts";
import { CreateNoteView } from "./views/createNote.view.ts";
import { m } from "../../messages/keys.ts";

const NotesDestination = { id: "notes", label: m.notes.destination, icon: "open", entryJourney: ReadNote } as const;

export const NotesModule = defineModule({
  id: "notes", objects: [PublishedNote], dependencies: [NotesController], policies: [OnlyOwnerCanAccess],
  journeys: [
    { execution: CreateNote, presentation: CreateNoteJourney, label: m.notes.createNote, humanReview: "not-required" },
    { execution: ReadNote, presentation: ReadNotesJourney, label: m.notes.readNotes },
    { execution: ArchiveNote, presentation: ArchiveNoteJourney, label: m.notes.archiveNote, humanReview: "required" },
  ],
  views: [NotesView, NoteView, CreateNoteView], destinations: [NotesDestination],
  exports: {
    dependencies: { notes: NotesController },
    journeys: { createNote: CreateNote, readNotes: ReadNote, archiveNote: ArchiveNote },
    views: { Notes: NotesView, Note: NoteView, CreateNote: CreateNoteView }, destinations: { Notes: NotesDestination },
  },
});
```

## products/notebook/src/modules/notes/views/createNote.view.ts

Source SHA-256: 20b6c3c8c47237f52c6b3ae509fffeb03b138a931ff808d0ffddadf885b05fb2

```ts
import { Components, ViewTitles, defineView, viewPorts } from "desert-sdk/src/index.ts";
import { m } from "../../../messages/keys.ts";

const Ports = viewPorts({ inputs: { draft: "form" }, outputs: ["save", "close"] });

export const CreateNoteView = defineView({
  name: "create-note", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.close, label: m.notes.close, icon: "close" }] }),
  bottomDock: Components.Toolbar({ actions: [{ output: Ports.output.save, label: m.notes.createNote, icon: "save" }] }),
  content: [Components.Header({ title: ViewTitles.operation }), Components.Form({ input: Ports.inputs.draft })],
});
```

## products/notebook/src/modules/notes/views/note.view.ts

Source SHA-256: af6c1560062dcbf4d508d3fdd60994c554d363b3d6b4907559031252e1465c5a

```ts
import { Components, ViewTitles, defineView, viewPorts } from "desert-sdk/src/index.ts";
import { m } from "../../../messages/keys.ts";

const Ports = viewPorts({ inputs: { note: "context" }, outputs: ["close"] });

export const NoteView = defineView({
  name: "note", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.close, label: m.notes.close, icon: "close" }] }),
  content: [Components.Header({ title: ViewTitles.subject }), Components.Context({ input: Ports.inputs.note })],
});
```

## products/notebook/src/modules/notes/views/notes.view.ts

Source SHA-256: f2b06d04f6f0058a9c0d6f70a681265595fa197c481bb5c7d5d918d561754a1e

```ts
import { Components, defineView, viewPorts } from "desert-sdk/src/index.ts";
import { m } from "../../../messages/keys.ts";

const Ports = viewPorts({ inputs: { notes: "collection" }, outputs: ["create", "select"] });

export const NotesView = defineView({
  name: "notes", outputs: Ports.outputs,
  topDock: Components.Toolbar({ actions: [{ output: Ports.output.create, label: m.notes.createNote, icon: "create" }] }),
  content: [
    Components.Header({ title: m.notes.readNotes, subtitle: m.notes.subtitle }),
    Components.Stack({ title: m.notes.all, items: [Components.Collection({ input: Ports.inputs.notes, output: Ports.output.select })] }),
  ],
});
```

## products/notebook/src/notebook.product.ts

Source SHA-256: eac3b9844b840c82058d15b37e72b8450cfe8d34b04927f6df24f206dcf574af

```ts
import { composeProduct } from "desert-sdk/src/index.ts";
import { Modules, Destinations } from "./modules.ts";
import { WorkspaceView } from "./views/workspace.view.ts";
import { NavigationView } from "./views/navigation.view.ts";
import { HumanNotebook, AgentNotebook } from "./exposures.ts";
import { Messages, m } from "./messages/keys.ts";

export const NotebookProduct = composeProduct({
  id: "notebook", label: m.notebook.label, messages: Messages, modules: Modules,
  views: [WorkspaceView, NavigationView], workspace: WorkspaceView,
  exposures: [HumanNotebook, AgentNotebook], entry: Destinations.Notes,
  navigation: [{ destination: Destinations.Notes, group: m.notebook.explore, purpose: "content" }],
});

export const Notebook = NotebookProduct.definition;
export const NotebookViewProgram = NotebookProduct.viewProgram;
```

## products/notebook/src/views/navigation.view.ts

Source SHA-256: a3934fda54f738b1c6b195dac297165afdbaba3f305334b2327c26d0ceb0c1ed

```ts
import { Components, ViewTitles, defineView } from "desert-sdk/src/index.ts";

export const NavigationView = defineView({ name: "navigation", content: [Components.Header({ title: ViewTitles.product }), Components.Navigation()] });
```

## products/notebook/src/views/workspace.view.ts

Source SHA-256: 9564a63f411eaa7c790840d7bf8151fe4a4a919ef935466894f5efd2d5c3f051

```ts
import { Components, defineView } from "desert-sdk/src/index.ts";
import { NavigationView } from "./navigation.view.ts";

export const WorkspaceView = defineView({ name: "workspace", leftDock: Components.Dock(NavigationView), content: [Components.Destination()] });
```

## products/notebook/distributions.ts

Source SHA-256: a62d110085decad81a9d5c9190b251472bffd72c94f995e100ac99833ed6b463

```ts
import { clientDistribution, controllerDistribution, localBinding, remoteBinding } from "../../src/index.ts";
import { Dependencies } from "./src/modules.ts";
import { Notebook } from "./product.ts";
import { AgentNotebook, HumanNotebook } from "./exposures.ts";

export const NotebookService = controllerDistribution({
  id: "notebook-service", product: Notebook, runtime: "node", storage: "postgresql",
  serves: [HumanNotebook, AgentNotebook], provides: [Dependencies.notes],
});

export const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookIOS = clientDistribution({
  id: "notebook-ios", product: Notebook, surface: HumanNotebook,
  renderer: "swiftui-ios", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookCLI = clientDistribution({
  id: "notebook-cli", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [remoteBinding(Dependencies.notes, NotebookService)],
});

export const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [localBinding(Dependencies.notes, "notes-local")],
});
```

## src/interaction/catalog.ts

Source SHA-256: 1ac4198d9de5c0efb6191a29ce36d540669b31e1a58c2616a4a6c9cdfb77549a

```ts
import { Type } from "@sinclair/typebox";
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ControlSpecimens } from "./control-specimens.ts";
import { CatalogGroups, CatalogFoundations, catalogInspection, type DiscoveryGroup, type FoundationId } from "./catalog-ownership.ts";

function entry<const Id extends string, const Family extends string, const States extends readonly string[]>(
  id: Id, family: Family, states: States, group: DiscoveryGroup, owners: readonly FoundationId[]) {
  return { id, family, states, inspection: catalogInspection(id, states, group, owners,
    ['tests/bank-node.test.ts', 'tests/public-catalog-bank.test.ts']) };
}

export const ResolvedNodes = freezeDeep({
  id: "desert.human-interaction", version: "0.5.0",
  groups: CatalogGroups, foundations: CatalogFoundations,
  entries: [
    entry("input.text", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("input.multiline", "primitive", ["empty", "value", "invalid", "disabled", "loading", "offline"], "foundations", ["pane", "well"]),
    entry("fact", "primitive", ["known", "empty", "unknown"], "foundations", ["stack", "status"]),
    entry("action", "primitive", ["ready", "unavailable", "pending", "loading", "offline"], "foundations", ["pane", "action"]),
    entry("availability", "primitive", ["unknown", "ready", "unavailable"], "foundations", ["status"]),
    entry("collection", "composition", ["empty", "records", "state-summary", "media-grid", "media-list", "collection-grid", "loading", "offline"], "compositions", ["stack", "pane", "action"]),
    entry("form", "composition", ["incomplete", "ready", "disconnected"], "compositions", ["stack", "well", "action"]),
    entry("context", "composition", ["available", "unavailable", "media-object"], "compositions", ["stack", "action"]),
    entry("review", "composition", ["prepared", "uncertain"], "compositions", ["stack", "status", "action"]),
    entry("transient", "composition", ["open", "locked"], "compositions", ["pane", "stack", "action"]),
    entry("problem", "composition", ["error", "warning"], "compositions", ["pane", "status", "action"]),
    entry("catalog.card", "composition", ["featured", "item"], "compositions", ["stack", "action"]),
    entry("catalog.home", "composition", ["populated"], "compositions", ["stack"]),
    entry("catalog.detail", "composition", ["reading"], "compositions", ["stack"]),
    ...ControlSpecimens.map(({ id, family, specimens, inspection }) => ({ id, family, states: specimens.map(specimen => specimen.state), inspection })),
  ] as const,
});

export type ResolvedNodeId = typeof ResolvedNodes.entries[number]["id"];
/** The id of a resolved node kind, as a TypeBox schema derived from the entries above (not a second list). */
export const ResolvedNodeIdSchema = Type.Union(ResolvedNodes.entries.map(entry => Type.Literal(entry.id)));
export type ResolvedInputId = Extract<ResolvedNodeId, `input.${string}`>;
export type RendererTable<T> = { readonly [K in ResolvedNodeId]: T };

export function requireCatalog(candidate: unknown) {
  if (JSON.stringify(jsonSnapshot(candidate)) !== JSON.stringify(jsonSnapshot(ResolvedNodes))) {
    throw new Error("INTERACTION_CATALOG_MISMATCH");
  }
}
```

## src/field-representation.ts

Source SHA-256: 25379afa2a202dfd506491d33251b4f3c132d1a02678908f60986a70bfb1d692

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { FieldDefinitionSchema, type FieldDefinition } from "./field-definition.ts";

export const FieldRepresentationSchema = Type.Union([Type.Literal("text"), Type.Literal("paragraphs"), Type.Literal("image"), Type.Literal("tags")]);
export type FieldRepresentation = Static<typeof FieldRepresentationSchema>;
export const FieldRepresentationsSchema = Type.Record(Type.String({ minLength: 1 }), FieldRepresentationSchema,
  { additionalProperties: false });
const FieldKindSchema = Type.Index(FieldDefinitionSchema, ["kind"]);
export const FieldKindsSchema = Type.Record(Type.String({ minLength: 1 }), FieldKindSchema, { additionalProperties: false });
export type FieldKind = Static<typeof FieldKindSchema>;

export function supportsFieldRepresentation(fact: Pick<FieldDefinition, "kind">, representation: FieldRepresentation): boolean {
  if (fact.kind === "asset") return representation === "image";
  if (fact.kind === "labels") return representation === "tags";
  return representation !== "image" && representation !== "tags" && fact.kind !== "principal" && (representation !== "paragraphs" || fact.kind === "text");
}

export function requireFieldRepresentations(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldRepresentation> {
  if (!Check(FieldRepresentationsSchema, value)) throw new Error("INVALID_FIELD_REPRESENTATIONS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field representation: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field representation: ${name}`);
  }
}

export function requireFieldKinds(value: unknown, fields: Iterable<string>): asserts value is Record<string, FieldKind> {
  if (!Check(FieldKindsSchema, value)) throw new Error("INVALID_FIELD_KINDS");
  const expected = new Set(fields);
  for (const name of Object.keys(value)) {
    if (!expected.has(name)) throw new Error(`Unknown field kind: ${name}`);
  }
  for (const name of expected) {
    if (!Object.hasOwn(value, name)) throw new Error(`Missing field kind: ${name}`);
  }
}

export function requireFieldPresentation(representations: unknown, kinds: unknown, fields: Iterable<string>) {
  const names = [...fields];
  requireFieldRepresentations(representations, names);
  requireFieldKinds(kinds, names);
  for (const [name, representation] of Object.entries(representations)) {
    if (!supportsFieldRepresentation({ kind: kinds[name]! }, representation)) {
      throw new Error(`Field representation type mismatch: ${name}`);
    }
  }
  return { fieldRepresentations: representations, fieldKinds: kinds };
}

export function requireFieldRepresentation(representations: Readonly<Record<string, FieldRepresentation>>, field: string): FieldRepresentation {
  const representation = Object.hasOwn(representations, field) ? representations[field] : undefined;
  if (!Check(FieldRepresentationSchema, representation)) throw new Error(`INVALID_FIELD_REPRESENTATION: ${field}`);
  return representation;
}
```

## src/interaction/form.ts

Source SHA-256: 6608babb0c19e4b9f4d2e8d2304edd2de8c7a4a23747d2855a427efbf898cebe

```ts
import type { Mutation } from "../web/types.ts";
import type { ResolvedInputId } from "./catalog.ts";
import { requireFieldRepresentation, type FieldRepresentation } from "../field-representation.ts";
import { assetInputMedia } from "./image-input.ts";

const inputPrimitives = { text: "input.text", paragraphs: "input.multiline" } as const satisfies Record<Exclude<FieldRepresentation, "image" | "tags">, ResolvedInputId>;

export function deriveForm(journey: Mutation, representations: Readonly<Record<string, FieldRepresentation>>) {
  return journey.inputFields.map(name => {
    const schema = journey.inputSchema.properties[name]!;
    const representation = requireFieldRepresentation(representations, `${journey.object}.${name}`);
    if (representation === "image") {
      if (schema.type !== "object") throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
      return { name, primitive: "control.files" as const, required: journey.inputSchema.required.includes(name), schema,media:assetInputMedia(schema) };
    }
    if (representation === "tags") {
      if (schema.type !== "array" || typeof schema.maxItems !== "number" || typeof schema.items !== "object"
        || !schema.items || Array.isArray(schema.items) || !("maxLength" in schema.items) || typeof schema.items.maxLength !== "number") throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
      return { name, primitive: "control.labels" as const, required: false,
        limits: { maxItems: schema.maxItems, maxLength: schema.items.maxLength }, schema };
    }
    if (schema.type === "string" && Array.isArray(schema.enum) && schema.enum.every(value => typeof value === "string" && value.length > 0)) {
      return { name, primitive: "control.select" as const, required: false, schema,
        options: schema.enum.map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), disabled: false })) };
    }
    if (schema.type !== "string" || schema.enum) throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
    return { name, primitive: inputPrimitives[representation],
      // JSON Schema required means presence; the control's required means nonempty.
      required: journey.inputSchema.required.includes(name) && typeof schema.minLength === "number" && schema.minLength > 0, schema };
  });
}
```

## src/interaction/resolved-node-schema.ts

Source SHA-256: 46510bba0fe7b9a85dc0094ca629498c842cd4373342fc64b1e6c941a34ccd61

```ts
import { Type, type TProperties, type TSchema } from "@sinclair/typebox";
import { ControlNodeSchema } from "./control-nodes.ts";
import { FactsSchema, FormSchema, TextFormFieldSchema, ContextSchema, ReviewSchema, SurfaceFrameSchema } from "./surface-frame.ts";
import { ToolbarActionSchema, TopToolbarSchema, actionSchema } from "./toolbar.ts";
import { CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema } from "../public-catalog/node-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";
import { InputMaskSchema } from "./input-mask.ts";
import { LabelsNodeSchema } from "./labels-control.ts";
import { AssetReferenceSchema } from "../assets/types.ts";
import {AttentionSignalSchema} from '../attention.ts';

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const version = Type.Literal("desert.bank-node/1");
const node = <K extends string, P extends TProperties>(kind: K, properties: P) => object({ version, kind: Type.Literal(kind), ...properties });
const control = <K extends string, S extends TSchema>(kind: K, schema: S) => node(kind, { control: schema });
const input = { name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
  disabled: Type.Boolean(), error: Type.Optional(text()), helper: Type.Optional(text()), maxLength: TextFormFieldSchema.properties.maxLength };

/** Local renderer operations cannot be confused with product journey identities. */
export const LocalIntentSchema = Type.Union([
  object({ kind: Type.Literal("catalog"), open: Type.Boolean() }),
  object({ kind: Type.Literal("search.clear") }),
  object({ kind: Type.Literal("transient.open") }),
  object({ kind: Type.Literal("selection.clear") }),
  object({ kind: Type.Literal("specimen"), operation: Type.Union([
    Type.Literal("open"), Type.Literal("press"), Type.Literal("finish"),
  ]) }),
]);
const action = Type.Union([ToolbarActionSchema, actionSchema(LocalIntentSchema),
  actionSchema(Type.Union([CatalogEventSchema.anyOf[0], CatalogEventSchema.anyOf[1]]))]);
const record = object({ id: text(), version: Type.Integer({ minimum: 1 }), facts: FactsSchema.properties.facts });
export const CollectionNodeSchema = node("collection", {
  presentation: Type.Optional(Type.Union([
    object({ kind: Type.Literal("media-grid"), image: text(), fit: Type.Optional(text()), description: Type.Optional(text()),
      layout: Type.Optional(Type.Union([Type.Literal("grid"), Type.Literal("list")])) }),
    object({ kind: Type.Literal("collection-grid"), title: text(), previews: Type.Array(object({ id: text(),
      count: Type.Integer({ minimum: 0 }), media: Type.Optional(AssetReferenceSchema) }), { maxItems: 200 }) }),
    object({ kind: Type.Literal("summary-widget"), title: text(), description: text(), totalLabel: text(), field: text(),
      segments: Type.Array(object({ value:text(), label:text() }), {minItems:2,maxItems:6}), truncated: Type.Optional(Type.Boolean()) }),
  ])),
  object: text(), fields: Type.Array(text(), { minItems: 1, uniqueItems: true }), labels: FactsSchema.properties.labels,
  valueLabels: Type.Optional(Type.Record(Type.String(), Type.Record(Type.String(), text()))),
  attention:Type.Optional(Type.Record(Type.String(),Type.Array(AttentionSignalSchema))),
  createLabel: Type.Optional(text()), records: Type.Array(record), disabled: Type.Boolean(), loaded: Type.Boolean(),
  connection: Type.Optional(Type.Union([Type.Literal('loading'), Type.Literal('ready'), Type.Literal('offline')])),
  selectedId: Type.Union([Type.Null(), text()]),
});

/** The complete bank's serializable grammar. Web callbacks and host handles are not values here. */
export const ResolvedNodeSchema = Type.Union([
  node("input.text", { ...input, mask: Type.Optional(InputMaskSchema) }), node("input.multiline", input),
  node("fact", { details: FactsSchema }),
  node("action", { action, role: Type.Union([Type.Literal("primary"), Type.Literal("secondary")]), form: Type.Optional(Type.Boolean()) }),
  node("availability", TopToolbarSchema.properties.availability.properties),
  CollectionNodeSchema,
  node("form", { content: FormSchema }), node("context", { content: ContextSchema }), node("review", { content: ReviewSchema }),
  node("transient", { label: text(), open: Type.Boolean(), locked: Type.Boolean(), frame: SurfaceFrameSchema }),
  node("problem", { open: Type.Boolean(), title: text(), description: text(), locked: Type.Boolean(),
    severity: Type.Union([Type.Literal("error"), Type.Literal("warning")]) }),
  control("control.select", ControlNodeSchema.anyOf[0]), control("control.popover", ControlNodeSchema.anyOf[1]),
  control("control.files", ControlNodeSchema.anyOf[2]), control("control.options", ControlNodeSchema.anyOf[3]),
  control("control.money", ControlNodeSchema.anyOf[4]), control("control.date", ControlNodeSchema.anyOf[5]),
  control("control.tag", ControlNodeSchema.anyOf[6]), control("control.image", ControlNodeSchema.anyOf[7]),
  control("control.avatar", ControlNodeSchema.anyOf[8]),
  control("control.labels", LabelsNodeSchema),
  CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema,
]);
```

## src/interaction/resolved-node.ts

Source SHA-256: 0b2ed5eca86ae4daf3724fb4d5db08cbebe6bbf0fd4656297ac9dc82c4482715

```ts
import { type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ResolvedNodeSchema } from "./resolved-node-schema.ts";
import { controlNode, type ControlNode } from "./control-nodes.ts";
import { surfaceFrame, checkFrameContent } from "./surface-frame.ts";
import { transientFrame } from "./transient-frame.ts";
import type { ResolvedNodeId } from "./catalog.ts";
import { checkCatalogHome } from "../public-catalog/node-schema.ts";
import { inputMask } from "./input-mask.ts";
import { collectionSummary } from './collection-summary.ts';

export type ResolvedNode = Frozen<Static<typeof ResolvedNodeSchema>>;
export type ResolvedNodeFor<K extends ResolvedNodeId> = Extract<ResolvedNode, { kind: K }>;
export const ResolvedNodeVersion = "desert.bank-node/1" as const;

/** Validate JSON shape and the same semantic owners used by product frames and controls. */
export function resolvedNode(value: unknown): ResolvedNode {
  const node: unknown = jsonSnapshot(value);
  if (!Check(ResolvedNodeSchema, node)) throw new Error("INVALID_BANK_NODE");
  if (node.kind === "input.text" && node.mask) inputMask(node.mask);
  if ("control" in node) controlNode(node.control);
  if (node.kind === "catalog.home") checkCatalogHome(node);
  if ("content" in node) checkFrameContent(node.content);
  if (node.kind === "fact") checkFrameContent(node.details);
  if (node.kind === "transient") transientFrame(surfaceFrame(node.frame), node.locked);
  if (node.kind === "action" && ((node.role === "primary" && ["back", "close", "catalog.back"].includes(node.action.intent.kind)) ||
    (node.form && node.action.intent.kind !== "journey"))) throw new Error("INVALID_BANK_ACTION");
  if(node.kind==='collection'&&node.presentation?.kind==='summary-widget'){
    if(!node.fields.includes(node.presentation.field))throw new Error('INVALID_WIDGET_FIELD');
    collectionSummary(node.records,node.presentation);
  }
  if (node.kind === "collection" && (new Set(node.records.map(record => record.id)).size !== node.records.length ||
    (node.presentation?.kind === "media-grid" && [node.presentation.image, node.presentation.fit, node.presentation.description]
      .some(field => field !== undefined && !node.fields.includes(field))) ||
    (node.presentation?.kind === "collection-grid" && (!node.fields.includes(node.presentation.title) ||
      new Set(node.presentation.previews.map(preview => preview.id)).size !== node.presentation.previews.length ||
      node.presentation.previews.some(preview => !node.records.some(record => record.id === preview.id)))) ||
    node.records.some(record => Object.keys(record.facts).some(field => !node.fields.includes(field))) ||
    Object.keys(node.valueLabels ?? {}).some(field => !node.fields.includes(field)) ||
    Object.entries(node.attention ?? {}).some(([id,signals])=>!node.records.some(record=>record.id===id)||signals.some(signal=>
      signal.target.kind!=='object'||signal.target.object!==node.object||signal.target.id!==id)) ||
    node.fields.some(field => !Object.hasOwn(node.labels, `${node.object}.${field}`)))) throw new Error("INVALID_BANK_COLLECTION");
  return freezeDeep(node);
}

/** Wrap the installed control grammar without widening it into product authoring. */
export function controlResolvedNode(control: ControlNode): Extract<ResolvedNode, { control: ControlNode }> {
  const node = resolvedNode({ version: ResolvedNodeVersion, kind: `control.${control.kind}`, control });
  if (!("control" in node)) throw new Error("BANK_CONTROL_REQUIRED");
  return node;
}
```

## src/interaction/node-events.ts

Source SHA-256: 08d4b38dac31cfda5872263de25efabea149b2d685acc19ac54bb8cb8165cd7e

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ControlEventSchema } from "./control-nodes.ts";
import { SurfaceIntentSchema } from "./intent.ts";
import { LocalIntentSchema } from "./resolved-node-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";
import { RelatedSelectionEventSchema } from "./related-selection.ts";

const closed = { additionalProperties: false };
const text = () => Type.String({ minLength: 1 });
export const NodeEventSchema = Type.Union([
  ...ControlEventSchema.anyOf,
  ...CatalogEventSchema.anyOf,
  ...RelatedSelectionEventSchema.anyOf,
  Type.Object({ kind: Type.Literal("input.change"), name: text(), value: Type.String() }, closed),
  Type.Object({ kind: Type.Literal("surface.invoke"), intent: SurfaceIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("local.invoke"), intent: LocalIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("collection.select"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("attention.resume"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("transient.close") }, closed),
  Type.Object({ kind: Type.Literal("transient.closed") }, closed),
  Type.Object({ kind: Type.Literal("problem.close") }, closed),
]);
export type NodeEvent = Frozen<Static<typeof NodeEventSchema>>;
export function nodeEvent(value: unknown): NodeEvent {
  const event = jsonSnapshot(value);
  if (!Check(NodeEventSchema, event)) throw new Error("INVALID_BANK_EVENT");
  return freezeDeep(event);
}
```

## src/svelte/catalog/renderer/node-renderer/NodeRenderer.svelte

Source SHA-256: bf9d54d064dc3614c7951fae0d8fa57a50a6b17195084dd8d9e9b3240f88db70

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { resolvedNode } from "../../../../interaction/resolved-node.ts";
  import { nodeEvent, type NodeEvent } from "../../../../interaction/node-events.ts";
  import type { ControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import { nodeRenderers } from "../../../renderer-registry.ts";
  import type { FormControlEvent } from "../../../../interaction/form-control-event.ts";

  let { node, onevent = () => {}, continuity }: CatalogProps<"node-renderer"> = $props();
  let checked = $derived(resolvedNode(node));
  const emit = (event: NodeEvent) => onevent(nodeEvent(event));
  const control = (event: ControlEvent) => emit(event);
  let frameEvents = $derived.by(() => {
    const sink = onevent;
    const send = (event: NodeEvent) => sink(nodeEvent(event));
    return {
      close: () => send({ kind: "transient.close" }),
      closed: () => send({ kind: "transient.closed" }),
      invoke: (intent: SurfaceIntent) => send({ kind: "surface.invoke", intent }),
      edit: (name: string, value: string) => send({ kind: "input.change", name, value }),
      controls: (event: FormControlEvent) => send(event),
    };
  });
  function activate() {
    if (checked.kind !== "action" || checked.form || checked.action.state !== "ready") return;
    const intent = checked.action.intent;
    if (intent.kind === "catalog.open" || intent.kind === "catalog.back") emit(intent);
    else if (intent.kind === "catalog" || intent.kind === "search.clear" || intent.kind === "specimen" ||
      intent.kind === "transient.open" || intent.kind === "selection.clear") emit({ kind: "local.invoke", intent });
    else emit({ kind: "surface.invoke", intent });
  }
</script>

{#if checked.kind === "input.text"}
  {@const Renderer = nodeRenderers[checked.kind]}
  <Renderer primitive={checked.kind} identity={checked.name} label={checked.label} labelVisibility="visible" measure="writing" purpose="text"
    value={checked.value} required={checked.required} invalid={false} disabled={checked.disabled} error={checked.error} helper={checked.helper}
    mask={checked.mask} maxLength={checked.maxLength} clear
    onchange={value => checked.kind === "input.text" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "input.multiline"}
  {@const Renderer = nodeRenderers[checked.kind]}
  <Renderer primitive={checked.kind} label={checked.label} labelVisibility="visible" measure="writing" value={checked.value}
    required={checked.required} invalid={false} disabled={checked.disabled} error={checked.error} helper={checked.helper} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.multiline" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "action"}
  {@const Renderer = nodeRenderers.action}
  <Renderer label={checked.action.label} icon={checked.action.icon} state={checked.action.state} emphasis={checked.role} face="fit"
    reason={checked.action.reason} type={checked.form ? "submit" : "button"} onclick={activate} />
{:else if checked.kind === "availability"}
  {@const Renderer = nodeRenderers.availability}<Renderer state={checked.state} label={checked.label} />
{:else if checked.kind === "fact"}
  {@const Renderer = nodeRenderers.fact}<Renderer {...checked.details} />
{:else if checked.kind === "form"}
  {@const Renderer = nodeRenderers.form}<Renderer fields={checked.content.fields} edit={(name, value) => emit({ kind: "input.change", name, value })} controlEvent={emit} />
{:else if checked.kind === "context"}
  {@const Renderer = nodeRenderers.context}<Renderer {...checked.content.details} attention={checked.content.attention} selectors={checked.content.selectors} presentation={checked.content.presentation}
    onselect={journey => emit({ kind: "surface.invoke", intent: { kind: "journey", journey } })} actions={checked.content.actions.map(action => ({
    id: action.destination, label: action.label, available: action.available,
    invoke: () => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: action.destination } }),
  }))} />
{:else if checked.kind === "review"}
  {@const Renderer = nodeRenderers.review}<Renderer {...checked.content} />
{:else if checked.kind === "collection"}
  {@const Renderer = nodeRenderers.collection}<Renderer node={checked} select={id => emit({ kind: "collection.select", id })} />
{:else if checked.kind === "transient"}
  {@const Renderer = nodeRenderers.transient}<Renderer label={checked.label} open={checked.open} locked={checked.locked} frame={checked.frame}
    continuity={continuity} onclose={frameEvents.close} onclosed={frameEvents.closed} invoke={frameEvents.invoke} edit={frameEvents.edit} controlEvent={frameEvents.controls} />
{:else if checked.kind === "problem"}
  <!-- The problem node is drawn by Problem, the adapter of its props onto Dialog. -->
  {@const Renderer = nodeRenderers.problem}<Renderer open={checked.open} title={checked.title} description={checked.description}
    locked={checked.locked} severity={checked.severity} close={() => emit({ kind: "problem.close" })} />
{:else if checked.kind === "control.select"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.popover"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.files"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.labels"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.options"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.money"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.date"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.tag"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.image"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.avatar"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "catalog.card"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.home"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.detail"}
  {@const Renderer = nodeRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{/if}
```

## src/check-surface.ts

Source SHA-256: 9e31bb159955c11f6bf8d439d15bc2e72887336f5c4f2736d9535d5b65fa809d

```ts
import type { ObjectDefinition } from "./contracts.ts";
import type { JourneyDefinition, ExposureDefinition } from "./program-grammar.ts";
import { requireReference } from "./references.ts";
import { surfaceFieldKinds, surfaceFields } from "./surface-fields.ts";
import { requireFieldPresentation } from "./field-representation.ts";

export function checkSurface(surface: ExposureDefinition, journeys: Map<string, JourneyDefinition>, objects: Map<string, ObjectDefinition>) {
  const exposed = new Map(surface.journeys.map(id => [id, requireReference(journeys, id, "journey")]));
  if (surface.kind === "agent") return;
  const { presented } = surfaceFields([...exposed.values()]);
  requireFieldPresentation(surface.fieldRepresentations, surfaceFieldKinds(presented, objects), presented.keys());
  for (const journey of exposed.values()) {
    if (journey.kind === "mutation" && !Object.hasOwn(surface.commit, journey.id)) {
      throw new Error(`Missing commit mode: ${journey.id}`);
    }
  }
  for (const id of Object.keys(surface.commit)) {
    if (requireReference(exposed, id, "commit journey").kind !== "mutation") throw new Error("Only mutations have commit modes");
  }
  for (const journey of exposed.values()) {
    if (!Object.hasOwn(surface.language.journeys, journey.id)) throw new Error(`Missing journey label: ${journey.id}`);
  }
  for (const name of presented.keys()) {
    if (!Object.hasOwn(surface.language.fields, name)) throw new Error(`Missing field label: ${name}`);
  }
  for (const id of Object.keys(surface.language.journeys)) requireReference(exposed, id, "labeled journey");
  for (const name of Object.keys(surface.language.fields)) {
    if (!presented.has(name)) throw new Error(`Unknown field label: ${name}`);
  }
}
```

## src/project-surface.ts

Source SHA-256: 0165b8e035b370013af5e3dcc8f272e1bc3cd6f499ed19f46a91e82214248bcb

```ts
import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { ExposureDefinition } from "./program-grammar.ts";
import { emitObject } from "./schema.ts";
import { freezeDeep } from "./json.ts";
import { ResolvedNodes } from "./interaction/catalog.ts";
import { InteractionProtocolVersion } from "./interaction/protocol.ts";
import { preparationFields } from "./preparation-projection.ts";
import { surfaceFieldKinds, surfaceFields } from "./surface-fields.ts";
import { referenceCapabilities } from './reference-capabilities.ts';
import { mediaReferenceCapabilities } from './media-reference-capabilities.ts';

export function projectSurface(product: ProductDefinition, program: ReturnType<typeof compileProgram>, surface: ExposureDefinition, digest: string) {
  const exposed = surface.journeys.map(id => program.journeys.get(id)!);
  const journeys = surface.journeys.map(id => {
    const journey = program.journeys.get(id)!;
    const dependencies = program.journeyDependencies.get(id)!;
    if (journey.kind === "mutation") {
      const responseFields = preparationFields(product, program, surface, journey);
      return {
        id, kind: "mutation" as const, commandId: journey.command.id, dependencies,
        object: journey.command.object, inputFields: journey.command.input,
        inputSchema: program.commands.get(journey.command.id)!.inputSchema,
        responseFields,
        ...(surface.kind === "human" ? { reviewFields: responseFields } : {}),
        ...(journey.command.kind === "update" ? { subject: journey.command.object } : {}),
        confirmation: journey.confirmation, outcome: journey.outcome,
      };
    }
    const object = product.objects.find(object => object.id === journey.object)!;
    const projection = (fields: string[]) => emitObject({
      id: object.id, facts: Object.fromEntries(fields.map(name => [name, object.facts[name]!])),
    });
    return { id, kind: "read" as const, subject: object.id, dependencies,
      fields: journey.fields, collection: journey.collection,
      detailSchema: projection(journey.fields), collectionSchema: projection(journey.collection) };
  });
  return freezeDeep({
    protocol: InteractionProtocolVersion, id: surface.id, kind: surface.kind,
    productId: product.id, contractDigest: digest, execution: "not-installed" as const, journeys,
    ...(surface.kind === "human" ? {
      catalog: ResolvedNodes, fieldRepresentations: surface.fieldRepresentations,
      fieldReferences: referenceCapabilities(product, exposed),
      fieldMediaReferences:mediaReferenceCapabilities(product,exposed),
      fieldKinds: surfaceFieldKinds(surfaceFields(exposed).presented, new Map(product.objects.map(object => [object.id, object]))),
      language: surface.language, connection: surface.connection, commit: surface.commit,
    } : {}),
  });
}
```

## src/web/build.ts

Source SHA-256: 6bbfaf639341e4757f26e4257e5925927c26718e407fdebbb7385c6bc7999742

```ts
import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";
import { compileViewProgram } from "../views/program.ts";
import { productViewProgram } from "../modules/compiled-product.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { viewProgramActivities } from "../activities/presentation.ts";
import { rendererLocale } from "../messages/renderer-locale.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string) {
  if (arguments.length > 2) throw new Error("VIEW_PROGRAM_OVERRIDE_FORBIDDEN");
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== rendererLocale) throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const viewProgram = compileViewProgram(productViewProgram(application), surface);
  viewProgramActivities(application, viewProgram, surfaceId);
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, fieldPresentation.fieldRepresentations);
    const name = `desertInputValidator${commands.size}`;
    engine.addSchema(journey.inputSchema, journey.commandId);
    exports[name] = journey.commandId;
    commands.set(journey.commandId, name);
  }
  const standalone = standaloneModule as unknown as (engine: Ajv, exports: Record<string, string>) => string;
  const generated = standalone(engine, exports);
  const registry = [...commands].map(([id, name]) => `${JSON.stringify(id)}: ${name}`).join(",");
  const source = `import { freezeDeep } from './src/json.ts';
    import { inspectValidation } from './src/validation-result.ts';\n${generated}\nconst validators = {${registry}};
    export const surface = freezeDeep(${JSON.stringify(surface)});
    export const viewProgram = freezeDeep(${JSON.stringify(viewProgram)});
    function inspectInput(commandId, input) {
      if (!Object.hasOwn(validators, commandId)) throw new Error('Unknown command');
      return inspectValidation(validators[commandId], input);
    }
    export const validateInput = Object.assign((commandId, input) => inspectInput(commandId, input).valid,
      { inspect: inspectInput });`;
  const result = await build({ stdin: { contents: source, resolveDir: fileURLToPath(new URL("../../", import.meta.url)) },
    bundle: true, write: false, platform: "browser", format: "esm", target: "es2022" });
  return result.outputFiles[0]!.text;
}
```

## src/build/svelte/template/src/routes/+page.svelte

Source SHA-256: 1b30b59ee4461594a05acd87260fb1cbcf3bfc001cbb7c680ebfe21c70790679

```svelte
<script lang="ts">
  import { AccessGate } from "@desert/svelte/catalog/index.ts";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

<AccessGate {surface} {validateInput} {viewProgram} />
```

## src/svelte/renderer-contracts.ts

Source SHA-256: 52868fcd16e1b11a8b32a32bcfe7c0a18ffc0864bf5af3dbb02c6f37d389ba1c

```ts
import type { Component } from "svelte";
import type { ResolvedNodeId } from "../interaction/catalog.ts";
import type { ControlNode, ControlEvent } from "../interaction/control-nodes.ts";
import type { FrameContent, FactsContent, Destination } from "../interaction/surface-frame.ts";
import type { TopToolbar } from "../interaction/toolbar.ts";
import type { ResolvedNodeFor } from "../interaction/resolved-node.ts";
import type { NodeEvent } from "../interaction/node-events.ts";
import type { CatalogProps } from "./catalog/types.d.ts";
import { freezeDeep } from "../json.ts";
import type { FormControlEvent } from "../interaction/form-control-event.ts";

export type ControlKind = ControlNode["kind"];
export type ControlEventFor<K extends ControlKind> = Extract<ControlEvent, { kind: `${K}.${string}` | (K extends 'labels' ? `reference.${string}` : never) }>;
export type ControlProps<K extends ControlKind> = { node: Extract<ControlNode, { kind: K }> } &
  ([ControlEventFor<K>] extends [never] ? {} : { onevent: (event: ControlEventFor<K>) => void });

type Edit = (name: string, value: string) => void;
type FactsProps = Pick<FactsContent, "fields" | "facts" | "object" | "labels" | "multiline" | "images" | "tags" | "references">;
type ControlRendererProps = { [K in ControlKind as `control.${K}`]: ControlProps<K> };

/** Private web adapter bindings, never accepted as bank descriptors. NodeRenderer alone resolves these. */
export type NodeRendererInputs = ControlRendererProps & {
  "catalog.card": { node: ResolvedNodeFor<"catalog.card">; onevent: (event: NodeEvent) => void };
  "catalog.home": { node: ResolvedNodeFor<"catalog.home">; onevent: (event: NodeEvent) => void };
  "catalog.detail": { node: ResolvedNodeFor<"catalog.detail">; onevent: (event: NodeEvent) => void };
  "input.text": Extract<CatalogProps<"field">, { primitive: "input.text" }>;
  "input.multiline": Extract<CatalogProps<"field">, { primitive: "input.multiline" }>;
  fact: FactsProps;
  action: CatalogProps<"action">;
  availability: NonNullable<TopToolbar["availability"]>;
  collection: { node: ResolvedNodeFor<"collection">; select: (id: string) => void };
  form: { fields: Extract<FrameContent, { kind: "form" }>["fields"]; edit: Edit; controlEvent: (event: FormControlEvent) => void };
  context: FactsProps & { attention?:Extract<FrameContent,{kind:'context'}>['attention']; presentation?: Extract<FrameContent, { kind: "context" }>["presentation"]; selectors?: Extract<FrameContent, { kind: "context" }>["selectors"]; onselect?: (journey: string) => void; actions: readonly (Pick<Destination, "label" | "available"> & {
    id: Destination["destination"]; invoke: () => void;
  })[] };
  review: Extract<FrameContent, { kind: "review" }>;
  transient: CatalogProps<"drawer">;
  problem: {
    open: boolean; title: TopToolbar["title"]; description: Extract<FrameContent, { kind: "message" }>["text"];
    close: () => void; severity?: "error" | "warning"; locked?: boolean;
  };
};

/** Inventory and props are both checked; a component for another entry is not interchangeable. */
export type NodeRendererTable = { readonly [K in ResolvedNodeId]: Component<NodeRendererInputs[K]> };

/** Only these private host channels may bypass serializable node data: a transient frame's reading continuity, a string
 * token (design §3.0). The file host travels by context and an overlay draws its own trigger, so neither is a channel. */
export const DispatcherCapabilities = freezeDeep({
  transient: { property: "continuity", input: "continuity", required: false },
} as const satisfies { [K in ResolvedNodeId]?: {
  property: keyof NodeRendererInputs[K]; input: keyof CatalogProps<"node-renderer">; required: boolean;
} });
```

## src/svelte/renderer-registry.ts

Source SHA-256: dbd7883db4a411c7b751c3390911f94d7ba93c95c31c9f4f199ef1f5db5ca5e4

```ts
// Generated from the catalog declarations by `node scripts/catalog.ts --write`; do not edit.
import type { NodeRendererTable } from "./renderer-contracts.ts";
import Action from "./catalog/foundations/action/Action.svelte";
import Availability from "./catalog/foundations/availability/Availability.svelte";
import CatalogCard from "./catalog/compositions/catalog-card/CatalogCard.svelte";
import CatalogDetail from "./catalog/compositions/catalog-detail/CatalogDetail.svelte";
import CatalogHome from "./catalog/compositions/catalog-home/CatalogHome.svelte";
import Collection from "./catalog/compositions/collection/Collection.svelte";
import ContextPanel from "./catalog/compositions/context-panel/ContextPanel.svelte";
import DateControl from "./catalog/foundations/date-control/DateControl.svelte";
import Drawer from "./catalog/foundations/drawer/Drawer.svelte";
import Facts from "./catalog/renderer/facts/Facts.svelte";
import Field from "./catalog/foundations/field/Field.svelte";
import Fields from "./catalog/compositions/fields/Fields.svelte";
import Files from "./catalog/foundations/files/Files.svelte";
import LabelsControl from "./catalog/compositions/labels-control/LabelsControl.svelte";
import MediaControl from "./catalog/compositions/media-control/MediaControl.svelte";
import MoneyControl from "./catalog/compositions/money-control/MoneyControl.svelte";
import OptionsControl from "./catalog/compositions/options-control/OptionsControl.svelte";
import PopoverControl from "./catalog/compositions/popover-control/PopoverControl.svelte";
import Problem from "./catalog/compositions/problem/Problem.svelte";
import Review from "./catalog/compositions/review/Review.svelte";
import SelectControl from "./catalog/compositions/select-control/SelectControl.svelte";

export const nodeRenderers: NodeRendererTable = Object.freeze({
  action: Action,
  availability: Availability,
  "catalog.card": CatalogCard,
  "catalog.detail": CatalogDetail,
  "catalog.home": CatalogHome,
  collection: Collection,
  context: ContextPanel,
  "control.date": DateControl,
  transient: Drawer,
  fact: Facts,
  "input.text": Field,
  "input.multiline": Field,
  form: Fields,
  "control.files": Files,
  "control.labels": LabelsControl,
  "control.tag": MediaControl,
  "control.image": MediaControl,
  "control.avatar": MediaControl,
  "control.money": MoneyControl,
  "control.options": OptionsControl,
  "control.popover": PopoverControl,
  problem: Problem,
  review: Review,
  "control.select": SelectControl,
} satisfies NodeRendererTable);
```

## src/views/program-schema.ts

Source SHA-256: a7ca597c6071e74e811a99c43165fc406933869113bcb9d54d6b55e27ea42237

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { ViewSchema, ViewLimits } from "./schema.ts";
import { closed, immutable, name, text } from "./definition.ts";
import { ObjectPresentationSchema, FactReferenceSchema } from "./object-presentation.ts";
import { ActivityPlanSchema } from "../activities/schema.ts";

export const ViewProgramVersion = "desert.view-program/4" as const;
export const ViewOutputActionSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("journey"), journey: name }),
  closed({ kind: Type.Literal("select") }),
  closed({ kind: Type.Literal("submit") }),
  closed({ kind: Type.Literal("close") }),
  closed({ kind: Type.Literal("back") }),
  closed({ kind: Type.Literal("lock") }),
]));
export const ViewOutputBindingSchema = closed({ view: name, output: name, action: ViewOutputActionSchema });
const outputs = Type.Array(ViewOutputBindingSchema, { maxItems: ViewLimits.catalogSize });
export const ViewJourneyVariants = Object.freeze({
  presentation: closed({ id: name, kind: Type.Literal("presentation"), view: name,
    collections: Type.Optional(Type.Array(closed({ input: name, read: name, limit: Type.Integer({ minimum: 1, maximum: 200 }),
      summary: Type.Optional(closed({ field: FactReferenceSchema,
        segments: Type.Array(closed({ value:text,label:text }), {minItems:2,maxItems:6}) })),
      preview: Type.Optional(closed({ read: name, where: FactReferenceSchema, media: FactReferenceSchema,
        cover: Type.Optional(FactReferenceSchema) })),
      where: Type.Optional(closed({ field: name, value: text })) }), { maxItems: 8 })), outputs }),
  read: closed({ id: name, kind: Type.Literal("read"), view: name, detailView: name,
    presentation: Type.Optional(Type.Literal("main")),
    referenceCreation: Type.Optional(Type.Literal("separate")),
    related: Type.Optional(Type.Array(closed({ input: name, read: name,
      layout: Type.Optional(FactReferenceSchema),
      membership: Type.Optional(closed({ update: name, input: name })),
      where: closed({ field: FactReferenceSchema, includes: Type.Literal("subject") }) }), { maxItems: 8 })), outputs }),
  create: closed({ id: name, kind: Type.Literal("create"), source: name, view: name, preferredDock: Type.Literal("right"),
    initializeFrom: Type.Optional(closed({ input: name, source: name })),
    presentation: Type.Optional(Type.Literal("transient")),
    startWith: Type.Optional(closed({ kind: Type.Literal("file-picker"), input: name })), outputs }),
  update: closed({ id: name, kind: Type.Literal("update"), source: name, view: name, preferredDock: Type.Literal("right"),
    presentation: Type.Optional(Type.Literal("transient")),
    initialize: Type.Array(closed({ input: name, fact: name }), { maxItems: ViewLimits.catalogSize }), outputs }),
  action: closed({ id: name, kind: Type.Literal("action"), source: name, outputs: Type.Tuple([]) }),
  activity: closed({ id: name, kind: Type.Literal("activity"), source: name, activity: ActivityPlanSchema,
    preferredDock: Type.Literal("right"), outputs: Type.Tuple([]) }),
});
export const ViewJourneySchema = immutable(Type.Union([
  ViewJourneyVariants.presentation, ViewJourneyVariants.read, ViewJourneyVariants.create,
  ViewJourneyVariants.update, ViewJourneyVariants.action, ViewJourneyVariants.activity,
]));
export const ViewDestinationSchema = closed({ id: name, label: text, icon: ActionIconSchema, entryJourney: name });
/** Product navigation owns selection, order and semantic grouping; icons are not routing rules. */
export const ViewNavigationEntrySchema = immutable(closed({
  destination: name, group: text, purpose: Type.Union([Type.Literal("content"), Type.Literal("utility")]),
}));
export const ViewProgramSchema = closed({
  version: Type.Literal(ViewProgramVersion), productId: name, label: text, workspace: name,
  objects: Type.Optional(Type.Array(ObjectPresentationSchema, { maxItems: ViewLimits.catalogSize })),
  views: Type.Array(ViewSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  journeys: Type.Array(ViewJourneySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  destinations: Type.Array(ViewDestinationSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  entry: name, navigation: Type.Array(ViewNavigationEntrySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
});
export type ViewProgram = Frozen<Static<typeof ViewProgramSchema>>;
export type ViewJourney = Frozen<Static<typeof ViewJourneySchema>>;
export type ViewDestination = Frozen<Static<typeof ViewDestinationSchema>>;
export type ViewNavigationEntry = Frozen<Static<typeof ViewNavigationEntrySchema>>;
export type ViewOutputBinding = Frozen<Static<typeof ViewOutputBindingSchema>>;
export type ViewOutputAction = Frozen<Static<typeof ViewOutputActionSchema>>;
```

## src/views/program.ts

Source SHA-256: 2ace18ae7230bf027468e80728f5c6d9a7e950530a4d5918d67098a6dc6b996a

```ts
import { Check } from "@sinclair/typebox/value";
import { ConnectionPolicySchema } from "../connection-policy.ts";
import { requireProgramOwnedNavigation } from "../navigation-ownership.ts";
import { freezeDeep } from "../json.ts";
import type { Surface } from "../web/types.ts";
import { ViewProgramSchema, type ViewProgram } from "./program-schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewIndex } from "./view-index.ts";
import { journeyViews, validateJourneyExposure, validateJourneyViews } from "./program-views.ts";
import { validateJourneyOutputs } from "./program-outputs.ts";
import { validateProgramBindings } from "./program-bindings.ts";
import { validateProgramHeaders } from "./program-headers.ts";
import { viewHeaderImages } from "./header-media.ts";
import { InteractionProtocolVersion } from "../interaction/protocol.ts";
import { requireFieldPresentation } from "../field-representation.ts";
import { validateProgramWorkspace } from "./program-workspace.ts";

/** Bind presentation to an already compiled human exposure; this grants no execution authority. */
export function compileViewProgram(definition: unknown, surface: Surface): ViewProgram {
  requireProgramOwnedNavigation(surface);
  const input = viewSnapshot(definition);
  if (!Check(ViewProgramSchema, input)) throw new Error("INVALID_VIEW_PROGRAM");
  if (surface.kind !== "human" || surface.protocol !== InteractionProtocolVersion ||
    !surface.language || !surface.commit || !surface.connection ||
    !Check(ConnectionPolicySchema, surface.connection)) throw new Error("INVALID_VIEW_PROGRAM_SURFACE");
  const fieldPresentation = requireFieldPresentation(surface.fieldRepresentations, surface.fieldKinds, Object.keys(surface.language.fields));
  const human = { ...surface, language: surface.language,
    commit: surface.commit, connection: surface.connection, ...fieldPresentation };
  if (input.productId !== surface.productId) throw new Error("VIEW_PROGRAM_PRODUCT_MISMATCH");
  const views = new Map(viewIndex(input.views).map(item => [item.id, item]));
  const journeys = new Map(input.journeys.map(item => [item.id, item]));
  if (journeys.size !== input.journeys.length) throw new Error("DUPLICATE_VIEW_JOURNEY");
  const destinations = new Map(input.destinations.map(item => [item.id, item]));
  if (destinations.size !== input.destinations.length) throw new Error("DUPLICATE_VIEW_DESTINATION");
  const usedViews = new Set(validateProgramWorkspace(input));
  for (const value of views.values()) {
    for (const item of value.content) if (item.kind === "header" && item.media) viewHeaderImages(item.media);
    if (value.content.findIndex(item => item.kind === "header") > 0) throw new Error("INVALID_PROGRAM_HEADER_PLACEMENT");
  }
  // Exposure is checked before output references so forged canonical identities fail at their owner.
  for (const journey of journeys.values()) validateJourneyExposure(journey, human);
  validateProgramBindings(input, human);
  validateProgramHeaders(input);
  for (const journey of journeys.values()) {
    const owned = journeyViews(journey, views);
    owned.forEach(item => usedViews.add(item.id));
    validateJourneyViews(journey, owned);
    validateJourneyOutputs(journey, owned, journeys);
  }
  if (usedViews.size !== views.size) throw new Error("UNUSED_PROGRAM_VIEW");
  for (const destination of destinations.values()) {
    const journey = journeys.get(destination.entryJourney);
    if (!journey) throw new Error("UNKNOWN_DESTINATION_JOURNEY");
    if (journey.kind !== "presentation" && journey.kind !== "read") throw new Error("INVALID_DESTINATION_JOURNEY");
  }
  for (const journey of journeys.values()) {
    if (journey.kind !== "presentation" && journey.kind !== "read") continue;
    const entries = input.destinations.filter(item => item.entryJourney === journey.id);
    const companionRead = Object.values(human.fieldReferences ?? {}).some(reference => reference.read === journey.id);
    const boundRead = journey.kind === "read" && journey.presentation !== "main" && (companionRead || input.journeys.some(owner =>
      owner.kind === "presentation" ? owner.collections?.some(binding => binding.read === journey.id)
        : owner.kind === "read" && owner.related?.some(binding => binding.read === journey.id)));
    if (entries.length !== 1 && !(entries.length === 0 && boundRead)) throw new Error("INVALID_JOURNEY_DESTINATION_COUNT");
  }
  if (!destinations.has(input.entry)) throw new Error("UNKNOWN_ENTRY_DESTINATION");
  const navigation = input.navigation.map(item => item.destination);
  if (new Set(navigation).size !== navigation.length) throw new Error("DUPLICATE_NAVIGATION_DESTINATION");
  if (navigation.some(id => !destinations.has(id))) throw new Error("UNKNOWN_NAVIGATION_DESTINATION");
  const reachable = new Set([input.entry, ...navigation].map(id => destinations.get(id)!.entryJourney));
  for (const object of input.objects ?? []) for (const action of object.actions) reachable.add(action.journey);
  for (const reference of Object.values(human.fieldReferences ?? {})) {
    if (journeys.has(reference.read)) reachable.add(reference.read);
  }
  // Attention is a resume route for existing occurrences, never a second creation entry.
  if (input.views.some(view => view.content.some(item => item.kind === "attention"))) {
    for (const journey of input.journeys) if (journey.kind === "activity") reachable.add(journey.id);
  }
  const pending = [...reachable];
  while (pending.length) {
    const current = journeys.get(pending.pop()!)!;
    if (current.kind === "presentation") for (const binding of current.collections ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    if (current.kind === "read") for (const binding of current.related ?? []) {
      if (!reachable.has(binding.read)) { reachable.add(binding.read); pending.push(binding.read); }
    }
    for (const output of current.outputs) {
      if (output.action.kind !== "journey" || reachable.has(output.action.journey)) continue;
      reachable.add(output.action.journey);
      pending.push(output.action.journey);
    }
  }
  if (reachable.size !== journeys.size) throw new Error("UNREACHABLE_PROGRAM_JOURNEY");
  return freezeDeep(input);
}
```

## src/views/resolved.ts

Source SHA-256: 7fb7733e8238c166b307e9f6ea23942b15e954a260d998570cde2e512f282fc4

```ts
import type { View, ViewContent, ViewHeader } from "./schema.ts";
import type { ResolvedNode } from "../interaction/resolved-node.ts";
import type { TopToolbar, BottomToolbar } from "../interaction/toolbar.ts";
import type { FrameContent, SurfaceFrame } from "../interaction/surface-frame.ts";
import type { AttentionSnapshot } from "../web/client/attention-feed.ts";
import type { RelatedSelectionSnapshot } from "../interaction/related-selection.ts";

/** Private, validated projection. Products cannot provide runtime bindings or render callbacks. */
export type ResolvedViewDefinition = Omit<View, "content"> & {
  readonly content: readonly (Exclude<ViewContent, ViewHeader | { readonly kind: "system-status" }>
    | (Omit<ViewHeader, "title"> & { readonly title: string }))[];
};
export type ResolvedView = {
  readonly view: ResolvedViewDefinition;
  readonly bindings: Readonly<Record<string, ResolvedNode>>;
  readonly pending?: Readonly<Record<string, Extract<FrameContent, { kind: "message" }>>>;
  readonly disabledOutputs: readonly string[];
  readonly connection?: { readonly state: 'loading' | 'ready' | 'offline'; readonly label: string };
  readonly attention?: AttentionSnapshot;
  readonly relations?: RelatedSelectionSnapshot;
  readonly top?: TopToolbar;
  readonly bottom?: BottomToolbar;
};
export type ResolvedPanel = {
  readonly presentation?: "transient";
  readonly frame: SurfaceFrame;
  /** One token per reading context (subject in detail), minted by the view program: equal while the reading continues. */
  readonly readingIdentity?: string;
  readonly body?: ResolvedView;
  readonly label: string;
  readonly locked: boolean;
};
```

## src/web/client/view-program.ts

Source SHA-256: d3a99d6f1ba8e290e1ef16d11509ae8060cd2ba39d11aefc726a8daa1c016fc1

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import { viewEventOwnership, type OwnedViewEvent } from "./view-events.ts";
import { compileViewProgram } from "../../views/program.ts";
import { sourceRead } from "../../views/program-bindings.ts";
import { projectView, projectViewPanel } from "./view-projection.ts";
import { viewScopes } from "./view-scopes.ts";
import { webTransport, type ControllerTransport } from "./transport.ts";
import type { AccessClient } from "./access.ts";
import type { DraftFileHost } from "../../interaction/image-input.ts";
import type { AssetReference, AssetImageVariant } from "../../assets/types.ts";
import { activityModel } from "./activity-model.ts";
import { projectActivityPanel } from "./activity-projection.ts";
import { activityEvent } from "./activity-events.ts";
import type { ActivityHost } from "./activity-host.ts";
import { fileEntry } from "./file-entry.ts";
import { attentionFeed } from "./attention-feed.ts";
import { viewInputs } from "../../views/ports.ts";
import { modelRelatedSelection } from "./model-related-selection.ts";
import {readRefresh} from './read-refresh.ts';
import type { ViewJourney } from '../../views/program-schema.ts';
import { relatedMediaDraft, lockRelatedForm } from './view-related-draft.ts';
import { connectionPresentation } from './connection-presentation.ts';
import { runtimeToken } from './runtime-token.ts';

/** Nonvisual interpreter; the installed controller remains the only operation executor. */
export function viewProgramModel(input: unknown, surface: HumanSurface, validate: ValidateInput, transport?: ControllerTransport,
  access?: Pick<AccessClient, "lock">, files?: DraftFileHost, activityHost?: ActivityHost, profile?: { displayName?: string }) {
  const controller = transport ?? webTransport(surface.contractDigest);
  const program = compileViewProgram(input, surface), scopes = viewScopes(program, surface, validate, controller, files);
  if (program.journeys.some(journey => journey.kind === "activity") && !activityHost) throw new Error("ACTIVITY_HOST_REQUIRED");
  let destinationId = program.entry, creating = false, stopped = false;
  const history: string[] = [];
  let observeAttention=()=>{};
  const picker = fileEntry(surface, files);
  let entryError: string | null = null;
  const listeners = new Set<() => void>();
  const destination = () => program.destinations.find(item => item.id === destinationId)!;
  const journeyFor = (id: string) => program.journeys.find(item => item.id === id)!;
  const definition = (id: string) => program.views.find(item => item.id === id)!;
  function activeJourney() {
    const active = journeyFor(destination().entryJourney);
    if (active.kind !== "read" && active.kind !== "presentation") throw new Error("INVALID_DESTINATION_JOURNEY");
    return active;
  }
  function readScope(id: string) {
    const value = scopes.find(item => item.scope.kind === "read" && item.scope.read.id === id);
    if (!value) throw new Error("INVALID_VIEW_SOURCE");
    return value;
  }
  function presentationScope() {
    const value = scopes.find(item => item.scope.kind === "presentation");
    if (!value) throw new Error("INVALID_VIEW_PRESENTATION_SCOPE");
    return value;
  }
  const entry = activeJourney();
  let scope = entry.kind === "read" ? readScope(entry.id) : presentationScope();
  const state = () => scope.model.snapshot();
  let relatedSave: { panel: Extract<ViewJourney,{kind:'update'}>; read: Extract<ViewJourney,{kind:'read'}>;
    draft: ReturnType<typeof state>; accepted: boolean; working: boolean } | undefined;
  function mainScope() { const active = activeJourney(); return active.kind === "read" ? readScope(active.id) : presentationScope(); }
  function mainView() {
    const active = activeJourney(), selected = mainScope().model.snapshot();
    return active.kind === "read" && active.presentation === "main" && selected.selectedId ? active.detailView : active.view;
  }
  function currentRead() {
    return scope.scope.kind === "read" ? journeyFor(scope.scope.read.id) : undefined;
  }
  let readingContext: { scope: typeof scope; subject: string; identity: string } | undefined;
  function readingIdentity() {
    const current = state();
    if (stopped || scope.scope.kind !== "read" || !current.selectedId) { readingContext = undefined; return undefined; }
    if (readingContext?.scope !== scope || readingContext.subject !== current.selectedId) {
      readingContext = { scope, subject: current.selectedId, identity: runtimeToken("reading") };
    }
    return current.view === "detail" && current.detail?.id === current.selectedId ? readingContext.identity : undefined;
  }
  const ownership = viewEventOwnership();
  function syncOwners() {
    const current = state(), panel = panelJourney(), activity = activities.snapshot();
    return ownership.sync([destinationId, mainView(), mainScope().model.snapshot().selectedId, current.view, panel?.id, current.selectedId, current.prepared?.id,
      activity.activity?.id, activity.activity?.revision, activity.prepared?.id, activity.uncertain], Boolean(panel));
  }
  const notify = () => {
    const current = state();
    if (relatedSave && !relatedSave.accepted && current.view === 'detail' && current.notice === 'Saved' &&
      current.selectedId === relatedSave.draft.editing?.subject && !current.editing) relatedSave.accepted = true;
    observeAttention();syncRelations(); syncOwners(); for (const listener of listeners) listener();
  };
  const activities = activityModel(surface, controller, notify, async (experience, receipt) => {
    const read = sourceRead(program, surface, experience);
    activate(read.id); settleRead(read.id);
    creating = false; syncReading(); await scope.model.select(receipt.object.id); void attention.refresh(); notify();
  }, activityHost);
  const attention = attentionFeed(program, surface, controller, notify);
  attention.availability(false, true);
  const relations = modelRelatedSelection(program, surface, controller, validate, notify);
  let relatedRevision = 0;
  const hasAttention = program.journeys.some(journey=>journey.kind==='activity')||program.views.some(view => view.content.some(item => item.kind === "attention"));
  let attentionReady=false,attentionConnecting=true,activityRevision='';
  const attentionRefresh=readRefresh(()=>attention.refresh(),()=>!stopped&&hasAttention&&attentionReady);
  observeAttention=()=>{
    const activityJourneys=program.journeys.filter(journey=>journey.kind==='activity');
    const ready=!stopped&&activityJourneys.every(journey=>state().availability.journeys[journey.id]?.dependenciesReady===true);
    const connecting=!ready&&!stopped&&activityJourneys.every(journey=>connectionPresentation(state().availability.journeys[journey.id])!=='offline');
    const current=activities.snapshot().activity,revision=current?`${current.id}:${current.revision}:${current.phase}`:'';
    if(ready!==attentionReady||connecting!==attentionConnecting){attentionReady=ready;attentionConnecting=connecting;attention.availability(ready,connecting);if(ready)void attentionRefresh.request();else attentionRefresh.invalidate();}
    else if(ready&&revision!==activityRevision)void attentionRefresh.request();
    activityRevision=revision;
    attentionRefresh.observe();
  };
  function syncRelations() {
    const panel = panelJourney(), current = state();
    const read = relatedSave?.read ?? (panel?.kind === "update" ? sourceRead(program, surface, panel) : undefined);
    relations.updateContext({ ...(read ? { readJourneyId: read.id } : {}), ...(current.selectedId ? { parentId: current.selectedId } : {}),
      editing: Boolean(relatedSave) || current.view === "edit" && panel?.kind === "update",
      active: !stopped && Boolean(read && current.availability.journeys[read.id]?.dependenciesReady &&
        read.related?.filter(binding => binding.membership).every(binding =>
          current.availability.journeys[binding.read]?.dependenciesReady &&
          current.availability.journeys[binding.membership!.update]?.dependenciesReady)) });
    const revision = relations.snapshot().revision;
    if (revision !== relatedRevision) {
      relatedRevision = revision;
      const included = new Set(overviewReads());
      for (const item of scopes) if (item.scope.kind === "read" && (item === scope || included.has(item.scope.read.id))) void item.model.refresh();
    }
  }
  function interactionLocked() {
    const current = state(), activity = activities.snapshot(), related = relations.snapshot();
    return current.busy || current.uncertain || activity.busy || activity.uncertain || related.busy || related.uncertain ||
      related.committing || Boolean(relatedSave?.working || relatedSave?.accepted);
  }
  function overviewReads() {
    const active = activeJourney();
    return active.kind === "presentation" ? active.collections?.flatMap(binding => [binding.read, ...(binding.preview ? [binding.preview.read] : [])]) ?? []
      : [active.id, ...(mainScope().model.snapshot().selectedId ? active.related?.map(binding => binding.read) ?? [] : [])];
  }
  function settleRead(id: string) {
    if (overviewReads().includes(id)) return;
    const target = program.destinations.find(item => item.entryJourney === id);
    if (target && target.id !== destinationId) { history.push(destinationId); destinationId = target.id; }
  }
  function syncReading() {
    const included = new Set(overviewReads());
    for (const item of scopes) if (item.scope.kind === "read") item.model.setReading(item === scope || included.has(item.scope.read.id));
  }
  function relatedReads() {
    return new Map(program.journeys.flatMap(journey => journey.kind === "read" ? [[journey.id,
      { journey, state: readScope(journey.id).model.snapshot(), scope: readScope(journey.id).scope }] as const] : []));
  }
  function activate(read: string) {
    const next = readScope(read);
    scope = next; syncReading();
  }
  const unsubscribes = scopes.map(item => item.model.subscribe(next => {
    if (scope !== item) {
      if (item.scope.kind === "read" && overviewReads().includes(item.scope.read.id)) notify();
      return;
    }
    if (creating && next.view === "detail") {
      creating = false;
      if (scope.scope.kind !== "read") throw new Error("INVALID_VIEW_SOURCE");
      const read = scope.scope.read;
      settleRead(read.id); syncReading();
    }
    if (next.view === "list") creating = false;
    syncReading();
    notify();
  }));
  function panelJourney() {
    if (activities.snapshot().experience) return activities.snapshot().experience;
    if (relatedSave?.accepted) return relatedSave.panel;
    const current = state(), active = activeJourney();
    if (["create", "edit", "review", "recovery"].includes(current.view)) {
      const id = current.view === "review" || current.view === "recovery" ? current.mutationId
        : current.editing?.journeyId ?? current.creationJourneyId;
      if (!id) throw new Error("FORM_JOURNEY_REQUIRED");
      return journeyFor(id);
    }
    const read = currentRead();
    return current.view === "detail" && read?.kind === "read" &&
      !(active.id === read.id && read.presentation === "main") ? read : null;
  }
  function panelView(panel: ReturnType<typeof panelJourney>) {
    if (panel?.kind === "activity") return panel.activity.steps[activities.snapshot().activity?.progress.nextStep ?? 0]?.view;
    return panel?.kind === "read" ? panel.detailView : panel?.kind === "action"
      ? sourceRead(program, surface, panel).detailView : panel?.view;
  }
  function snapshot() {
    const active = activeJourney(), panel = panelJourney(), current = state(), related = relations.snapshot();
    const view = panelView(panel), panelDefinition = view ? definition(view) : null;
    const owners = syncOwners(), reading = readingIdentity();
    const activity = activities.snapshot(), activityPanel = projectActivityPanel(program, surface, current, activity, validate);
    const main = mainScope(), mainState = main.model.snapshot();
    const projected = projectView(program, active, definition(mainView()), surface,
      { ...mainState, busy: current.busy || mainState.busy || related.busy || related.committing || Boolean(relatedSave?.accepted), uncertain: current.uncertain || mainState.uncertain || related.uncertain },
      validate, main.scope, relatedReads(), profile,attention.snapshot());
    const backUnavailable = !history.length && projected.top?.leading?.intent.kind === "back";
    return { program, activeDestination: destinationId,
      resolved: { ...projected, ...(hasAttention ? { attention: attention.snapshot() } : {}),
        ...(backUnavailable ? { top: { ...projected.top!, leading: { ...projected.top!.leading!, state: "unavailable" as const } } } : {}), owner: owners.main },
      panel: activityPanel && owners.panel ? { ...activityPanel, owner: owners.panel } : panel && panelDefinition && owners.panel ? {
        ...relatedPanel(panel, panelDefinition, current), owner: owners.panel,
        ...(reading ? { readingIdentity: reading } : {}) } : null,
      error: entryError ?? activity.error ?? current.error, uncertain: activity.uncertain || current.uncertain || related.uncertain, state: current, activity };
  }
  function relatedPanel(panel: NonNullable<ReturnType<typeof panelJourney>>, view: ReturnType<typeof definition>, current: ReturnType<typeof state>) {
    const related = relations.snapshot();
    const read = panel.kind === 'update' ? sourceRead(program,surface,panel) : undefined;
    const display = relatedSave?.accepted ? { ...relatedSave.draft, availability:current.availability, error:current.error,
      busy:true, uncertain:false } : current;
    const filtered = read ? relatedMediaDraft(surface,read,display,related).state : display;
    let projected = projectViewPanel(program, panel, view, surface,
      { ...filtered, busy: filtered.busy || related.busy, uncertain: filtered.uncertain || related.uncertain }, validate, scope.scope,attention.snapshot());
    if (relatedSave?.accepted || relatedSave?.working) projected = lockRelatedForm(projected);
    const controls = current.busy || current.uncertain ? { ...related, groups: related.groups.map(group => ({ ...group, disabled: true })) } : related;
    return projected.body && related.groups.length ? { ...projected, body: { ...projected.body, relations: controls } } : projected;
  }
  function navigate(id: string, remember = true) {
    if (stopped) return;
    if (!program.destinations.some(destination => destination.id === id)) throw new Error("UNKNOWN_VIEW_DESTINATION");
    if (interactionLocked()) return;
    picker.cancel(); entryError = null;
    activities.close();
    const previousMain = mainScope();
    scope.model.close();
    if (state().view === "detail") scope.model.back();
    if (previousMain !== scope) { previousMain.model.close(); if (previousMain.model.snapshot().view === "detail") previousMain.model.back(); }
    if (remember && id !== destinationId) history.push(destinationId);
    creating = false; destinationId = id; readingContext = undefined;
    const target = journeyFor(destination().entryJourney);
    if (target.kind === "read") activate(target.id);
    else scope = presentationScope();
    syncReading();
    if (hasAttention) void attention.refresh();
    notify();
  }
  function goBack() {
    if (stopped || interactionLocked()) return;
    const previous = history.pop();
    if (previous) navigate(previous, false);
  }
  function closePanel() {
    if (interactionLocked()) return;
    relatedSave = undefined;
    scope.model.close();
    const main = mainScope();
    if (state().view === "list" && scope !== main) { scope = main; syncReading(); notify(); }
  }
  function startJourney(id: string) {
    const target = journeyFor(id);
    if (!target) throw new Error("UNKNOWN_VIEW_JOURNEY");
    if (target.kind === "activity") {
      activate(sourceRead(program, surface, target).id); void activities.open(target);
    } else if (target.kind === "create") {
      const initiatingOwner = syncOwners().main;
      const origin = target.initializeFrom && activeJourney().id === target.initializeFrom.source
        ? { scope: mainScope(), subject: mainScope().model.snapshot().selectedId } : undefined;
      const begin = () => {
        if (stopped || interactionLocked() || syncOwners().main !== initiatingOwner) return false;
        if (origin && (mainScope() !== origin.scope || mainScope().model.snapshot().selectedId !== origin.subject)) return false;
        activate(sourceRead(program, surface, target).id);
        scope.model.create(target.id); creating = state().view === "create";
        if (creating && origin?.subject && target.initializeFrom) {
          scope.model.initializeReference(target.initializeFrom.input, origin.subject);
        }
        return creating;
      };
      if (target.startWith) {
        entryError = null;
        void picker.select(target, selection => {
          if (!begin()) return false;
          scope.model.editFiles(selection); return true;
        }).catch(() => { if (!stopped) { entryError = "FILE_SELECTION_REJECTED"; notify(); } });
      } else begin();
    } else if (target.kind === "update" || target.kind === "action") {
      if (scope.scope.kind !== "read" || target.source !== scope.scope.read.id ||
        !program.objects?.some(object => object.actions.some(action => action.journey === id))) {
        throw new Error("INVALID_VIEW_EVENT");
      }
      if (target.kind === "update") scope.model.startEdit(id);
      else {
        const current = state(), mutation = surface.journeys.find(item => item.id === id);
        if (current.view !== "detail" || !current.detail || current.selectedId !== current.detail.id || mutation?.kind !== "mutation") return;
        void scope.model.invoke(mutation, current.detail.id);
      }
    } else {
      const next = program.destinations.find(item => item.entryJourney === id);
      if (!next) throw new Error("UNKNOWN_VIEW_DESTINATION");
      navigate(next.id);
    }
  }
  function event(value: OwnedViewEvent) {
    syncOwners();
    const current = state(), model = scope.model;
    const navigation = current.view === "detail" && panelJourney()?.kind === "read" && !current.busy && !current.uncertain;
    const event = ownership.read(value, navigation ? { kind: "navigation", view: mainView() } : { kind: "exclusive" });
    if (!event) return;
    if (event.kind === "related.change" || event.kind === "related.recover") {
      const activity = activities.snapshot();
      if (!current.busy && !current.uncertain && !activity.busy && !activity.uncertain &&
        (event.kind === 'related.recover' || !relatedSave)) void relations.event(event).then(() => {
          if (event.kind === 'related.change') clearRemovedCover();
          if (relatedSave?.accepted && !relations.snapshot().dirty && !relations.snapshot().committing) relatedSave = undefined;
          notify();
        });
      return;
    }
    if (relations.snapshot().busy || relations.snapshot().uncertain || relations.snapshot().committing || relatedSave?.accepted || relatedSave?.working) return;
    if (event.kind === "attention.resume") {
      if (current.busy || current.uncertain || panelJourney() ||
        !definition(activeJourney().view).content.some(item => item.kind === "attention")) return;
      const item = attention.snapshot().items.find(item => item.id === event.id && item.available);
      const experience = item ? journeyFor(item.journey) : undefined;
      if (!item || experience?.kind !== "activity") throw new Error("INVALID_ATTENTION_ITEM");
      activate(sourceRead(program, surface, experience).id);
      void activities.open(experience, item.id); return;
    }
    const activityId = activities.snapshot().experience?.id;
    if (activityEvent(activities, event, Boolean(activityId && current.availability.journeys[activityId]?.dependenciesReady))) return;
    if (event.kind === "files.choose" || event.kind === "files.remove") { model.editFiles(event); return; }
    if (event.kind === "labels.change") { model.editLabels(event); return; }
    if (event.kind === 'reference.create' || event.kind === 'reference.refresh' || event.kind === 'reference.recover') { void model.referenceEvent(event); return; }
    if (event.kind === "input.change") {
      if ((current.view === "create" || current.view === "edit") && !current.uncertain) {
        const mutation = surface.journeys.find(item => item.id === (current.editing?.journeyId ?? current.creationJourneyId));
        if (mutation?.kind !== "mutation" || !mutation.inputFields.includes(event.name)) throw new Error("INVALID_VIEW_INPUT");
        model.edit(event.name, event.value);
      }
      return;
    }
    if (event.kind === "problem.close") { entryError = null; model.dismissError(); notify(); return; }
    if (event.kind === "transient.closed") return;
    if (event.kind === "transient.close") { closePanel(); return; }
    if (event.kind !== "surface.invoke") throw new Error("INVALID_VIEW_EVENT");
    const intent = event.intent;
    if (intent.kind === "close") { closePanel(); return; }
    if (intent.kind === "back") {
      if (value.owner === syncOwners().main) goBack();
      else { relatedSave = undefined; model.back(); }
      return;
    }
    if (intent.kind === "accept" || intent.kind === "recover") {
      if ((intent.kind === "accept" && current.view !== "review" && current.view !== "recovery") ||
        (intent.kind === "recover" && current.view !== "recovery")) throw new Error("INVALID_VIEW_EVENT");
      void primaryRelatedSave(() => model[intent.kind]()); return;
    }
    if (intent.kind === "journey") {
      const panel = panelJourney();
      if ((current.view === "create" || current.view === "edit") && panel?.id === intent.journey) {
        const submit = panel.outputs.find(binding => binding.action.kind === "submit")!;
        dispatchOutput(submit.view, submit.output); return;
      }
      const read = currentRead();
      if (current.view !== "detail" || read?.kind !== "read" || !program.objects?.some(object =>
        object.view === read.detailView && object.actions.some(action => action.journey === intent.journey))) throw new Error("INVALID_VIEW_EVENT");
      startJourney(intent.journey); return;
    }
    if (intent.kind !== "view.output") throw new Error("INVALID_VIEW_EVENT");
    dispatchOutput(intent.view, intent.output, intent.recordId);
  }
  function dispatchOutput(view: string, output: string, recordId?: string) {
    const current = state(), active = activeJourney(), panel = panelJourney();
    const mainAvailable = !panel || current.view === "detail" && panel.kind === "read";
    const owner = mainAvailable && view === mainView() ? active :
      !["review", "recovery"].includes(current.view) && view === panelView(panel) ? panel : undefined;
    const binding = owner?.outputs.find(item => item.view === view && item.output === output);
    if (!binding) throw new Error("UNKNOWN_VIEW_OUTPUT");
    if (binding.action.kind !== "select" && recordId !== undefined) throw new Error("INVALID_VIEW_OUTPUT_PAYLOAD");
    if (interactionLocked()) return;
    const sourceScope = owner === active ? mainScope() : scope;
    const sourceState = sourceScope.model.snapshot();
    if (projectView(program, owner!, definition(view), surface, sourceState, validate, sourceScope.scope, relatedReads()).disabledOutputs.includes(output)) return;
    switch (binding.action.kind) {
      case "lock":
        if (!access) throw new Error("IDENTITY_ACCESS_REQUIRED");
        stop(); void access.lock(); break;
      case "journey": startJourney(binding.action.journey); break;
      case "select": {
        if (owner?.kind === "presentation") {
          const port = viewInputs(definition(view)).find(port => port.kind === "collection" && port.output === output);
          const binding = owner.collections?.find(binding => binding.input === port?.input);
          if (!binding) throw new Error("INVALID_OVERVIEW_INPUT");
          const source = readScope(binding.read).model.snapshot();
          const visible = source.records.filter(record => !binding.where || record.facts[binding.where.field] === binding.where.value).slice(0, binding.limit);
          if (!recordId || !visible.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
          const target = program.destinations.find(destination => destination.entryJourney === binding.read);
          if (target) navigate(target.id); else activate(binding.read);
          void scope.model.select(recordId); break;
        }
        if (owner?.kind === "read" && view === owner.detailView) {
          const port = viewInputs(definition(view)).find(port => port.kind === "collection" && port.output === output);
          const binding = owner.related?.find(binding => binding.input === port?.input);
          if (!binding) throw new Error("INVALID_RELATED_READ");
          const source = readScope(binding.read).model.snapshot();
          if (!recordId || !sourceState.selectedId || !source.records.some(record => {
            const memberships = record.facts[binding.where.field.field];
            return record.id === recordId && Array.isArray(memberships) && memberships.includes(sourceState.selectedId);
          })) throw new Error("INVALID_VIEW_RECORD");
          activate(binding.read); void scope.model.select(recordId); break;
        }
        if (!recordId || !sourceState.records.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
        if (owner?.kind === "read") activate(owner.id);
        void scope.model.select(recordId); break;
      }
      case "submit": {
        const mutation = surface.journeys.find(item => item.id === owner!.id);
        if (mutation?.kind !== "mutation") throw new Error("INVALID_VIEW_EVENT");
        clearRemovedCover();
        if (owner?.kind === 'update' && relations.snapshot().dirty) relatedSave = { panel:owner,
          read:sourceRead(program,surface,owner),draft:state(),accepted:false,working:true };
        void primaryRelatedSave(() => scope.model.invoke(mutation)); break;
      }
      case "close": closePanel(); break;
      case "back": goBack(); break;
    }
  }
  function clearRemovedCover() {
    const panel = panelJourney();
    if (panel?.kind !== 'update' || state().view !== 'edit' || relatedSave?.accepted) return;
    const read = sourceRead(program,surface,panel);
    for (const field of relatedMediaDraft(surface,read,state(),relations.snapshot()).clear) {
      scope.model.editLabels({kind:'labels.change',control:field,values:[]});
    }
  }
  async function primaryRelatedSave(action:()=>Promise<unknown>) {
    const pending = relatedSave;
    if (pending) pending.working = true;
    await action();
    if (stopped || !pending || relatedSave !== pending) return;
    pending.working = false;
    if (pending.accepted) {
      if (await relations.commit()) relatedSave = undefined;
    } else if (!['review','recovery'].includes(state().view)) relatedSave = undefined;
    notify();
  }
  function stop() {
    relatedSave = undefined;
    picker.cancel();
    attentionRefresh.stop();
    attention.dispose();
    relations.stop();
    stopped = true; readingContext = undefined; ownership.stop(); unsubscribes.forEach(stop => stop());
    activities.dispose();
    scopes.forEach(item => item.model.dispose()); listeners.clear();
  }
  return {
    snapshot, event, navigate,
    images: {
      lease: (asset: AssetReference) => relations.images.lease(asset) ?? scopes.map(item => item.model.images.lease(asset)).find(Boolean),
      subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    },
    image: (asset: AssetReference, variant: AssetImageVariant, signal?: AbortSignal) => {
      const lease = relations.images.lease(asset) ?? scopes.map(item => item.model.images.lease(asset)).find(Boolean);
      return lease ? lease.read(variant, signal) : scope.model.image(asset, variant, signal);
    },
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    async start(invitation?: string) {
      if (stopped) return;
      const active = journeyFor(destination().entryJourney);
      if (active.kind === "read") activate(active.id);
      else syncReading();
      const connectedModel = scope.model;
      const initial = connectedModel.start(invitation);
      if (invitation) await initial;
      await Promise.all([initial, ...scopes.filter(item => item.model !== connectedModel).map(item => item.model.start())]);
      if (hasAttention && !stopped) {
        await attention.refresh();
      }
      const pending = activities.pendingJourney(), experience = pending ? journeyFor(pending) : undefined;
      if (experience?.kind === "activity") { activate(sourceRead(program, surface, experience).id); await activities.open(experience); }
    },
    stop,
  };
}
```

## src/web/client/view-projection.ts

Source SHA-256: 82f2c3898114a6522c1a286230125a8ee3728aa5a67c30d57edff93bc9c0444c

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import { subjectActionAvailable, type HumanState } from "./state.ts";
import type { ViewProgram, ViewJourney } from "../../views/program-schema.ts";
import type { View } from "../../views/schema.ts";
import type { ResolvedView, ResolvedPanel } from "../../views/resolved.ts";
import { viewInputs } from "../../views/ports.ts";
import { presentCollection } from "../../interaction/node-presenters.ts";
import { resolvedNode, ResolvedNodeVersion, type ResolvedNode } from "../../interaction/resolved-node.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { toolbarAction } from "../../interaction/toolbar.ts";
import { presentFrame } from "./frame.ts";
import { requireReadScope, type ModelScope } from "./model-scope.ts";
import { presentFacts, readingFields } from "../../interaction/fact-presentation.ts";
import type { FrameContent } from "../../interaction/surface-frame.ts";
import { resolveViewIdentity } from "./view-identity.ts";
import { publishedActionsFor } from "../../views/program-bindings.ts";
import { inspectMutationDraft } from "./draft-validation.ts";
import { objectSelectors } from "./object-selectors.ts";
import { Check } from "@sinclair/typebox/value";
import { AssetReferenceSchema } from "../../assets/types.ts";
import {objectAttentionKey} from '../../attention.ts';
import type {AttentionSnapshot} from './attention-feed.ts';
import { connectionPresentation, unavailableReason } from './connection-presentation.ts';

export type RelatedRead = { readonly journey: Extract<ViewJourney, { kind: "read" }>; readonly state: HumanState; readonly scope: ModelScope };
export type RelatedReads = ReadonlyMap<string, RelatedRead>;

function contextContent(program: ViewProgram, definition: View, surface: HumanSurface, state: HumanState, content: FrameContent, scope: ModelScope,attention?:AttentionSnapshot): FrameContent {
  if (content.kind !== "context" || !state.detail) return content;
  const { read } = requireReadScope(scope);
  const publication = program.objects?.find(object => object.object === read.subject && object.view === definition.id);
  const title = definition.content.find(item => item.kind === "header")?.title;
  const selectors = objectSelectors(program, definition.id, surface, state, scope);
  const context = viewInputs(definition).find(port => port.kind === "context");
  const visible = context?.kind === "context" && context.fields ? context.fields.map(field => field.field) : read.fields;
  const fields = readingFields(visible, state.detail.facts).filter(field => !selectors.some(selector => selector.field === field) &&
    !(typeof title !== "string" && title?.kind === "subject-title" && field === publication?.title.field));
  const media = context?.kind === "context" ? context.presentation : undefined;
  const signals=attention?.objectSignals[objectAttentionKey(read.subject,state.detail.id)];
  // Published identity belongs in the shared top toolbar, not duplicated in the body.
  return { kind: "context", details: presentFacts(surface, read.subject,
    fields, state.detail.facts, state.references), actions: [], ...(selectors.length ? { selectors } : {}),
    ...(signals?.length&&state.availability.journeys[read.id]?.dependenciesReady?{attention:signals}:{}),
    ...(media ? { presentation: { kind: "media-object" as const, media: media.media.field,
      ...(media.description && fields.includes(media.description.field) ? { description: media.description.field } : {}) } } : {}) };
}

export function projectView(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput, scope: ModelScope, related: RelatedReads = new Map(),
  profile?: { displayName?: string; now?: Date },attention?:AttentionSnapshot): ResolvedView {
  const bound: Record<string, ResolvedNode> = {};
  const pending: Record<string, Extract<FrameContent, { kind: "message" }>> = {};
  for (const port of viewInputs(definition)) {
    if (port.kind === "collection") {
      const binding = journey.kind === "presentation" ? journey.collections?.find(binding => binding.input === port.input) : undefined;
      const relation = journey.kind === "read" && definition.id === journey.detailView ? journey.related?.find(binding => binding.input === port.input) : undefined;
      const source = binding || relation ? related.get((binding ?? relation)!.read) : { journey, state, scope };
      if (!source) throw new Error("MISSING_OVERVIEW_READ");
      const subject = requireReadScope(source.scope).read.subject;
      const published = program.objects?.find(object => object.object === subject);
      const valueLabels: Record<string, Record<string, string>> = {};
      for (const action of published?.actions ?? []) if (action.selection) {
        const { fact, value, label } = action.selection;
        (valueLabels[fact.field] ??= {})[value] = label;
      }
      const records = binding ? source.state.records.filter(record => !binding.where || record.facts[binding.where.field] === binding.where.value).slice(0, binding.limit)
        : relation ? source.state.records.filter(record => {
          const value = record.facts[relation.where.field.field];
          return state.detail?.id === state.selectedId && Array.isArray(value) && value.includes(state.selectedId);
        }) : source.state.records;
      bound[port.input] = presentCollection(surface, records, {
      loaded: source.state.loaded && (!relation || Boolean(state.selectedId && state.detail?.id === state.selectedId)), selectedId: source.state.selectedId,
      connection: connectionPresentation(source.state.availability.journeys[source.journey.id]),
      disabled: state.busy || state.uncertain || (port.presentation?.kind!=='summary-widget' && !source.state.availability.journeys[source.journey.id]?.dependenciesReady),
    }, source.scope, port.presentation?.kind==='summary-widget' && binding?.summary ? {...port.presentation,...binding.summary,field:binding.summary.field.field,
      truncated:Boolean(binding&&source.state.records.length>binding.limit)} : port.presentation?.kind === "collection-grid" && binding?.preview ? {
      kind: "collection-grid", title: port.presentation.title.field,
      previews: records.map(record => {
        const preview = binding.preview!;
        const members = (related.get(preview.read)?.state.records ?? []).filter(member => {
          const memberships = member.facts[preview.where.field];
          return Array.isArray(memberships) && memberships.includes(record.id);
        });
        const chosen = preview.cover ? record.facts[preview.cover.field] : undefined;
        const images = members.filter(member => {
          const media = member.facts[preview.media.field];
          return Check(AssetReferenceSchema, media) && (!media.media || media.media === "image");
        });
        const cover = images.find(member => Array.isArray(chosen) && chosen.includes(member.id)) ?? images[0];
        const media = cover?.facts[preview.media.field];
        return { id: record.id, count: members.length, ...(Check(AssetReferenceSchema, media) ? { media } : {}) };
      }),
    } : port.presentation?.kind === "media-grid" ? { kind: "media-grid", image: port.presentation.image.field,
      ...(relation?.layout ? {layout: state.detail?.facts[relation.layout.field] === "list" ? "list" as const : "grid" as const} : {}),
      ...(port.presentation.fit ? { fit: port.presentation.fit.field } : {}),
      ...(port.presentation.description ? { description: port.presentation.description.field } : {}) } : undefined,
      port.fields?.map(field => field.field), valueLabels,source.state.availability.journeys[source.journey.id]?.dependenciesReady?
        Object.fromEntries(records.flatMap(record=>{const signals=attention?.objectSignals[objectAttentionKey(subject,record.id)];
          return signals?.length?[[record.id,signals]]:[];})):undefined);
    }
    else {
      const frame = presentFrame(surface, { ...state, view: port.kind === "form" ? journey.kind === "update" ? "edit" : "create" : "detail" }, validate, scope);
      if (frame.content.kind === "form" || frame.content.kind === "context") {
        bound[port.input] = resolvedNode({ version: ResolvedNodeVersion, kind: frame.content.kind,
          content: contextContent(program, definition, surface, state, frame.content, scope,attention) });
      } else if (frame.content.kind === "message") pending[port.input] = frame.content;
    }
  }
  const disabledOutputs = journey.outputs.filter(binding => {
    if (binding.view !== definition.id) return false;
    if (state.busy || state.uncertain) return true;
    const controls = [definition.topDock, definition.bottomDock].flatMap(toolbar =>
      toolbar?.actions.filter(action => action.output === binding.output) ?? []);
    if (controls.length && controls.every(action => action.disabled === true)) return true;
    if (binding.action.kind === "journey") {
      const targetId = binding.action.journey;
      const target = program.journeys.find(item => item.id === targetId);
      // Opening a browsing destination is local navigation. Its cached reading remains
      // available offline; selecting an uncached object and all writes stay gated below.
      return target?.kind !== "presentation" && target?.kind !== "read" && !state.availability.journeys[targetId]?.dependenciesReady;
    }
    if (binding.action.kind === "submit") {
      const primary = surface.journeys.find(item => item.id === journey.id);
      return primary?.kind !== "mutation" || !state.availability.journeys[journey.id]?.dependenciesReady ||
        !inspectMutationDraft(surface, primary, state.draft, validate).valid || (journey.kind === "update" &&
          (!state.editing || !subjectActionAvailable(surface, state, journey.id, state.editing.subject, undefined, scope)));
    }
    if (binding.action.kind === "select") {
      const port = viewInputs(definition).find(port => port.kind === "collection" && port.output === binding.output);
      const read = journey.kind === "presentation" ? journey.collections?.find(binding => binding.input === port?.input)?.read
        : journey.kind === "read" && definition.id === journey.detailView ? journey.related?.find(binding => binding.input === port?.input)?.read : journey.id;
      return !read || !state.availability.journeys[read]?.dependenciesReady;
    }
    return false;
  }).map(binding => binding.output);
  const action = (item: NonNullable<View["topDock"]>["actions"][number]) => {
    const binding = journey.outputs.find(binding => binding.view === definition.id && binding.output === item.output);
    const enabled = !item.disabled && !disabledOutputs.includes(item.output);
    const targetId = binding?.action.kind === 'journey' ? binding.action.journey : undefined;
    const dependency = targetId ? program.journeys.find(target => target.id === targetId)
      : binding?.action.kind === 'submit' ? journey : undefined;
    const reason = dependency && dependency.kind !== 'presentation' ? unavailableReason(state.availability.journeys[dependency.id]) : undefined;
    if (binding?.action.kind === "close") return toolbarAction({ kind: "close" }, item.label, item.icon, enabled);
    if (binding?.action.kind === "back") return toolbarAction({ kind: "back" }, item.label, "back", enabled);
    if (binding?.action.kind === "submit" && (journey.kind === "create" || journey.kind === "update")) {
      return { ...toolbarAction({ kind: "journey", journey: journey.id }, item.label, item.icon, enabled), ...(reason ? {reason} : {}) };
    }
    return { ...toolbarAction({ kind: "view.output", view: definition.id, output: item.output },
      item.label, item.icon, enabled), ...(reason ? {reason} : {}) };
  };
  const resolvedDefinition = resolveViewIdentity(program, journey, definition, surface, state, profile);
  const header = resolvedDefinition.content.find(item => item.kind === "header");
  const topActions = definition.topDock?.actions.map(action) ?? [];
  const subjectActions = publishedActionsFor(program, journey).filter(action => action.view === definition.id && !action.selection)
    .map(({ journey: id, icon }) => {
      const reason = unavailableReason(state.availability.journeys[id]);
      return { ...toolbarAction({ kind: "journey", journey: id },
        surface.language.journeys[id]!, icon, subjectActionAvailable(surface, state, id, undefined, undefined, scope)),
        ...(reason ? {reason} : {}) };
    });
  const bottomActions = definition.bottomDock?.actions.map(action) ?? [];
  const close = topActions.flatMap(item => item.intent.kind === "close" ? [{ ...item, intent: item.intent }] : [])[0];
  const back = topActions.flatMap(item => item.intent.kind === "back" ? [{ ...item, intent: item.intent }] : [])[0];
  const primary = bottomActions.flatMap(item => item.intent.kind !== "close" && item.intent.kind !== "back" ? [{ ...item, intent: item.intent }] : [])[0];
  const dependencies = journey.kind === 'presentation' ? journey.collections?.map(binding => binding.read) ?? [] : [journey.id];
  const missing = dependencies.map(id => state.availability.journeys[id]).find(value => !value?.dependenciesReady);
  const connection = missing ? {state:connectionPresentation(missing), label:unavailableReason(missing)!} : undefined;
  return {
    view: resolvedDefinition, bindings: bound, ...(Object.keys(pending).length ? { pending } : {}), disabledOutputs,
    ...(connection ? {connection} : {}),
    top: { title: header?.title ?? program.destinations.find(item => item.entryJourney === journey.id)?.label ?? program.label,
      ...(definition.topDock?.actionGroup ? {actionGroup:definition.topDock.actionGroup} : {}),
      ...(header?.subtitle ? { subtitle: header.subtitle } : {}),
      ...(close ? { leading: close } : back ? { leading: back } : {}),
      trailing: [...topActions.flatMap(item => item.intent.kind !== "close" && item.intent.kind !== "back" ? [{ ...item, intent: item.intent }] : []), ...subjectActions] },
    bottom: { ...(close ? { secondary: close } : {}), ...(primary ? { primary } : {}) },
  };
}

/** Canonical chrome and submit semantics surround the same admitted View sequence. */
export function projectViewPanel(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput, scope: ModelScope,attention?:AttentionSnapshot): ResolvedPanel {
  const canonical = presentFrame(surface, state, validate, scope);
  const presentation = (journey.kind === "create" || journey.kind === "update") && journey.presentation ? { presentation: journey.presentation } : {};
  if (state.view === "review" || state.view === "recovery") {
    return { ...presentation, frame: canonical, label: canonical.top.title, locked: state.busy || state.uncertain };
  }
  const resolved = projectView(program, journey, definition, surface, state, validate, scope,new Map(),undefined,attention);
  const primary = resolved.bottom?.primary;
  const bottom = { ...resolved.bottom, ...(primary && canonical.bottom.primary?.state === "pending"
    ? { primary: { ...primary, state: "pending" as const } } : {}) };
  const top = definition.content.some(item => item.kind === "header") ? resolved.top!
    : { ...resolved.top!, title: canonical.top.title };
  const frame = surfaceFrame({ ...canonical, content: contextContent(program, definition, surface, state, canonical.content, scope,attention),
    top, bottom });
  return { ...presentation, frame, body: resolved, label: frame.top.title, locked: state.busy || state.uncertain };
}
```

## src/svelte/catalog/renderer/view-product/ViewProduct.svelte

Source SHA-256: e8d6380e217a7765d15acedc3f4ebd1e5d794a7d018314ea5e0cb31a7e393d6f

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { ViewProductContent } from "../../index.ts";

  let { program, surface, validateInput, access }: CatalogProps<"view-product"> = $props();
</script>

<ViewProductContent {program} {surface} {validateInput} {access} />
```

## src/svelte/catalog/renderer/workspace/Workspace.svelte

Source SHA-256: fe42fb417d97e8fc90ad1aad1885739123c35077b692be14e961ca235127df56

```svelte
<script lang="ts">
  import { ViewWorkspace } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let props: CatalogProps<"workspace"> = $props();
</script>

<ViewWorkspace program={props.program} activeDestination={props.activeDestination}
  resolved={props.resolved} panel={props.panel} error={props.error} uncertain={props.uncertain}
  onevent={props.onevent} onnavigate={props.onnavigate} />
```

## src/svelte/catalog/compositions/view-workspace/workspace-data.ts

Source SHA-256: 577cc4e9dc4362933b80ac1054ed697d9ea88f63a37147ea61fab82baf092406

```ts
import type { ResolvedView } from "../../../../views/resolved.ts";
import type { ViewItem } from "../../../../views/schema.ts";
import type { NodeEvent } from "../../../../interaction/node-events.ts";
import type { PlaceIdentity } from "../../../infra/place-identity.ts";
import type { WorkspaceSearchResult } from "../../../infra/workspace-search.ts";
import { catalogTitle, matchingEntries } from "../../../infra/catalog-entries.ts";
import { retrieveCollection } from "../../../collection-retrieval.ts";
import { presentFact, presentTitle } from "../../../../interaction/fact-presentation.ts";
import { say } from "../../../infra/messages.ts";
import { m } from "../../../../messages/keys.ts";

/** Data adapter only: identity, search results and the selection a result makes. Geometry, focus and motion are the shell's. */
export function viewIdentity(resolved: ResolvedView, fallback: string): PlaceIdentity {
  const header = resolved.view.content.find(item => item.kind === "header");
  return header ? { ...header, subtitle: header.subtitle ?? "" }
    : { title: resolved.top?.title ?? fallback, subtitle: resolved.top?.subtitle ?? "" };
}

const contentItems = (resolved: ResolvedView): readonly ViewItem[] => resolved.view.content.flatMap(item =>
  item.kind === "stack" ? item.items : item.kind === "header" || item.kind === "visual-catalog" || item.kind === "media-library" ||
    item.kind === "navigation" || item.kind === "destination" || item.kind === "appearance" || item.kind === "identity" || item.kind === "attention" ? [] : [item]);
const recordKey = (item: string, record: string) => JSON.stringify([item, record]);

export function viewSearchResults(resolved: ResolvedView, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results: WorkspaceSearchResult[] = resolved.view.content.some(item => item.kind === "visual-catalog") ? matchingEntries(query).map(entry => ({
    kind: "bank", id: entry.id, title: catalogTitle(entry.id), description: say(m.viewWorkspace.entry, { id: entry.id, states: entry.states.join(", ") }),
  })) : [];
  const matches = (values: readonly unknown[]) => terms.every(term => values.join(" ").toLowerCase().includes(term));
  for (const item of resolved.view.content) {
    if (item.kind !== "stack") continue;
    const description = item.description ?? item.items.flatMap(child => child.kind === "text" ? [child.text] : []).join(" ");
    if (matches([item.title, description])) results.push({ kind: "content", id: item.id, title: item.title, description });
  }
  for (const item of contentItems(resolved)) {
    if (item.kind !== "collection") continue;
    const node = resolved.bindings[item.input];
    if (node?.kind !== "collection" || !node.loaded || node.disabled) continue;
    if (node.presentation?.kind === "media-grid") {
      const presentation = node.presentation;
      for (const record of node.records) {
        const asset = record.facts[presentation.image];
        const title = typeof asset === 'object' && asset !== null && 'media' in asset && asset.media === 'video' ? say(m.viewWorkspace.video)
          : typeof asset === 'object' && asset !== null && 'media' in asset && asset.media === 'audio' ? say(m.viewWorkspace.audio)
          : say(m.viewWorkspace.image);
        const detail = presentation.description ? record.facts[presentation.description] : undefined;
        const description = typeof detail === 'string' ? detail : '';
        if (matches([title, description])) results.push({kind:'content',id:recordKey(item.id,record.id),title,description});
      }
      continue;
    }
    if (node.presentation?.kind === "collection-grid") {
      for (const record of node.records) {
        const title = presentTitle(record.facts[node.presentation.title]);
        if (matches([title])) results.push({kind:'content',id:recordKey(item.id,record.id),title,description:say(m.viewWorkspace.collection)});
      }
      continue;
    }
    for (const record of retrieveCollection(node.records, node.fields, query)) {
      results.push({ kind: "content", id: recordKey(item.id, record.id),
        title: presentTitle(record.facts[node.fields[0]!]),
        description: node.fields.slice(1).map(field => presentFact(record.facts[field])).join(" · ") });
    }
  }
  return results;
}

export function viewSearchSelection(resolved: ResolvedView, id: string): NodeEvent | null {
  for (const item of contentItems(resolved)) {
    if (item.kind !== "collection" || resolved.disabledOutputs.includes(item.output)) continue;
    const node = resolved.bindings[item.input];
    if (node?.kind !== "collection" || !node.loaded || node.disabled) continue;
    const record = node.records.find(record => recordKey(item.id, record.id) === id);
    if (record) return { kind: "surface.invoke", intent: {
      kind: "view.output", view: resolved.view.id, output: item.output, recordId: record.id,
    } };
  }
  return null;
}
```

## src/svelte/infra/media-data.ts

Source SHA-256: 382c55593be07535e4e1e4225e2f0e791bad1f283348f77520c3192239329582

```ts
import { ResolvedNodeVersion } from "../../interaction/resolved-node.ts";
import type { CatalogHomeNode, CatalogItemNode } from "../../public-catalog/node-schema.ts";
import { mediaArtwork, type MediaItem, type MediaLibrary } from "../../views/media-library.ts";
import type { ResolvedView } from "../../views/resolved.ts";
import type { PlaceIdentity } from "./place-identity.ts";
import type { WorkspaceSearchResult } from "./workspace-search.ts";

export const viewMedia = (resolved: ResolvedView) =>
  resolved.view.content.find(item => item.kind === "media-library")?.library;
export const mediaAlbum = (library: MediaLibrary, album: string | null) =>
  library.albums.find(item => item.id === album);
export function mediaItems(library: MediaLibrary, album: string | null): readonly MediaItem[] {
  const selected = mediaAlbum(library, album);
  return selected ? selected.items.map(id => library.items.find(item => item.id === id)!) : library.items;
}
export function mediaIdentity(library: MediaLibrary, album: string | null, home: PlaceIdentity): PlaceIdentity {
  const selected = mediaAlbum(library, album);
  const items = selected ? mediaItems(library, album) : library.featured.map(id => {
    const cover = library.albums.find(item => item.id === id)!.cover;
    return library.items.find(item => item.id === cover)!;
  });
  const images = items.flatMap(item => { const image = mediaArtwork(item); return image ? [image] : []; });
  const noun = items.every(item => item.kind === "image") ? "image" : "item";
  return {
    ...(selected ? { title: selected.title, subtitle: `${items.length} ${noun}${items.length === 1 ? "" : "s"}` } : home),
    ...(images.length ? { media: { kind: "gallery" as const, images } } : {}),
  };
}
function mediaCard(item: MediaItem): CatalogItemNode {
  const base = { version: ResolvedNodeVersion, kind: "catalog.card" as const, presentation: "item" as const,
    record: `${item.kind}.${item.id}`, title: item.title };
  return item.kind === "image" ? { ...base, image: item.image } : {
    ...base, mediaType: item.kind, ...(item.artwork ? { image: item.artwork } : {}),
  };
}
/** Catalog data projection only: existing owners keep every visual and interaction rule. */
export function mediaContent(library: MediaLibrary, album: string | null): CatalogHomeNode {
  const items = mediaItems(library, album);
  const albums = library.albums.map(item => ({ ...mediaCard(library.items.find(media => media.id === item.cover)!),
    record: `album.${item.id}`, title: item.title }));
  const kinds = [{ kind: "image", title: "Images" }, { kind: "video", title: "Videos" }, { kind: "audio", title: "Music" }];
  const groups = [
    ...(album ? [] : [{ id: "albums", title: "Albums", items: albums }]),
    ...kinds.flatMap(({ kind, title }) => {
      const matches = items.filter(item => item.kind === kind).map(mediaCard);
      return matches.length ? [{ id: kind, title, items: matches }] : [];
    }),
  ];
  return { version: ResolvedNodeVersion, kind: "catalog.home", groups,
    featured: { ...groups[0]!.items[0]!, presentation: "featured", eyebrow: "Media", actionLabel: "Open" } };
}
export function mediaTarget(library: MediaLibrary, record: string) {
  const album = library.albums.find(item => `album.${item.id}` === record);
  if (album) return { kind: "album" as const, album };
  const item = library.items.find(item => `${item.kind}.${item.id}` === record);
  return item ? { kind: "item" as const, item } : null;
}
export function mediaResults(library: MediaLibrary, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results = [
    ...library.albums.map(album => ({ id: `album.${album.id}`, title: album.title,
      description: `Album · ${album.items.length} items` })),
    ...library.items.map(item => ({ id: `${item.kind}.${item.id}`, title: item.title,
      description: item.kind === "image" ? "Image" : item.kind === "video" ? "Video" : "Music" })),
  ];
  return results.filter(item => terms.every(term => item.title.toLocaleLowerCase().includes(term)))
    .map(item => ({ kind: "content" as const, ...item }));
}
```

## src/svelte/catalog/renderer/media-content/MediaContent.svelte

Source SHA-256: 43ac0c7c5e8a68eb1a7683b8435156f6819fa6c66c4641f6f4fd8975491df663

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Library } from "../../index.ts";
  let { library, album, onalbum }: CatalogProps<"media-content"> = $props();
  let content = $state<{ select: (record: string) => boolean }>();
  export function select(record: string) { return content?.select(record) ?? false; }
</script>

<Library {library} {album} {onalbum} bind:this={content} />
```

## src/svelte/catalog/compositions/catalog-workspace/CatalogWorkspace.svelte

Source SHA-256: 824569ee5bfce01155070663369d3c8e9377accb02c77e4456cb6f41ec9a6680

```svelte
<script lang="ts">
  import { tick } from "svelte";
  import { Bar, CatalogSearchResults, CatalogWorkspaceContent, FailureDialog, Panel, PlaceHeading, Shell, Toolbar } from "../../index.ts";
  import { provideDestinationNavigation } from "../../../infra/destination-navigation.svelte.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { workspaceNavigation } from "../../../infra/workspace-navigation.ts";
  import type { BarCommand } from "../../../infra/bar-command.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { documentTitle, navigationSurface, title, navigation, active, query, searching, identity, content: body, searchContent,
    detail = false, backAvailable = true, searchAvailable = true, topActions = [], actionGroup, invoke, panelState, bottomToolbar,
    onquery, onnavigate, onsearch, oncancel, onback }: CatalogProps<"catalog-workspace"> = $props();
  // One focus scope for the whole workspace; a caller that opened one above it (to return focus by key itself) shares it.
  const scope = useFocusScope() ?? provideFocusScope();
  let shell = $state<ReturnType<typeof Shell>>();
  const uid = $props.id(), resultsId = `${uid}-results`;
  // A page opened inside a destination (a bank entry) returns where it was opened: the scroll offset and the piece last
  // activated, else the place title.
  const pages = provideDestinationNavigation(() => active, () => ({ focusKey: scope.lastActivated(), scroll: shell?.scrollTop() ?? 0 }),
    change => void tick().then(() => {
      if (change.destination !== active || !shell) return;
      if (change.kind === "back") shell.restoreScroll(change.origin.scroll, shell.scrollPositions().search);
      else shell.scrollToTop();
      const returned = change.kind === "back" && change.origin.focusKey !== null && scope.focus(change.origin.focusKey);
      if (!returned) shell.focusTitle();
    }));
  let presented = $derived(pages.current(active));
  let shown = $derived(presented?.identity ?? identity);
  let showsDetail = $derived(Boolean(presented) || detail);
  let canGoBack = $derived(Boolean(presented) || backAvailable);
  const goBack = () => presented ? pages.back(active) : onback?.();
  let back: BarCommand = $derived({ label: say(m.catalogWorkspace.back), icon: "back", state: canGoBack ? "ready" : "unavailable",
    intent: { kind: "back" } });
  /** The content bar's leading Back goes back here; every other command is the place's. */
  function command(intent: SurfaceIntent) {
    if (intent.kind !== "back") invoke?.(intent);
    else if (canGoBack) goBack();
  }
  let searchField = $derived({ title, query, open: searching, resultsId });
  let shellNavigation = $derived(navigationSurface === null ? null : {
    identity: navigationSurface.subtitle ? { title: navigationSurface.title, subtitle: navigationSurface.subtitle } : { title: navigationSurface.title },
    settingsPlaceholder: navigationSurface.settingsPlaceholder === true, active,
    groups: workspaceNavigation(navigation).map(group => ({ label: group.label,
      items: group.items.map(({ id, label, icon, appearance }) => ({ id, label, icon, appearance })) })),
  });
  export function scrollToTop(): void { shell?.scrollToTop(); }
  export function scrollTop(): number { return shell?.scrollTop() ?? 0; }
  export function focusTitle(): void { shell?.focusTitle(); }
  export function focusContent(): void { shell?.focusContent(); }
  export function restoreRecord(top: number, view: string, record: string): void { shell?.restoreRecord(top, view, record); }
  export function revealItem(id: string): Promise<boolean> { return shell?.revealItem(id) ?? Promise.resolve(false); }
  export function scrollPositions(): { content: number; search: number } { return shell?.scrollPositions() ?? { content: 0, search: 0 }; }
  export function restoreScroll(contentTop: number, searchTop: number): void { shell?.restoreScroll(contentTop, searchTop); }
  export function focus(key: string): boolean { return scope.focus(key); }
  export function toggleNavigation(): void { shell?.toggleNavigation(); }
</script>

<Shell bind:this={shell} {documentTitle} label={shown.title} destination={active} {searching} hasQuery={query.trim() !== ""}
  detail={showsDetail} backAvailable={canGoBack} {resultsId} searchLabel={say(m.catalogWorkspace.searchRegion, { title })} navigation={shellNavigation}
  onnavigate={id => onnavigate?.(id)} onback={goBack} oncancelsearch={() => oncancel?.()}>
  {#snippet top()}
    <Bar edge="top" purpose="commands" layer="content" inert={searching} identity={{ title: shown.title, subtitle: shown.subtitle }}
      identityRole="continuation" leading={showsDetail ? back : undefined} trailing={topActions} group={actionGroup}
      search={searchAvailable ? searchField : undefined} settingsPlaceholder={false} oninvoke={command} />
    {#if searchAvailable}
      <Bar edge="top" purpose="commands" layer="search" identityRole="heading" trailing={[]} search={searchField} settingsPlaceholder={false}
        inert={false} onquery={value => onquery?.(value)} onsearchopen={() => onsearch?.()} onsearchcancel={() => oncancel?.()} />
    {/if}
  {/snippet}
  {#snippet content()}
    <PlaceHeading context="place" title={shown.title} subtitle={shown.subtitle} media={shown.media} />
    <CatalogWorkspaceContent content={body} {searching} />
  {/snippet}
  {#snippet bottom()}
    {#if bottomToolbar && invoke && (bottomToolbar.primary || bottomToolbar.secondary)}
      <Toolbar toolbar={{ edge: "bottom", ...bottomToolbar }} {invoke} />
    {/if}
  {/snippet}
  {#snippet search()}
    {#if searchContent?.kind === "catalog"}
      {@const found = searchContent}
      <CatalogSearchResults title={found.title} description={found.description} {query} results={found.results}
        onselect={result => { if (result.kind !== "content") found.onselect(result); }} />
    {:else if searchContent?.kind === "view"}
      <CatalogSearchResults title={searchContent.title} description={searchContent.description} {query} results={searchContent.results}
        onselect={searchContent.onselect} />
    {/if}
  {/snippet}
  {#snippet panels()}
    {#if panelState}
      <Panel panel={panelState.panel} onevent={panelState.onevent} />
      <FailureDialog code={panelState.error} uncertain={panelState.uncertain} close={panelState.dismissError} />
    {/if}
  {/snippet}
</Shell>
```

## src/svelte/catalog/foundations/shell/Shell.svelte

Source SHA-256: e312f376a0455c0f89e1e44919590402a4922daf4df97bfb1bc4b23b05d4668b

```svelte
<script lang="ts">
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Wallpaper } from "../../index.ts";
  import { appearance } from "../../../infra/appearance-state.ts";
  import { provideFocusScope, useFocusScope } from "../../../infra/focus-scope.ts";
  import { provideRegionRegistry, useRegionRegistry } from "../../../infra/region-registry.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  import { nativeFilePicker } from "../../mechanisms/file-picker/file-picker.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import ShellBody from "./ShellBody.svelte";
  let { documentTitle, label, destination, searching, hasQuery, detail, backAvailable, resultsId, searchLabel, navigation,
    onnavigate, onback, oncancelsearch, oncomposition, top, content, bottom, search, panels }: CatalogProps<"shell"> = $props();
  // Pieces in the workspace register focus targets and reveals here (a caller may open them above the shell instead).
  const scope = useFocusScope() ?? provideFocusScope();
  const regions = useRegionRegistry() ?? provideRegionRegistry();
  // The workspace file host (when the product provides one) opens the browser chooser through the file-picker mechanism.
  const files = useFileHost();
  $effect(() => files?.offerChooser(nativeFilePicker));
  let workspace = $state<HTMLElement | null>(null);
  let body = $state<ReturnType<typeof ShellBody>>();
  export function scrollToTop(): void { body?.scrollToTop(); }
  export function scrollTop(): number { return body?.scrollTop() ?? 0; }
  export function focusTitle(): void { body?.focusTitle(); }
  export function focusContent(): void { body?.focusContent(); }
  export function restoreRecord(top: number, view: string, record: string): void { body?.restoreRecord(top, view, record); }
  export function revealItem(id: string): Promise<boolean> { return body?.revealItem(id) ?? Promise.resolve(false); }
  export function scrollPositions(): { content: number; search: number } { return body?.scrollPositions() ?? { content: 0, search: 0 }; }
  export function restoreScroll(content: number, search: number): void { body?.restoreScroll(content, search); }
  export function focus(key: string): boolean { return body?.focusKey(key) ?? false; }
  export function toggleNavigation(): void { body?.toggleNavigation(); }
</script>

<svelte:head><title>{documentTitle}</title></svelte:head>

<div bind:this={workspace} data-renderer-profile="apple-reference" data-catalog-workspace data-search-active={searching}>
  <Wallpaper wallpaper={$appearance.wallpaper} />
  <Sidebar.Provider available={navigation !== null} contentMinWidth="45rem" style="--sidebar-width:var(--catalog-sidebar-width)">
    <ShellBody bind:this={body} root={() => workspace} {label} {destination} {searching} {hasQuery} {detail} {backAvailable} {resultsId} {searchLabel}
      {navigation} {scope} {regions} {onnavigate} {onback} {oncancelsearch} {oncomposition} {top} {content} {bottom} {search} {panels} />
  </Sidebar.Provider>
</div>
```

## src/svelte/catalog/foundations/shell/ShellNavigation.svelte

Source SHA-256: b9e076b7dd212d8b7ec3fc83ce59fce0986004d8e12377bff380616a23c6c520

```svelte
<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Shell part (from the catalog-navigation composition): the navigation pane, its identity bar, the destination groups
  // drawn from data, the toggle that hides it and the settings placeholder. Dragging the pane's header toward its edge,
  // or swiping the pane, dismisses it. Docked, it is the sidebar; over a workspace with no room to dock it, it is the
  // navigation Modal, which an edge swipe (CatalogEdgeNavigation) may reveal under the pointer before it opens.
  import { untrack } from "svelte";
  import * as Sidebar from "../../../vendor/components/ui/sidebar/index.js";
  import { Bar, Icon, Modal, Surface } from "../../index.ts";
  import { provideCloseFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { swipeMotion } from "../../mechanisms/swipe-motion/swipe-motion.svelte.ts";
  import type { ShellNavigation } from "../../../infra/workspace-navigation.ts";
  import { navigationIconNames } from "./navigation-icons.ts";
  let { navigation, searching, onnavigate }: { navigation: ShellNavigation; searching: boolean; onnavigate: (id: string) => void } = $props();
  const sidebar = Sidebar.useSidebar();
  // Closing the overlay returns focus where the sidebar decides (the control that opened it, or its equivalent).
  provideCloseFocus(sidebar.handleCloseAutoFocus);
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  function navigate(id: string) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  // The pane's top bar is the drag handle (the bar itself takes no drag; DESIGN §3.2). Presses on its controls stay theirs.
  const down = (event: PointerEvent) => {
    if (event.target instanceof Element && event.target.closest("button,a,input,select,textarea")) return;
    motion.down(event);
  };
  const handlers = [["pointerdown", down], ["pointermove", motion.move], ["pointerup", motion.up], ["pointercancel", motion.cancel],
    ["lostpointercapture", motion.lost]] as const;
  $effect(() => {
    sidebar.presentation; sidebar.expanded; sidebar.revealing;
    let header: HTMLElement | null = null;
    // The pane mounts in this update (docked, in its overlay modal, or drawn by an edge swipe): attach once it is drawn.
    const frame = requestAnimationFrame(() => {
      header = document.getElementById(sidebar.panelId)?.querySelector<HTMLElement>('[data-catalog-navigation] > [data-toolbar="top"]') ?? null;
      if (!header) return;
      header.dataset.navigationDrag = "true";
      for (const [type, handler] of handlers) header.addEventListener(type, handler);
    });
    return () => {
      cancelAnimationFrame(frame);
      if (!header) return;
      delete header.dataset.navigationDrag;
      for (const [type, handler] of handlers) header.removeEventListener(type, handler);
    };
  });
</script>

{#snippet pane()}
<Surface kind="navigation" label={say(m.shell.navigation)} searching={false}>
  {#snippet top()}
    <Bar edge="top" purpose="navigation" identity={navigation.identity} identityRole="heading" trailing={[]} settingsPlaceholder={false} inert={false} />
  {/snippet}
  {#snippet content()}
    <div>
      {#each navigation.groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each group.items as destination (destination.id)}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === navigation.active} aria-current={destination.id === navigation.active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.appearance} aria-hidden="true"><Icon name={navigationIconNames[destination.icon]} /></span>
              <span>{destination.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu></Sidebar.GroupContent></Sidebar.Group>
      {/each}
    </div>
  {/snippet}
  {#snippet bottom()}
    <!-- The pane's toggle is interactive only while the pane is shown (it is inert otherwise), so it always hides it.
         Feeding the sidebar's own expanded state into the bar here stalls that state's derivation (Svelte 5.57). -->
    <Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]} navigationToggle={{ expanded: true, controls: sidebar.panelId }}
      settingsPlaceholder={false} inert={searching} onnavigationtoggle={sidebar.toggle} />
    {#if navigation.settingsPlaceholder}
      <Bar edge="bottom" purpose="navigation" identityRole="heading" trailing={[]} settingsPlaceholder inert={false} />
    {/if}
  {/snippet}
</Surface>
{/snippet}

{#if sidebar.presentation === "overlay"}
  <Modal label={say(m.shell.navigationTitle)} open={sidebar.overlayOpen} locked={false} presentation="navigation"
    navigation={{ panel: sidebar.panelId, reveal: sidebar.revealOffset ?? undefined, dismissOffset: sidebar.dismissOffset, gesture: sidebar.revealedByGesture }}
    ondismiss={() => sidebar.setOverlayOpen(false)}>{@render pane()}</Modal>
{:else}
  <Sidebar.Root variant="floating">{@render pane()}</Sidebar.Root>
{/if}
```

## src/svelte/catalog/foundations/bar/BarSearch.svelte

Source SHA-256: 74f2df652e477bb48a7a150566ac366ef49ca593680e80fe7951a3af2aa2d69d

```svelte
<script lang="ts">
  // Bar part (from the toolbar-search composition): the place search field, revealed by a toggle that also closes it.
  // Opening focuses the field; the displayed query freezes while closed so the field does not change as it hides.
  import { untrack } from "svelte";
  import { Action, Field } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { title, query, open, resultsId, onquery, onopen, oncancel }: {
    title: string; query: string; open: boolean; resultsId: string;
    onquery: (query: string) => void; onopen: () => void; oncancel: () => void;
  } = $props();
  const id = $props.id();
  // The field takes focus when this toggle opened it (not when the bar mounts with the search already open).
  let opened = $state(false);
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (open) displayedQuery = query; else opened = false; });
  function toggle() {
    if (open) { oncancel(); return; }
    opened = true; onopen();
  }
</script>

<div data-catalog-search-actions data-expanded={open}>
  <!-- The well stays mounted while closed (inert, so it takes no focus) so its width animates open. -->
  <div data-catalog-search inert={!open} aria-hidden={!open}>
    <Field primitive="input.text" purpose="search" label={say(m.bar.searchLabel, { title: title.toLowerCase() })} labelVisibility="accessible"
      required={false} invalid={false} disabled={false} measure="fill" value={displayedQuery} placeholder={say(m.bar.searchPlaceholder, { title })}
      clear={false} controls={open ? resultsId : undefined} focus={open && opened ? "on-mount" : undefined} onchange={onquery} />
  </div>
  <!-- The old toggle cross-faded its search and close glyphs; Action shows one glyph per state (no motion package yet). -->
  <div class="toolbar-action" data-search-toggle>
    <Action label={open ? say(m.bar.closeSearch) : say(m.bar.search)} icon={open ? "close" : "search"} face="icon" emphasis="secondary" state="ready"
      type="button" onclick={toggle} disclosure={{ id: `${id}-toggle`, controls: resultsId, expanded: open, haspopup: "listbox" }} />
  </div>
</div>
```

## src/svelte/infra/workspace-navigation.ts

Source SHA-256: b40a436d4061f214b925f5878a86071b31adcf3b5fefcaf6cdc8c7f9a6a185d5

```ts
import { Type, type Static } from "@sinclair/typebox";
import { ActionIconSchema } from "../../interaction/action-icon.ts";
import type { ViewNavigationEntry } from "../../views/program-schema.ts";
import { text } from "../../views/definition.ts";
import type { Frozen } from "../../json.ts";

/** Renderer-owned navigation data. No component, CSS or layout escape hatches. */
export const WorkspaceIconSchema = Type.Union([ActionIconSchema, Type.Literal("landmark"), Type.Literal("backpack"), Type.Literal("panels")]);
export type WorkspaceIcon = Static<typeof WorkspaceIconSchema>;
const closed = { additionalProperties: false } as const;
/** The navigation pane the shell draws (DESIGN §3.2): its identity, the active destination and the grouped destinations
 * `workspaceNavigation` resolves. */
export const ShellNavigationSchema = Type.Object({
  identity: Type.Object({ title: text, subtitle: Type.Optional(text) }, closed),
  settingsPlaceholder: Type.Boolean(),
  active: Type.String(),
  groups: Type.Array(Type.Object({
    label: text,
    items: Type.Array(Type.Object({ id: Type.String(), label: text, icon: WorkspaceIconSchema,
      appearance: Type.Union([Type.Literal("browse"), Type.Literal("travel-kit"), Type.Literal("bank")]) }, closed)),
  }, closed)),
}, closed);
export type ShellNavigation = Frozen<Static<typeof ShellNavigationSchema>>;
export interface WorkspaceDestination<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly shortLabel?: string;
  readonly icon?: WorkspaceIcon;
  readonly group?: string;
  readonly purpose?: ViewNavigationEntry["purpose"];
}

const legacy = {
  browse: { icon: "landmark", group: "Explore", appearance: "browse" },
  "travel-kit": { icon: "backpack", group: "Explore", appearance: "travel-kit" },
  bank: { icon: "panels", group: "Developer", appearance: "bank" },
} as const;
type ResolvedDestination<Id extends string> = WorkspaceDestination<Id> & {
  readonly icon: WorkspaceIcon; readonly appearance: "browse" | "travel-kit" | "bank";
};

export function workspaceNavigation<Id extends string>(navigation: readonly WorkspaceDestination<Id>[]) {
  const groups: { label: string; items: ResolvedDestination<Id>[] }[] = navigation.every(item => item.purpose) ? [] : [
    { label: "Explore", items: [] }, { label: "Developer", items: [] },
  ];
  for (const destination of navigation) {
    if (destination.purpose) {
      if (!destination.group || !destination.icon) throw new Error("WORKSPACE_NAVIGATION_METADATA_REQUIRED");
      let group = groups.find(item => item.label === destination.group);
      if (!group) { group = { label: destination.group, items: [] }; groups.push(group); }
      group.items.push({ ...destination, icon: destination.icon, appearance: destination.purpose === "utility" ? "bank" : "browse" });
      continue;
    }
    // Frozen catalog clients predate authored navigation. Their legacy adapter is
    // not used by a View program, whose closed contract requires purpose/group.
    const defaults = destination.id === "browse" ? legacy.browse
      : destination.id === "travel-kit" ? legacy["travel-kit"]
      : destination.id === "bank" ? legacy.bank : undefined;
    const icon = destination.icon ?? defaults?.icon;
    if (!icon) throw new Error("WORKSPACE_NAVIGATION_ICON_REQUIRED");
    const appearance = icon === "catalog" || icon === "panels" ? "bank" : icon === "backpack" ? "travel-kit" : "browse";
    const label = destination.group ?? defaults?.group ?? (appearance === "bank" ? "Developer" : "Explore");
    let group = groups.find(item => item.label === label);
    if (!group) { group = { label, items: [] }; groups.push(group); }
    group.items.push({ ...destination, icon, appearance });
  }
  return groups;
}
```

## src/svelte/infra/workspace-search.ts

Source SHA-256: 5f07832f9e2e5889e1f83e90ae9810d94e73857c419b50041d1a03f0170fdf15

```ts
import type { CatalogSearchResult } from "./catalog-search.ts";

/** Shared search rows. Providers own data and activation, never their appearance. */
export type WorkspaceSearchResult = CatalogSearchResult |
  { readonly kind: "content"; readonly id: string; readonly title: string; readonly description: string };
```

## src/svelte/catalog/renderer/view-content/ViewContent.svelte

Source SHA-256: 24fff3c7a614e0bff6019b5bdabbd0c7be789bbd8573abd01c91425bd8f3798a

```svelte
<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { ContentFlow } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { resolved, onevent, album = null, onalbum, onactions }: CatalogProps<"view-content"> = $props();
  let flow = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean>; revealAndFocusEntry: (id: ResolvedNodeId) => Promise<boolean>;
    selectMedia: (record: string) => boolean }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await flow?.revealEntry(id) ?? false; }
  export function selectMedia(record: string): boolean { return flow?.selectMedia(record) ?? false; }
  // The workspace reaches a retained view's bank and library through what it registers here (null once it unmounts).
  $effect(() => {
    const register = onactions;
    register?.({ revealEntry: async id => { await flow?.revealAndFocusEntry(id); }, selectMedia });
    return () => register?.(null);
  });
</script>

<ContentFlow {resolved} {onevent} {album} {onalbum} bind:this={flow} />
```

## src/svelte/catalog/renderer/view-item/ViewItem.svelte

Source SHA-256: dd014833d2651cf7ba2f8db729928bc2c89df258a81f114ec86f448b80f75b17

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Information, TextContent, ViewBinding, ViewDestinationLink } from "../../index.ts";
  let { item, resolved, onevent, host = "flow" }: CatalogProps<"view-item"> = $props();
</script>

{#if item.kind === "text"}
  <TextContent text={item.text} />
{:else if item.kind === "fact"}
  <Information items={[item]} />
{:else if item.kind === "destination-link"}
  <ViewDestinationLink view={resolved.view.id} output={item.output} label={item.label} icon={item.icon}
    reason={resolved.disabledOutputs.includes(item.output) ? resolved.connection?.label : undefined}
    available={!resolved.disabledOutputs.includes(item.output)} {onevent} />
{:else if item.kind === "tag" || item.kind === "image" || item.kind === "avatar" || item.kind === "collection" || item.kind === "form" || item.kind === "context"}
  <ViewBinding {item} {resolved} {onevent} {host} />
{/if}
```

## src/svelte/catalog/compositions/view-binding/ViewBinding.svelte

Source SHA-256: c248643c89bf0dc15b6bf713393e89e40e34e36a8cc0fe50a18557f4f6ff7e93

```svelte
<script lang="ts">
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { stackPlacement } from "../../../infra/stack-placement.ts";
  import { NodeRenderer, StackItem, SummaryWidget, Text } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { item, resolved, onevent, host = "flow" }: CatalogProps<"view-binding"> = $props();
  /** What the item shows: its own control node (a tag, image or avatar), the summary of its bound collection, its bound node,
   * the message of an input still pending, or nothing yet. A binding of another kind than the item fails loudly. */
  let bound = $derived.by(() => {
    if (item.kind === "tag" || item.kind === "image" || item.kind === "avatar") return { kind: "control", node: controlResolvedNode(item) } as const;
    const node = resolved.bindings[item.input], pending = resolved.pending?.[item.input];
    if ((!node && !pending) || node && node.kind !== item.kind) throw new Error("INVALID_VIEW_INPUT_BINDING");
    if (item.kind === "collection" && item.presentation?.kind === "summary-widget") {
      return node?.kind === "collection" ? { kind: "summary", node, output: item.output } as const : { kind: "none" } as const;
    }
    if (node) return { kind: "node", node } as const;
    return pending ? { kind: "pending", text: pending.text } as const : { kind: "none" } as const;
  });
  /** A record chosen in a bound collection opens the collection's output, unless that output is disabled. */
  function dispatch(event: NodeEvent) {
    if (item.kind !== "collection" || event.kind !== "collection.select") { onevent?.(event); return; }
    if (!resolved.disabledOutputs.includes(item.output)) onevent?.({ kind: "surface.invoke", intent: {
      kind: "view.output", view: resolved.view.id, output: item.output, recordId: event.id,
    } });
  }
  const open = (output: string) => onevent?.({ kind: "surface.invoke", intent: { kind: "view.output", view: resolved.view.id, output } });
</script>

{#if bound.kind === "control"}
  <StackItem placement={stackPlacement(bound.node.kind)} kind={bound.node.kind}><NodeRenderer node={bound.node} /></StackItem>
{:else if bound.kind === "summary"}
  <SummaryWidget node={bound.node} available={!resolved.disabledOutputs.includes(bound.output)} activate={() => open(bound.output)} />
{:else if bound.kind === "pending"}
  <Text kind="body" align="start" live="polite" text={bound.text} />
{:else if bound.kind === "node" && host === "frame"}
  <NodeRenderer node={bound.node} onevent={dispatch} />
{:else if bound.kind === "node"}
  <StackItem placement={stackPlacement(bound.node.kind)} kind={bound.node.kind}><NodeRenderer node={bound.node} onevent={dispatch} /></StackItem>
{/if}
```

## src/svelte/catalog/renderer/panel/Panel.svelte

Source SHA-256: ab5aad4476c2a4f8bc99b858f29c87f0cec22b4ec840071dceb95bcc100fd1d5

```svelte
<script lang="ts">
  import { tick, untrack } from "svelte";
  import { bindViewEvents, type OwnedResolvedPanel, type ViewEventOwner } from "../../../../web/client/view-events.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { ViewPanel } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { panel, onevent }: CatalogProps<"panel"> = $props();
  let mounted = $state.raw<OwnedResolvedPanel | null>(null);
  let open = $state(false);
  let revision = 0;
  $effect(() => {
    const next = panel;
    const current = ++revision;
    untrack(() => {
      if (next) {
        const firstMount = mounted === null;
        mounted = next;
        // The shared modal must observe closed → open, just like the stable
        // retained bank specimen. Do not mount it already at its final state.
        if (firstMount) void tick().then(() => { if (revision === current) open = true; });
        else open = true;
      }
      else open = false;
    });
  });
  function dispatch(owner: ViewEventOwner) {
    const send = bindViewEvents(owner, value => onevent?.(value));
    return (event: NodeEvent) => {
      if (event.kind === "transient.closed" && !panel && mounted?.owner === owner) mounted = null;
      send(event);
    };
  }
</script>

{#each mounted ? [mounted] : [] as current}
  <ViewPanel panel={current} {open} continuity={current.owner.key} onevent={dispatch(current.owner)} />
{/each}
```

## src/svelte/catalog/renderer/inspection-content/InspectionContent.svelte

Source SHA-256: 2a90aa02e8124fa7702c99cffdc9e2b7c51a0b85b347db3b6807d1cc6aaa89bb

```svelte
<script lang="ts">
  import type { ResolvedNodeId } from "../../../../interaction/catalog.ts";
  import { Inspection } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { catalog }: CatalogProps<"inspection-content"> = $props();
  let content = $state<{ revealEntry: (id: ResolvedNodeId) => Promise<boolean> }>();
  export async function revealEntry(id: ResolvedNodeId): Promise<boolean> { return await content?.revealEntry(id) ?? false; }
</script>

<Inspection {catalog} bind:this={content} />
```

## src/svelte/catalog/compositions/inspection/inspection-fixture.ts

Source SHA-256: 13e45e0752b88676ab3faf5b265179538b254e090560cafbcf1ad5c30f9a16e6

```ts
import { freezeDeep } from "../../../../json.ts";
import { ResolvedNodeVersion as version } from "../../../../interaction/resolved-node.ts";
import type { PublicBankInput } from "../../../infra/PublicCatalogBank-model.ts";
import { inspectionMedia } from "../../../infra/inspection-media.ts";

const image = { asset: inspectionMedia.asset, alt: inspectionMedia.alt };
const card = { version, kind: "catalog.card", record: "notebook-cover", title: "Notebook cover", image } as const;

/** Renderer-owned witness data, not a product definition, query, or controller connection. */
export const inspectionCatalog = freezeDeep({
  productId: "desert-visual-catalog",
  home: { version, kind: "catalog.home",
    featured: { ...card, presentation: "featured", eyebrow: "SDK illustration", actionLabel: "Open example" },
    groups: [{ id: "illustrations", title: "Illustrations", items: [{ ...card, presentation: "item" }] }],
  },
  details: [{ version, kind: "catalog.detail", record: card.record, title: card.title, image,
    description: "An original SDK illustration used to inspect shared media components. This local example does not read or change product data.",
  }],
} as const satisfies PublicBankInput);
```

## src/svelte/infra/inspection-media.ts

Source SHA-256: 82b252301725837a1bc4b0d9d392e6fe12fa5496a8cc00d54dbe000cd1840c59

```ts
/** One SDK-authored original, copied to the catalog's logical-media namespace at build time. */
export const inspectionMedia = Object.freeze({
  asset: "desert-bank-notebook.svg", source: "bank-image.svg", alt: "An open notebook with blue pages",
});
```

## src/svelte/catalog/compositions/access-gate/AccessGate.svelte

Source SHA-256: f87759d72ba8a9a4ab0863cd867bebb05654c4ae840a8382f87f770eb05f2a8a

```svelte
<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { CatalogProps } from "../../types.d.ts";
  import { AccessScreen, ViewProduct } from "../../index.ts";
  import { accessClient } from "../../../../web/client/access.ts";
  import { mountAccessSession } from "../../../../web/client/browser-session.ts";
  import { provideAccess } from "../../../infra/access-context.ts";
  import { browserAccessLock } from "./browser-access-lock.ts";
  import { rememberAccessProfile } from "../../../infra/access-profile.ts";
  let { surface, validateInput, viewProgram }: CatalogProps<"access-gate"> = $props();
  let productLabel = $derived(viewProgram.label);
  const client = untrack(() => accessClient(surface.contractDigest, browserAccessLock()));
  let current = $state.raw(client.snapshot());
  provideAccess({ client, snapshot: () => current });
  // The session module owns the launch invitation and the refresh while the page is in view (DESIGN §8 Q3).
  onMount(() => mountAccessSession(client, () => {
    current = client.snapshot();
    if (current.state.kind === "ready") rememberAccessProfile(current.state.identity);
  }));
</script>

{#if current.state.kind === "ready" || current.state.kind === "developer"}
  {#key current.state.kind === "ready" ? current.state.sessionBinding : "developer"}
    <ViewProduct program={viewProgram} {surface} {validateInput} access={{ lock: client.lock }} />
  {/key}
{:else}<AccessScreen {productLabel} {current} {client} />{/if}
```

## src/svelte/catalog/compositions/collection/Collection.svelte

Source SHA-256: 30ed28c3a767728bd2368a37a572b8014b0f8661dd9681618519610c0d95c5b5

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { presentFact, presentTitle, readingFields } from "../../../../interaction/fact-presentation.ts";
  import { retrieveCollection } from "../../../collection-retrieval.ts";
  import { CollectionState, List, MediaCollectionGrid, MediaGrid, Row } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, select }: CatalogProps<"collection"> = $props();
  let { records, disabled, loaded, selectedId } = $derived(node);
  // Collections present records. Search belongs exclusively to the toolbar overlay.
  let visibleRecords = $derived(node.presentation ? records : retrieveCollection(records, node.fields, ""));
  /** The secondary lines of a record row: each further field's value label, or the field's label and its value. */
  function metadata(record: (typeof records)[number]): string[] {
    return readingFields(node.fields.slice(1), record.facts).map(field => node.valueLabels?.[field]?.[String(record.facts[field])]
      ?? say(m.collection.metadata, { label: node.labels[`${node.object}.${field}`]!, value: presentFact(record.facts[field]) }));
  }
</script>
{#if node.presentation?.kind === "media-grid"}<MediaGrid {node} {select} />
{:else if node.presentation?.kind === "collection-grid"}<MediaCollectionGrid {node} {select} />
{:else if visibleRecords.length}<List kind="rows" measure="reading">
  {#each visibleRecords as record (record.id)}
    <Row label={presentTitle(record.facts[node.fields[0]!])} metadata={metadata(record)}
      leading={{ kind: "attention", required: Boolean(node.attention?.[record.id]?.length) }} trailing="chevron" interaction="open"
      available={!disabled} current={record.id === selectedId} focusKey={record.id} onopen={() => select(record.id)} />
  {/each}
</List>{/if}
{#if !records.length && !node.presentation}
  <CollectionState {loaded} createLabel={node.createLabel} connection={node.connection} />
{/if}
```

## src/svelte/collection-retrieval.ts

Source SHA-256: 30633e0ad3e7a3f1840afbba9778a0548af861f51e817d74185811f065646d9e

```ts
import type { RecordView } from "../web/types.ts";
import { presentFact, presentTitle } from "../interaction/fact-presentation.ts";

const compare = (left: string | number, right: string | number) => left < right ? -1 : left > right ? 1 : 0;

/** A local view of the exposed collection fields; never a new read or record projection. */
export function retrieveCollection(records: readonly RecordView[], fields: readonly string[], query: string): readonly RecordView[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const firstField = fields[0]!;
  const matches = records.filter(record => {
    const displayed = fields.map((field, index) => index === 0
      ? presentTitle(record.facts[field]) : presentFact(record.facts[field])).join(" ").toLowerCase();
    return terms.every(term => displayed.includes(term));
  });
  return matches.sort((left, right) => {
    const a = left.facts[firstField], b = right.facts[firstField];
    // Numeric values keep numeric order; text follows a stable case-insensitive
    // lexical order. Existing visible fallbacks cover empty or unknown titles.
    const byFirstField = typeof a === "number" && typeof b === "number" ? compare(a, b)
      : compare(presentTitle(a).toLowerCase(), presentTitle(b).toLowerCase());
    // Identity only breaks equal displayed values. It never enters search or copy.
    return byFirstField || compare(left.id, right.id);
  });
}
```

## src/svelte/catalog/compositions/surface-frame/SurfaceFrame.svelte

Source SHA-256: 0916b3ced85e7d92fafe4ad145a5e81c5fdd9cf957510a6520fea082ea4a3f96

```svelte
<script lang="ts">
  import { surfaceFrame } from "../../../../interaction/surface-frame.ts";
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  import { ContentFlow, FrameBody, Surface, Toolbar } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { frame, body, invoke, edit = () => {}, presentation = "standard", controlEvent }: CatalogProps<"surface-frame"> = $props();
  const uid = $props.id();
  const formId = `${uid}-form`;
  let checked = $derived.by(() => {
    const value = surfaceFrame(frame);
    // A modal message may consolidate dismissal, never suppress task navigation.
    if (presentation === "message" && value.kind !== "message" && value.kind !== "confirmation") throw new Error("INVALID_MESSAGE_PRESENTATION");
    return value;
  });
  // A commit belongs to the top rail. Only an explicitly multi-step journey
  // owns a bottom navigation rail; confirmations retain their compact choices.
  let steps = $derived(checked.kind === "journey" && checked.navigation === "steps");
  let topCommit = $derived(!steps && (checked.kind === "journey" || checked.kind === "specimen") ? checked.bottom.primary : undefined);
  let topToolbar = $derived(topCommit ? {...checked.top, primary:{...topCommit,
    icon:checked.content.kind === "form" || checked.content.kind === "review" ? "confirm" as const : topCommit.icon}} : checked.top);
  let closing = $derived(steps || checked.kind === "confirmation" || checked.kind === "message");
  let choices = $derived(closing && (checked.bottom.primary !== undefined || (checked.bottom.secondary !== undefined && presentation !== "transient")));
  let label = $derived(checked.kind === "context" ? say(m.surfaceFrame.context) : checked.kind === "journey" ? say(m.surfaceFrame.journey) : undefined);
  // A form frame wraps its bars and content in one form, named by its title; its submit command names that form.
  let form = $derived(checked.content.kind === "form" ? { label: checked.top.title, id: formId } : undefined);
  let submit = $derived(checked.content.kind === "form" ? { journey: checked.content.submit, form: formId } : undefined);
  function submitted() {
    if (checked.content.kind !== "form") return;
    const action = checked.bottom.primary;
    if (action?.state === "ready") invoke(action.intent);
  }
  function dispatch(event: NodeEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>

<Surface kind="frame" {presentation} {label} {form} searching={false} onsubmit={submitted}>
  {#snippet top()}<Toolbar toolbar={{ edge: "top", ...topToolbar }} {invoke} {presentation} {submit} />{/snippet}
  {#snippet content()}
    {#if body}<ContentFlow resolved={body} onevent={dispatch} host="panel" />
    {:else}<FrameBody content={checked.content} {invoke} {edit} {controlEvent} messageDialog={presentation === "message"} />{/if}
  {/snippet}
  {#snippet bottom()}
    {#if choices}
      <Toolbar toolbar={{ edge: "bottom", ...checked.bottom, ...(steps ? { navigation: "steps" as const } : {}) }} {invoke} {presentation} {submit} />
    {/if}
  {/snippet}
</Surface>
```

## src/interaction/surface-frame.ts

Source SHA-256: 3ab09f6bf41ac859d4894dd9832518e532f606b295f9dd1dfaca38307a88f9d9

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { TopToolbarSchema, BottomToolbarSchema, ToolbarActionSchema, NavigationActionSchema,
  UtilityActionSchema, actionSchema } from "./toolbar.ts";
import { InformationSchema } from "./information-content.ts";
import { FactValueSchema } from "../fact-values.ts";
import { FileMetadataSchema } from "./control-nodes.ts";
import { LabelControlLimitsSchema, ReferenceStateSchema, ReferenceChoiceSchema,MediaReferenceStateSchema } from "./labels-control.ts";
import { CloseIntentSchema, RecoverIntentSchema, JourneyIntentSchema, intentKey, submitsJourney } from "./intent.ts";
import {AttentionSignalSchema} from '../attention.ts';
export { ToolbarActionSchema, type ToolbarAction } from "./toolbar.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const DestinationSchema = object({ destination: text(), label: text(), available: Type.Boolean() });
export const FactsSchema = object({
  kind: Type.Literal("facts"), object: text(), fields: Type.Array(text()),
  facts: Type.Record(Type.String(), FactValueSchema),
  labels: Type.Record(Type.String(), Type.String()),
  multiline: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  images: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  tags: Type.Optional(Type.Array(text(), { uniqueItems: true })),
  references:Type.Optional(Type.Record(Type.String(),Type.Array(ReferenceChoiceSchema))),
});
export const TextFormFieldSchema = object({ name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
    disabled: Type.Optional(Type.Boolean()),
    error: Type.Optional(text()), maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
    primitive: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline")]),
});
export const FormSchema = object({
  kind: Type.Literal("form"), submit: text(),
  fields: Type.Array(Type.Union([TextFormFieldSchema, object({ name: text(), label: text(), required: Type.Boolean(),
    disabled: Type.Optional(Type.Boolean()),
    primitive: Type.Literal("control.files"), files: Type.Array(FileMetadataSchema, { maxItems: 1 }), error: Type.Optional(text()),
    media:Type.Optional(Type.Union([Type.Literal("image"),Type.Literal("media")])),
  }), object({ name: text(), label: text(), required: Type.Boolean(), primitive: Type.Literal("control.labels"),
    disabled: Type.Optional(Type.Boolean()),
    values: Type.Array(Type.String()), limits: LabelControlLimitsSchema, error: Type.Optional(text()),
    reference:Type.Optional(ReferenceStateSchema),
    mediaReference:Type.Optional(MediaReferenceStateSchema),
  }), object({ name: text(), label: text(), required: Type.Literal(false), primitive: Type.Literal("control.select"),
    disabled: Type.Optional(Type.Boolean()),
    value: text(), options: Type.Array(object({ value: text(), label: text(), disabled: Type.Boolean() }), { minItems: 1 }),
    error: Type.Optional(text()),
  })])),
});
export const ObjectSelectorSchema = object({ field: text(), label: text(), value: Type.Union([text(), Type.Null()]), disabled: Type.Boolean(),
  options: Type.Array(object({ value: text(), label: text(), journey: text(), available: Type.Boolean() }), { minItems: 1 }),
});
export const ContextSchema = object({ kind: Type.Literal("context"), details: FactsSchema, actions: Type.Array(DestinationSchema),
  attention:Type.Optional(Type.Array(AttentionSignalSchema)),
  selectors: Type.Optional(Type.Array(ObjectSelectorSchema)),
  presentation: Type.Optional(object({ kind: Type.Literal("media-object"), media: text(), description: Type.Optional(text()) })),
});
export const ReviewSchema = object({ kind: Type.Literal("review"), details: FactsSchema, recovery: Type.Optional(text()) });
const MessageSchema = object({ kind: Type.Literal("message"), text: text() });
export const UtilitiesContentSchema = object({ kind: Type.Literal("utilities"), actions: Type.Array(UtilityActionSchema, { minItems: 1 }) });
const GeneralContentSchema = Type.Union([FactsSchema, FormSchema, ContextSchema, ReviewSchema, MessageSchema, InformationSchema]);
export const FrameContentSchema = Type.Union([GeneralContentSchema, UtilitiesContentSchema]);
export const SurfaceFrameVersion = "desert.surface-frame/6" as const;
const common = { version: Type.Literal(SurfaceFrameVersion), top: TopToolbarSchema };
const DismissActionSchema = actionSchema(CloseIntentSchema);
const MessageTopSchema = object({ ...TopToolbarSchema.properties, primary: Type.Optional(Type.Never()), trailing: Type.Optional(Type.Array(Type.Never())) });
const ContextTopSchema = object({ ...TopToolbarSchema.properties,
  primary: Type.Optional(Type.Never()),
  trailing: Type.Optional(Type.Array(actionSchema(Type.Union([RecoverIntentSchema, JourneyIntentSchema])))),
});
const DismissBottomSchema = object({ secondary: Type.Optional(DismissActionSchema), primary: Type.Optional(Type.Never()) });
export const SurfaceFrameSchema = Type.Union([
  object({ ...common, kind: Type.Literal("context"), top: ContextTopSchema,
    content: Type.Union([FactsSchema, ContextSchema, MessageSchema]),
    bottom: object({ secondary: Type.Optional(NavigationActionSchema), primary: Type.Optional(Type.Never()) }),
  }),
  object({ ...common, kind: Type.Literal("message"), top: MessageTopSchema, content: MessageSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("utilities"), top: MessageTopSchema, content: UtilitiesContentSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("journey"), navigation: Type.Optional(Type.Literal("steps")), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
  object({ ...common, kind: Type.Literal("confirmation"), content: MessageSchema, bottom: BottomToolbarSchema }),
  object({ ...common, kind: Type.Literal("specimen"), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
]);

export type SurfaceFrame = Frozen<Static<typeof SurfaceFrameSchema>>;
export type FrameContent = SurfaceFrame["content"];
export type Destination = Frozen<Static<typeof DestinationSchema>>;
export type FactsContent = Frozen<Static<typeof FactsSchema>>;

/** Shared semantic checks for both frame bodies and the canonical bank nodes. */
export function checkFrameContent(content: FrameContent): void {
  const details = content.kind === "facts" ? content :
    content.kind === "context" || content.kind === "review" ? content.details : undefined;
  if (content.kind === "context" && content.presentation &&
    (!content.details.images?.includes(content.presentation.media) ||
      (content.presentation.description && !content.details.fields.includes(content.presentation.description)))) {
    throw new Error("INVALID_MEDIA_OBJECT_FIELDS");
  }
  if (details && (new Set(details.fields).size !== details.fields.length ||
    details.multiline?.some(field => !details.fields.includes(field)) ||
    details.images?.some(field => !details.fields.includes(field) || details.multiline?.includes(field)) ||
    details.tags?.some(field => !details.fields.includes(field) || details.multiline?.includes(field) || details.images?.includes(field)))) {
    throw new Error("INVALID_SURFACE_FRAME_FIELDS");
  }
  if (details && details.fields.some(field => {
    if (!Object.hasOwn(details.facts, field)) return false;
    const value = details.facts[field];
    return Array.isArray(value) !== Boolean(details.tags?.includes(field)) ||
      (typeof value === "object" && !Array.isArray(value)) !== Boolean(details.images?.includes(field));
  })) {
    throw new Error("INVALID_SURFACE_FRAME_FACT_REPRESENTATION");
  }
  if (details && details.fields.some(field => !Object.hasOwn(details.labels, `${details.object}.${field}`) ||
    !details.labels[`${details.object}.${field}`]?.trim())) throw new Error("INVALID_SURFACE_FRAME_LABELS");
  if (content.kind === "form" && new Set(content.fields.map(field => field.name)).size !== content.fields.length) {
    throw new Error("INVALID_SURFACE_FRAME_FIELDS");
  }
  if (content.kind === "utilities" && new Set(content.actions.map(action => intentKey(action.intent))).size !== content.actions.length) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
}

export function surfaceFrame(value: unknown): SurfaceFrame {
  const snapshot = jsonSnapshot(value);
  if (!Check(SurfaceFrameSchema, snapshot)) throw new Error("INVALID_SURFACE_FRAME");
  checkFrameContent(snapshot.content);
  const actions = [snapshot.bottom.secondary, snapshot.bottom.primary].filter(action => action !== undefined);
  const ids = actions.map(action => intentKey(action.intent));
  const topIds = [snapshot.top.leading, snapshot.top.primary, ...(snapshot.top.trailing ?? [])]
    .filter(action => action !== undefined).map(action => intentKey(action.intent));
  if (new Set(ids).size !== ids.length || new Set(topIds).size !== topIds.length ||
    (snapshot.content.kind === "form" && !submitsJourney(snapshot.bottom.primary?.intent, snapshot.content.submit))) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
  return freezeDeep(snapshot);
}
```

## src/interaction/frame-presenters.ts

Source SHA-256: 6e3eadd899e75ddb5292bc8c44247d4ac60e4a98b39544877a61cc0f76512cb1

```ts
import type { HumanSurface, Mutation } from "../web/types.ts";
import { deriveForm } from "./form.ts";
import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type BottomToolbar } from "./toolbar.ts";
import { presentFacts, presentTitle } from "./fact-presentation.ts";
import { reviewChanges } from "./review-changes.ts";
import type { Facts } from "../fact-values.ts";
import { isImageFileSelection } from "./image-input.ts";
import type { Draft } from "./draft.ts";
import type { ReferenceState,MediaReferenceState } from './labels-control.ts';
export { toolbarAction } from "./toolbar.ts";

export function formFrame(surface: HumanSurface, journey: Mutation, draft: Readonly<Draft>,
  bottom: BottomToolbar, errors: Readonly<Record<string, string>> = {}, references:Readonly<Record<string,ReferenceState>>={},mediaReferences:Readonly<Record<string,MediaReferenceState>>={}): SurfaceFrame {
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: surface.language.journeys[journey.id]! },
    content: { kind: "form", submit: journey.id, fields: deriveForm(journey, surface.fieldRepresentations).map(field => {
      const common = { name: field.name, required: field.required, label: surface.language.fields[`${journey.object}.${field.name}`]!,
        ...(Object.hasOwn(errors, field.name) ? { error: errors[field.name] } : {}) };
      const value = draft[field.name];
      const reference=surface.fieldReferences?.[`${journey.object}.${field.name}`];
      return field.primitive === "control.labels" ? { ...common, primitive: field.primitive,
        values: Array.isArray(value) ? value : [], limits: field.limits,
        ...(surface.fieldMediaReferences?.[`${journey.object}.${field.name}`] ? {mediaReference:mediaReferences[`${journey.object}.${field.name}`] ?? {options:[],loading:true}} : {}),
        ...(reference ? {reference:references[`${journey.object}.${field.name}`] ?? {
          options:[],loading:true,busy:false,uncertain:false,...(reference.create ? {createLabel:surface.language.journeys[reference.create]!} : {}),
          colors:reference.colors,maxLength:reference.maxLength}} : {}) }
        : field.primitive === "control.select" ? { ...common, required: false, primitive: field.primitive,
          value: typeof value === "string" && field.options.some(option => option.value === value) ? value : field.options[0]!.value,
          options: field.options }
        : field.primitive === "control.files" ? { ...common, primitive: field.primitive,
        files: isImageFileSelection(value) ? [value.file] : [],media:field.media }
        : { ...common, primitive: field.primitive, value: typeof value === "string" ? value : "",
          ...(field.schema.maxLength !== undefined ? { maxLength: field.schema.maxLength } : {}) };
    }) }, bottom,
  });
}

export type ReviewPhase = { kind: "review" } | { kind: "recovery"; method: "same-confirmation" | "receipt-only" };

export function reviewFrame(surface: HumanSurface, mutation: Mutation, facts: Readonly<Facts>,
  phase: ReviewPhase, busy: boolean, ready: boolean,
  feedback: { pendingAction?: "invoke" | "accept" | "recover" | null, receiptMissing?: boolean,
    previous?: Readonly<Facts> } = {}): SurfaceFrame {
  const label = surface.language.journeys[mutation.id]!;
  const uncertain = phase.kind === "recovery", receiptOnly = phase.kind === "recovery" && phase.method === "receipt-only";
  const pending = feedback.pendingAction === undefined ? (busy ? "accept" : null) : feedback.pendingAction;
  if (!uncertain && surface.commit[mutation.id] === "confirm") {
    const read = surface.journeys.find(item => item.kind === "read" && item.subject === mutation.object);
    const candidate = read?.kind === "read" ? facts[read.collection[0]!] : undefined;
    // An asset-led collection has no text title. Never stringify private asset metadata.
    const title = typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean" ? candidate : undefined;
    return surfaceFrame({ version: "desert.surface-frame/6", kind: "confirmation",
      top: { title: `${label}?` }, content: { kind: "message", text: title === undefined ?
        "Confirm this change to the selected item." : `“${presentTitle(title)}”` },
      bottom: { secondary: toolbarAction({ kind: "back" }, "Cancel", "back", !busy),
        primary: { ...toolbarAction({ kind: "accept" }, label, "confirm", ready && !busy),
          ...(busy && pending === "accept" ? { state: "pending" as const } : {}) } },
    });
  }
  const changes = reviewChanges(surface, mutation, facts, feedback.previous);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: uncertain ? "Check result" : `Review · ${label}`,
      subtitle: uncertain ? "Recover the result of this operation." : changes.summary,
      ...(uncertain ? { trailing: [{ ...toolbarAction({ kind: "recover" }, "Check result", "recover", ready && !busy),
        ...(busy && pending === "recover" ? { state: "pending" as const } : {}) }] } : {}) },
    content: { kind: "review", details: presentFacts(surface, mutation.object, changes.fields, facts),
      ...(uncertain ? { recovery: feedback.receiptMissing
        ? receiptOnly ? "No saved result was found yet. Check again; this operation will not be repeated."
          : "No saved result was found for this confirmation. Check again or retry this same confirmation."
        : "The result needs confirmation. Recovery checks this operation; it does not create another one." } : {}) },
    bottom: { ...(!uncertain ? { secondary: toolbarAction({ kind: "back" }, "Back", "back", !busy) } : {}),
      ...(!receiptOnly ? { primary: { ...toolbarAction({ kind: "accept" }, uncertain ? "Retry same confirmation" : label, uncertain ? "retry" : "confirm", ready),
        state: busy && pending === "accept" ? "pending" as const : !busy && ready ? "ready" as const : "unavailable" as const } } : {}) },
  });
}
```

## src/interaction/fact-presentation.ts

Source SHA-256: 0dbafe99fa51471c6d6a4274c21b0bcf93dff10cda615cd5cc0225ccfea68ab3

```ts
import type { HumanSurface } from "../web/types.ts";
import type { FactsContent } from "./surface-frame.ts";
import { requireFieldRepresentation } from "../field-representation.ts";
import type { FactValue, Facts } from "../fact-values.ts";
import type { ReferenceState } from './labels-control.ts';

type PresentedValue = FactValue | null | undefined;
const blank = (value: PresentedValue) => typeof value === "string" && value.trim().length === 0 || Array.isArray(value) && value.length === 0;
/** Bridge absent fact keys and information's null sentinel only at presentation. */
export const factState = (value: PresentedValue) => value == null ? "unknown" : blank(value) ? "empty" : "known";
/** Hide only confirmed empty fields in object reading. Reviews still expose deletions. */
export const readingFields = (fields: readonly string[], facts: Readonly<Facts>) =>
  fields.filter(field => !Object.hasOwn(facts, field) || factState(facts[field]) !== "empty");
/** Presentation fallbacks never normalize, validate or rewrite the stored value. */
export const presentFact = (value: PresentedValue) => {
  const state = factState(value);
  return state === "unknown" ? "Unknown" : state === "empty" ? "Empty" : Array.isArray(value) ? "Labels" : typeof value === "object" ? "Image" : String(value);
};
export const presentTitle = (value: FactValue | undefined) => {
  if (typeof value === "object") throw new Error("ASSET_CANNOT_BE_TITLE");
  return value === undefined ? "Unknown" : blank(value) ? "Untitled" : String(value);
};

/** Reading follows the published fact representation, independently of editing authority. */
export function presentFacts(surface: HumanSurface, object: string, fields: readonly string[],
  facts: Readonly<Facts>, references:Readonly<Record<string,ReferenceState>>={}): FactsContent {
  const images = fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "image");
  const tags = fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "tags");
  return { kind: "facts", object, fields, labels: surface.language.fields,
    facts: Object.fromEntries(fields.filter(field => Object.hasOwn(facts, field)).map(field => [field, facts[field]!])),
    multiline: fields.filter(field => requireFieldRepresentation(surface.fieldRepresentations, `${object}.${field}`) === "paragraphs"),
    ...(images.length ? { images } : {}),
    ...(tags.length ? { tags } : {}),
    ...(tags.some(field => surface.fieldReferences?.[`${object}.${field}`]) ? {references:Object.fromEntries(tags
      .filter(field => surface.fieldReferences?.[`${object}.${field}`]).map(field => [field,references[`${object}.${field}`]?.options ?? []]))} : {}),
  };
}
```

## src/interaction/review-changes.ts

Source SHA-256: 8c9003a09e95cdcd7fa2cbef2a5798c419c794ec311cbb37b300210b30764109

```ts
import type { HumanSurface, Mutation } from "../web/types.ts";
import { presentFact } from "./fact-presentation.ts";
import { sameFact, type Facts as FactValues } from "../fact-values.ts";

type Facts = Readonly<FactValues>;
/** Compare only exposed facts with an exact-version baseline supplied by the presenter. */
export function reviewChanges(surface: HumanSurface, mutation: Mutation, facts: Facts, previous?: Facts) {
  if (!mutation.reviewFields) throw new Error("UNSUPPORTED_REVIEW_PROJECTION");
  const changed = mutation.reviewFields.filter(field => previous && Object.hasOwn(previous, field) &&
    Object.hasOwn(facts, field) && !sameFact(previous[field], facts[field]));
  let summary = "Review the resulting record before confirming.";
  if (changed.length) {
    const field = changed[0]!;
    const concise = `${surface.language.fields[`${mutation.object}.${field}`]}: ${presentFact(previous![field])} → ${presentFact(facts[field])}`;
    const structured = typeof previous![field] === "object" || typeof facts[field] === "object";
    summary = !structured && changed.length === 1 && concise.length <= 64 && !concise.includes("\n") ? concise :
      `${changed.length} ${changed.length === 1 ? "field will change. Review the updated value" : "fields will change. Review the updated values"} first.`;
  }
  return { summary, fields: [...changed, ...mutation.reviewFields.filter(field => !changed.includes(field))] };
}
```

## src/web/client/frame.ts

Source SHA-256: ef23e42c051b9c01c5f4accdfdbbf2079a0adf5884c5b7de5566f3a23ff90b8a

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import { subjectActionAvailable, type HumanState } from "./state.ts";
import { mutationPresentation } from "./presentation.ts";
import { referenceScopeSurface, requireReadScope, type ModelScope } from "./model-scope.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { fieldFeedback } from "./field-feedback.ts";
import { presentFacts, presentTitle } from "../../interaction/fact-presentation.ts";
import { inspectMutationDraft } from "./draft-validation.ts";

export function presentFrame(surface: HumanSurface, state: HumanState, validate: ValidateInput,
  scope: ModelScope) {
  surface=referenceScopeSurface(surface,scope);
  const ready = (id: string) => state.availability.journeys[id]?.dependenciesReady === true;
  if (state.view === "create" || state.view === "edit") {
    if (state.view === "edit" && !state.editing) throw new Error("EDIT_CONTEXT_REQUIRED");
    const id = state.editing?.journeyId ?? state.creationJourneyId;
    if (!id) throw new Error("FORM_JOURNEY_REQUIRED");
    const primary = mutationPresentation(surface, id);
    const label = surface.commit[primary.id] === "review" ? "Review" : surface.language.journeys[primary.id]!;
    const validation = inspectMutationDraft(surface, primary, state.draft, validate);
    return formFrame(surface, primary, state.draft, { secondary: toolbarAction({ kind: "back" }, "Back", "back", !state.busy), primary: {
      ...toolbarAction({ kind: "journey", journey: primary.id }, label, surface.commit[primary.id] === "review" ? "review" : "save",
        ready(primary.id) && validation.valid && (!state.editing || subjectActionAvailable(surface, state, primary.id, state.editing.subject, undefined, scope))),
      ...(state.busy ? { state: "pending" as const } : {}),
    }}, fieldFeedback(validation, state.touchedFields,
      primary.inputFields.filter(field => surface.fieldKinds?.[`${primary.object}.${field}`] === "labels")), state.references,state.mediaReferences);
  }
  if ((state.view === "review" || state.view === "recovery") && state.prepared && state.mutationId) {
    const mutation = mutationPresentation(surface, state.mutationId);
    const previous = state.editing?.journeyId === mutation.id && state.editing.expectedVersion === state.prepared.object.expectedVersion
      ? state.editing.facts : state.detail?.id === state.prepared.object.id && state.detail.version === state.prepared.object.expectedVersion &&
      requireReadScope(scope).read.subject === mutation.object ? state.detail.facts : undefined;
    return reviewFrame(surface, mutation, state.prepared.facts,
      state.uncertain ? { kind: "recovery", method: "same-confirmation" } : { kind: "review" }, state.busy, ready(mutation.id),
      { pendingAction: state.pendingAction, receiptMissing: state.receiptMissing, ...(previous ? { previous } : {}) });
  }
  const { read, subjectActions } = requireReadScope(scope);
  const identity = state.detail?.facts[read.collection[0]!];
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "context",
    top: { title: state.detail ? typeof identity === "object" ? "Media" : presentTitle(identity) : surface.language.journeys[read.id]! },
    content: state.detail ? { kind: "context", details: presentFacts(surface, read.subject,
      read.fields.filter(field => field !== read.collection[0]), state.detail.facts, state.references),
      actions: subjectActions.map(({ id }) => ({ destination: id, label: surface.language.journeys[id]!,
        available: subjectActionAvailable(surface, state, id, undefined, undefined, scope) })) }
      : { kind: "message", text: ready(read.id) ? "Loading…" : "Waiting for the local controller." },
    bottom: {},
  });
}
```

## src/svelte/catalog/renderer/frame-body/FrameBody.svelte

Source SHA-256: 0ec0f43aa562960efbc0d6b100c0d246f157bf267a2727cd87b3a84485c4daac

```svelte
<script lang="ts">
  import type { NodeEvent } from "../../../../interaction/node-events.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer, Information, Text, UtilityActions } from "../../index.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { content, invoke, edit, messageDialog = false, controlEvent }: CatalogProps<"frame-body"> = $props();
  function dispatch(event: NodeEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (isFormControlEvent(event)) controlEvent?.(event);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>
{#if content.kind === "form"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "form", content }} onevent={dispatch} />
{:else if content.kind === "context"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "context", content }} onevent={dispatch} />
{:else if content.kind === "facts"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details: content }} />
{:else if content.kind === "review"}
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "review", content }} />
{:else if content.kind === "information"}
  <Information items={content.items} />
{:else if content.kind === "utilities"}
  <UtilityActions actions={content.actions} {invoke} />
{:else if messageDialog}
  <!-- A message dialog's sentence centres under its title; a frame's message is a polite live status. -->
  <Text kind="support" align="center" text={content.text} />
{:else}
  <Text kind="body" live="polite" text={content.text} />
{/if}
```

## src/interaction/toolbar.ts

Source SHA-256: 833796455aa3c75d118f9f65398adc28bbe47989f74a44139c0f69b91cba4e7e

```ts
import { Type, type Static, type TProperties, type TSchema } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { ActionIconSchema, type ActionIcon } from './action-icon.ts';
export { ActionIconSchema, type ActionIcon } from './action-icon.ts';
import { SurfaceIntentSchema, ProductSurfaceIntentSchema, CloseIntentSchema, BackIntentSchema,
  JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema,
  NavigationToggleIntentSchema, type SurfaceIntent } from "./intent.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const actionSchema = <T extends TSchema>(intent: T) => object({
  intent, label: text(), icon: ActionIconSchema,
  reason: Type.Optional(text()),
  state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
});
export const ToolbarActionSchema = actionSchema(SurfaceIntentSchema);
export const NavigationActionSchema = actionSchema(Type.Union([CloseIntentSchema, BackIntentSchema, NavigationToggleIntentSchema]));
export const UtilityActionSchema = actionSchema(Type.Union([JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema]));
export const TopToolbarSchema = object({
  title: text(), subtitle: Type.Optional(text()),
  face: Type.Optional(FaceSchema),
  leading: Type.Optional(NavigationActionSchema), trailing: Type.Optional(Type.Array(UtilityActionSchema)),
  primary: Type.Optional(UtilityActionSchema), actionGroup: Type.Optional(Type.Literal("create")),
  availability: Type.Optional(object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unknown"), Type.Literal("unavailable")]), label: text(),
  })),
});
export const BottomToolbarSchema = object({
  secondary: Type.Optional(actionSchema(ProductSurfaceIntentSchema)), primary: Type.Optional(UtilityActionSchema),
});
export type ToolbarAction = Frozen<Static<typeof ToolbarActionSchema>>;
export type TopToolbar = Frozen<Static<typeof TopToolbarSchema>>;
export type BottomToolbar = Frozen<Static<typeof BottomToolbarSchema>>;
export type Toolbar = ({ readonly edge: "top" } & TopToolbar) |
  { readonly edge: "bottom"; readonly secondary?: ToolbarAction; readonly primary?: ToolbarAction; readonly navigation?: "steps" };

export const toolbarAction = <const I extends SurfaceIntent>(intent: I, label: string, icon: ActionIcon, available = true):
  Omit<ToolbarAction, "intent"> & { readonly intent: I } => ({
  intent, label, icon, state: available ? "ready" : "unavailable",
});
```

## src/interaction/intent.ts

Source SHA-256: c9ab67a5f8e71d2fb3b0cfa8c2997568cceeea952e715743cf7b07c1bfa2467a

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";

const closed = { additionalProperties: false };
export const JourneyIntentSchema = Type.Object({ kind: Type.Literal("journey"),
  journey: Type.String({ minLength: 1 }) }, closed);
export const CloseIntentSchema = Type.Object({ kind: Type.Literal("close") }, closed);
export const BackIntentSchema = Type.Object({ kind: Type.Literal("back") }, closed);
export const RecoverIntentSchema = Type.Object({ kind: Type.Literal("recover") }, closed);
export const AcceptIntentSchema = Type.Object({ kind: Type.Literal("accept") }, closed);
/** Presentation ports are resolved by the View program, never by command dispatch. */
export const ViewOutputIntentSchema = Type.Object({
  kind: Type.Literal("view.output"), view: Type.String({ minLength: 1 }), output: Type.String({ minLength: 1 }),
  recordId: Type.Optional(Type.String({ minLength: 1 })),
}, closed);
export const NavigationToggleIntentSchema = Type.Object({ kind: Type.Literal("navigation.toggle") }, closed);
/** @deprecated Recognized for bank compatibility only; no current frame or selection host accepts this intent. */
export const SelectionConfirmIntentSchema = Type.Object({ kind: Type.Literal("selection.confirm"),
  selection: Type.String({ minLength: 1 }) }, closed);
export const ProductSurfaceIntentSchema = Type.Union([
  JourneyIntentSchema, CloseIntentSchema,
  BackIntentSchema, AcceptIntentSchema, RecoverIntentSchema,
]);
export const SurfaceIntentSchema = Type.Union([
  ProductSurfaceIntentSchema, SelectionConfirmIntentSchema, ViewOutputIntentSchema, NavigationToggleIntentSchema,
]);
export type SurfaceIntent = Frozen<Static<typeof SurfaceIntentSchema>>;

export function surfaceIntent(value: unknown): SurfaceIntent {
  const snapshot = jsonSnapshot(value);
  if (!Check(SurfaceIntentSchema, snapshot)) throw new Error("INVALID_SURFACE_INTENT");
  return freezeDeep(snapshot);
}

/** Identity depends on the operation, never its label, icon or a reserved product name. */
export const intentKey = (intent: SurfaceIntent): string => intent.kind === "journey"
  ? JSON.stringify([intent.kind, intent.journey]) : intent.kind === "selection.confirm"
    ? JSON.stringify([intent.kind, intent.selection]) : intent.kind === "view.output"
      ? JSON.stringify([intent.kind, intent.view, intent.output]) : intent.kind;
export const submitsJourney = (intent: SurfaceIntent | undefined, journey: string | undefined): boolean =>
  intent?.kind === "journey" && intent.journey === journey;

type IntentHandlers = { journey: (id: string) => void } & {
  [K in Exclude<SurfaceIntent["kind"], "journey" | "selection.confirm" | "view.output" | "navigation.toggle">]: () => void;
};
export function dispatchSurfaceIntent(value: SurfaceIntent, handlers: IntentHandlers): void {
  const intent = surfaceIntent(value);
  // Legacy selection confirmation has no product handler or current selection host.
  if (intent.kind === "selection.confirm" || intent.kind === "view.output" || intent.kind === "navigation.toggle") {
    throw new Error("INVALID_SURFACE_INTENT_SCOPE");
  }
  if (intent.kind === "journey") handlers.journey(intent.journey);
  else handlers[intent.kind]();
}
```

## src/interaction/face.ts

Source SHA-256: 1b34816a97afaea89a13751b4369c931938168d31672ebeaf7e5b6bf86a06b75

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from './action-icon.ts';

export const FaceSchema = Type.Union([
  Type.Object({ kind: Type.Literal('icon'), icon: ActionIconSchema }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("document") }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("status"), severity: Type.Union([
    Type.Literal("warning"), Type.Literal("error"),
  ]) }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("symbol"), text: Type.String({ minLength: 1, maxLength: 8, pattern: "\\S" }) },
    { additionalProperties: false }),
  // An explicit country/region decoration, never derived from a currency or locale.
  Type.Object({ kind: Type.Literal("flag"), region: Type.String({ pattern: "^[A-Z]{2}$", minLength: 2, maxLength: 2 }) },
    { additionalProperties: false }),
]);

export type Face = Frozen<Static<typeof FaceSchema>>;
```

## src/interaction/selection-option.ts

Source SHA-256: a343b479498675cba6f55f0e2bfeb963f38a971bed7a8d9d00f31aa39f1ffe9f

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";

/** The label remains the identity; a face is optional, passive decoration. */
export const SelectionOptionSchema = Type.Object({
  value: Type.String({ minLength: 1 }),
  label: Type.String({ minLength: 1 }),
  disabled: Type.Boolean(),
  face: Type.Optional(FaceSchema),
}, { additionalProperties: false });

export type SelectionOption = Frozen<Static<typeof SelectionOptionSchema>>;
```

## src/interaction/transient-frame.ts

Source SHA-256: 85613be58921aca9f00c84cb47c398128bc5182db62d1fae236606a41fc651b8

```ts
import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type ToolbarAction } from "./toolbar.ts";
import { intentKey } from "./intent.ts";

const dismissal = (action: ToolbarAction | undefined) => action &&
  (action.intent.kind === "close" || action.intent.kind === "back");

/** Task/dialog chrome only. Local selects and contextual popovers do not consume a frame. */
export function transientFrame(frame: SurfaceFrame, locked: boolean): SurfaceFrame {
  const checked = surfaceFrame(frame);
  const navigation = checked.bottom.secondary ?? toolbarAction({ kind: "close" }, "Close", "close");
  const leading = checked.top.leading;
  if (!dismissal(navigation) || navigation.state === "pending" || dismissal(checked.bottom.primary) ||
    (checked.top.trailing ?? []).some(dismissal) ||
    (leading && intentKey(leading.intent) !== intentKey(navigation.intent))) {
    throw new Error("INVALID_TRANSIENT_NAVIGATION");
  }
  const shared = { ...navigation, state: locked ? "unavailable" as const : navigation.state };
  return surfaceFrame({ ...checked,
    top: { ...checked.top, leading: shared },
    bottom: { ...checked.bottom, secondary: shared },
  });
}
```

## src/interaction/control-nodes.ts

Source SHA-256: caef0598961bbcbbdda53f32c4e9b1a28bfe002b0309ebb1481e0b4e11d3bb13

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { InformationItemSchema } from "./information-content.ts";
import { ExtendedNodeSchemas, ExtendedEventSchemas } from "./extended-nodes.ts";
import { checkExtendedControl, changeExtendedControl } from "./extended-controls.ts";
import { SelectionOptionSchema } from "./selection-option.ts";
import { LabelsNodeSchema, LabelsEventSchema, ReferenceEventSchema } from "./labels-control.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
export const SelectNodeSchema = object({ ...base, kind: Type.Literal("select"), required: Type.Boolean(),
  inputRequired: Type.Optional(Type.Boolean()),
  value: Type.Union([Type.Null(), text()]), options: Type.Array(SelectionOptionSchema, { minItems: 1 }) });
export const PopoverNodeSchema = object({ ...base, kind: Type.Literal("popover"), open: Type.Boolean(), title: text(),
  locked: Type.Optional(Type.Boolean()), content: Type.Array(InformationItemSchema, { minItems: 1 }) });
export const FileMetadataSchema = object({ id: text(), name: text(), size: integer(),
  mediaType: Type.String(), lastModified: integer() });
export const FileNodeSchema = object({ ...base, kind: Type.Literal("files"),
  limits: object({ maxCount: integer(1), maxFileBytes: integer(1), maxTotalBytes: integer(1),
    accept: Type.Array(Type.String({ pattern: "^[a-z0-9!#$&^_.+-]+/([a-z0-9!#$&^_.+-]+|\\*)$" }), { uniqueItems: true }) }),
  files: Type.Array(FileMetadataSchema) });
export const ControlNodeSchema = Type.Union([SelectNodeSchema, PopoverNodeSchema, FileNodeSchema, ...ExtendedNodeSchemas, LabelsNodeSchema]);
export type ControlNode = Frozen<Static<typeof ControlNodeSchema>>;
export type SelectNode = Extract<ControlNode, { kind: "select" }>;
export type PopoverNode = Extract<ControlNode, { kind: "popover" }>;
export type FileNode = Extract<ControlNode, { kind: "files" }>;
export type FileMetadata = Frozen<Static<typeof FileMetadataSchema>>;
export type FileRejection = { readonly file: FileMetadata; readonly reason: "media-type" | "file-size" | "total-size" | "count" };

/** `required` preserves the non-clearable value contract. Only an operation's
 * explicit input requirement is presented to the person as form participation. */
export function selectInputRequired(node: SelectNode): boolean {
  return node.inputRequired === true && (!node.required || node.value === null);
}

export const ControlEventSchema = Type.Union([
  object({ kind: Type.Literal("select.change"), control: text(), value: Type.Union([text(), Type.Null()]) }),
  object({ kind: Type.Literal("popover.open"), control: text(), open: Type.Boolean() }),
  object({ kind: Type.Literal("files.choose"), control: text(), files: Type.Array(FileMetadataSchema) }),
  object({ kind: Type.Literal("files.remove"), control: text(), file: text() }),
  ...ExtendedEventSchemas,
  LabelsEventSchema,
  ...ReferenceEventSchema.anyOf,
]);
export type ControlEvent = Frozen<Static<typeof ControlEventSchema>>;
export type ControlTransition = { readonly node: ControlNode; readonly rejected: readonly FileRejection[] };

function unique(ids: readonly string[]) { return new Set(ids).size === ids.length; }
function rejection(node: FileNode, file: FileMetadata, current: readonly FileMetadata[]): FileRejection["reason"] | undefined {
  const { limits } = node;
  if (limits.accept.length && !limits.accept.some(type => type === file.mediaType ||
    (type.endsWith("/*") && file.mediaType.startsWith(type.slice(0, -1))))) return "media-type";
  if (file.size > limits.maxFileBytes) return "file-size";
  if (current.length >= limits.maxCount) return "count";
  if (file.size > limits.maxTotalBytes - current.reduce((total, entry) => total + entry.size, 0)) return "total-size";
}

/** Bank descriptors only: this does not install product authoring or execution. */
export function controlNode(value: unknown): ControlNode {
  const node = jsonSnapshot(value);
  if (!Check(ControlNodeSchema, node)) throw new Error("INVALID_CONTROL_NODE");
  if (node.kind === "select" && (!unique(node.options.map(item => item.value)) ||
    (node.value !== null && !node.options.some(item => item.value === node.value)))) throw new Error("INVALID_CONTROL_SELECTION");
  if (node.kind === "popover" && node.disabled && node.open) throw new Error("INVALID_CONTROL_POPOVER");
  if (node.kind === "files") {
    if (!unique(node.files.map(item => item.id)) || node.files.some((file, index) => rejection(node, file, node.files.slice(0, index)))) {
      throw new Error("INVALID_CONTROL_FILES");
    }
  }
  if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files" && node.kind !== "labels") checkExtendedControl(node);
  return freezeDeep(node);
}

export function selectNode(value: unknown): SelectNode {
  const node = controlNode(value);
  if (node.kind !== "select") throw new Error("SELECT_NODE_REQUIRED");
  return node;
}
export function popoverNode(value: unknown): PopoverNode {
  const node = controlNode(value);
  if (node.kind !== "popover") throw new Error("POPOVER_NODE_REQUIRED");
  return node;
}
export function fileNode(value: unknown): FileNode {
  const node = controlNode(value);
  if (node.kind !== "files") throw new Error("FILE_NODE_REQUIRED");
  return node;
}

/** Pure local interaction; file MIME metadata is not trusted content inspection. */
export function applyControlEvent(value: ControlNode, input: unknown): ControlTransition {
  const node = controlNode(value);
  const event = jsonSnapshot(input);
  if (!Check(ControlEventSchema, event) || event.control !== node.id) throw new Error("INVALID_CONTROL_EVENT");
  if (node.disabled) throw new Error("CONTROL_DISABLED");
  let next: ControlNode;
  const rejected: FileRejection[] = [];
  if (node.kind === "select" && event.kind === "select.change") {
    if (event.value === null ? node.required : !node.options.some(item => item.value === event.value && !item.disabled)) {
      throw new Error("INVALID_CONTROL_EVENT");
    }
    next = { ...node, value: event.value };
  } else if (node.kind === "popover" && event.kind === "popover.open") {
    if (node.locked && node.open && !event.open) throw new Error("CONTROL_LOCKED");
    next = { ...node, open: event.open };
  } else if (node.kind === "files" && event.kind === "files.choose") {
    if (!unique([...node.files, ...event.files].map(file => file.id))) throw new Error("INVALID_CONTROL_EVENT");
    const files = [...node.files];
    for (const file of event.files) {
      const reason = rejection(node, file, files);
      if (reason) rejected.push({ file, reason });
      else files.push(file);
    }
    next = { ...node, files };
  } else if (node.kind === "files" && event.kind === "files.remove" && node.files.some(file => file.id === event.file)) {
    next = { ...node, files: node.files.filter(file => file.id !== event.file) };
  } else if (node.kind === "labels" && event.kind === "labels.change") {
    next = { ...node, values: event.values };
  } else if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files" && node.kind !== "labels" &&
    (event.kind === "options.change" || event.kind === "money.change" || event.kind === "date.change")) {
    next = changeExtendedControl(node, event);
  } else throw new Error("INVALID_CONTROL_EVENT");
  return freezeDeep({ node: controlNode(next), rejected });
}
```

## src/interaction/control-specimens.ts

Source SHA-256: 2de61eb983d417f1f52eee0f2444417de5592eab05406a864ae2b33050e63610

```ts
import { controlNode, type ControlNode } from "./control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { controlInspection } from "./catalog-ownership.ts";
import { labelLimits } from "../labels.ts";

const sample = (state: string, node: ControlNode, releaseAfterMs?: number) => ({
  state, node: controlNode(node), ...(releaseAfterMs === undefined ? {} : { releaseAfterMs }),
});
const base = { version: "desert.control/1", disabled: false } as const;
const choices = [
  { value: "first", label: "First option", disabled: false },
  { value: "second", label: "Second option", disabled: false },
  { value: "unavailable", label: "Unavailable option", disabled: true },
];
const information = [
  { kind: "text", text: "Contextual information stays connected to its trigger. Close to return to your work." },
  { kind: "fact", label: "Product execution", value: "Not installed" },
] as const;
const options = { ...base, kind: "options", minSelected: 1, selected: [], options: choices } as const;
const money = { ...base, kind: 'money', label: 'Amount', required: true, locale: 'es-AR',
  currencies: [{ code: 'ARS', scale: 2, face: { kind: 'flag', region: 'AR' } },
    { code: 'USD', scale: 2, face: { kind: 'flag', region: 'US' } }], currency: 'ARS', minorUnits: null } as const;
const image = { ...base, kind: "image", label: "Notebook cover", alt: "An open notebook with blue pages", aspect: "landscape" } as const;
const lockReleaseMs = 3000;

export const ControlSpecimens = freezeDeep(([
  { id: "control.select", family: "control", specimens: [
    sample("available", { ...base, kind: "select", id: "choice", label: "Single choice", required: false, value: null, options: choices }),
    sample("disabled", { ...base, kind: "select", id: "disabled-choice", label: "Disabled choice", disabled: true,
      required: false, value: "retained", options: [{ value: "retained", label: "Retained selection", disabled: false }] }),
    sample("contextual-selected", { ...base, kind: "select", id: "contextual-select", label: "Display mode", required: true, value: "first", options: choices }),
    sample("contextual-unavailable", { ...base, kind: "select", id: "unavailable-select", label: "Unavailable display mode", required: true, value: null, disabled: true, options: choices }),
    sample("input-empty", { ...base, kind: "select", id: "empty-select-input", label: "Required input", required: false, inputRequired: true, value: null, options: choices }),
    sample("input-clearable", { ...base, kind: "select", id: "clearable-select-input", label: "Required clearable input", required: false, inputRequired: true, value: "first", options: choices }),
    sample("input-retained", { ...base, kind: "select", id: "retained-select-input", label: "Retained input", required: true, inputRequired: true, value: "first", options: choices }),
  ] },
  { id: "control.popover", family: "control", specimens: [
    sample("available", { ...base, kind: "popover", id: "help", label: "Open contextual information", open: false,
      title: "Local interaction", content: information }),
    sample("locked", { ...base, kind: "popover", id: "locked-help", label: "Open locked information", open: false,
      locked: true, title: "Locked information", content: [{ kind: "text",
        text: `This isolated lock demonstration releases after ${lockReleaseMs / 1000} seconds. No product operation is running.` }] }, lockReleaseMs),
  ] },
  { id: "control.files", family: "control", specimens: [
    sample("empty", { ...base, kind: "files", id: "local-files", label: "Choose local text files",
      limits: { maxCount: 2, maxFileBytes: 10240, maxTotalBytes: 15360, accept: ["text/plain"] }, files: [] }),
  ] },
  { id: "control.labels", family: "control", specimens: [
    sample("empty", { ...base, kind: "labels", id: "labels-empty", label: "Labels", values: [], limits: labelLimits }),
    sample("value", { ...base, kind: "labels", id: "labels-value", label: "Labels", values: ["Work", "Personal"], limits: labelLimits }),
    sample("disabled", { ...base, kind: "labels", id: "labels-disabled", label: "Labels", values: ["Work"], disabled: true, limits: labelLimits }),
  ] },
  { id: "control.options", family: "control", specimens: [
    sample("one", { ...options, id: "one-choice", label: "Choose one option", maxSelected: 1 }),
    sample("many", { ...options, id: "many-choices", label: "Choose up to two options", maxSelected: 2 }),
    sample("disabled", { ...options, id: "disabled-options", label: "Retained choice", maxSelected: 1,
      disabled: true, selected: ['first'] }),
    sample("constrained", { ...options, id: "constrained-options", label: "Keep one or two options", maxSelected: 2,
      selected: ['first', 'second'], options: [...choices, { value: 'third', label: 'Third option', disabled: false }] }),
    sample("contextual-selected", { ...options, id: "contextual-selected-options", label: "Display mode", maxSelected: 1, selected: ['first'] }),
    sample("input-empty", { ...options, id: "input-empty-options", label: "Required input", inputRequired: true, maxSelected: 1 }),
    sample("input-selected", { ...options, id: "input-selected-options", label: "Retained input", inputRequired: true, maxSelected: 1, selected: ['first'] }),
    sample("input-multiple", { ...options, id: "input-multiple-options", label: "Required choices", inputRequired: true, maxSelected: 2 }),
  ] },
  { id: "control.money", family: "control", specimens: [
    sample("empty", { ...money, id: 'amount' }),
    sample("value", { ...money, id: 'amount-value', minorUnits: '12550' }),
    sample("disabled", { ...money, id: 'amount-disabled', disabled: true, minorUnits: '12550' }),
    sample("constrained", { ...money, id: 'amount-whole-yen', label: 'Whole yen', locale: 'en-US',
      currencies: [{ code: 'JPY', scale: 0 }], currency: 'JPY', minorUnits: '2500' }),
  ] },
  { id: "control.date", family: "control", specimens: [
    sample("calendar", { ...base, kind: "date", id: "date", label: "Date", required: true, value: "2026-10-15",
      minimum: "2026-10-01", maximum: "2026-12-31" }),
  ] },
  { id: "control.tag", family: "control", specimens: [
    ...(["neutral", "accent", "success", "warning", "destructive"] as const).map(tone =>
      sample(tone, { ...base, kind: "tag", id: `tag-${tone}`, label: tone === "success" ? "Ready" : tone === "destructive" ? "Failed" : tone === "warning" ? "Attention" : tone === "accent" ? "In progress" : "Draft", tone })),
  ] },
  { id: "control.image", family: "control", specimens: [
    sample("available", { ...image, id: "cover", source: "/bank-image.svg" }),
    sample("unavailable", { ...image, id: "missing-cover", source: null }),
  ] },
  { id: "control.avatar", family: "control", specimens: [
    sample("image", { ...base, kind: "avatar", id: "author-photo", label: "Alex Rivera", source: "/bank-image.svg", fallback: "AR" }),
    sample("fallback", { ...base, kind: "avatar", id: "author-initials", label: "Sam Lee", source: null, fallback: "SL" }),
  ] },
] as const).map(entry => {
  const local = entry.specimens.find(specimen => specimen.state === 'value') ?? entry.specimens[0];
  const specimens = ['control.select','control.files','control.labels','control.options','control.money','control.date'].includes(entry.id)
    ? [...entry.specimens, ...(['loading','offline'] as const).map(state=>sample(state, {
      ...local.node, id:`${entry.id}-${state}`,
      disabled:state==='loading'||local.node.kind==='select'||local.node.kind==='options',
    }))] : entry.specimens;
  return {...entry,specimens,inspection:controlInspection(entry.id.slice(8),specimens.map(specimen=>specimen.state))};
}));
```

## src/interaction/extended-nodes.ts

Source SHA-256: d638407385e3d4727298fca3ea0a1e927b28b149bc907af4fedeca90b6bc82c0

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { InputMaskSchema } from "./input-mask.ts";
import { MoneyMinorUnitsLimit } from "./money.ts";
import { AssetReferenceSchema } from "../assets/types.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
const option = object({ value: text(), label: text(), disabled: Type.Boolean(), description: Type.Optional(text()) });
const day = Type.String({ pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" });
const minor = Type.String({ pattern: "^-?(0|[1-9][0-9]*)$", maxLength: MoneyMinorUnitsLimit });
const source = Type.Union([Type.Null(), Type.String({ pattern: "^/(?!/)[^\\\\\\s]*$" }),
  object({ asset: Type.String({ pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]*$" }) }), AssetReferenceSchema]);

export const OptionsNodeSchema = object({ ...base, kind: Type.Literal("options"),
  inputRequired: Type.Optional(Type.Boolean()),
  minSelected: integer(), maxSelected: integer(1), selected: Type.Array(text(), { uniqueItems: true }),
  options: Type.Array(option, { minItems: 1 }) });
export const MoneyNodeSchema = object({ ...base, kind: Type.Literal("money"), required: Type.Boolean(),
  locale: Type.Optional(InputMaskSchema.properties.locale),
  currencies: Type.Array(object({ code: Type.String({ pattern: "^[A-Z]{3}$" }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
    face: Type.Optional(FaceSchema) }), { minItems: 1 }),
  currency: text(), minorUnits: Type.Union([Type.Null(), minor]) });
export const DateNodeSchema = object({ ...base, kind: Type.Literal("date"), required: Type.Boolean(),
  value: Type.Union([Type.Null(), day]), minimum: Type.Optional(day), maximum: Type.Optional(day) });
/** The tones a tag carries: neutral, or a semantic accent the tag pairs with its text. */
export const TagToneSchema = Type.Union([Type.Literal("neutral"), Type.Literal("accent"), Type.Literal("success"), Type.Literal("warning"),
  Type.Literal("destructive")]);
export const TagNodeSchema = object({ ...base, kind: Type.Literal("tag"), tone: TagToneSchema });
export const ImageNodeSchema = object({ ...base, kind: Type.Literal("image"), source, alt: text(),
  aspect: Type.Union([Type.Literal("square"), Type.Literal("landscape"), Type.Literal("portrait")]) });
export const AvatarNodeSchema = object({ ...base, kind: Type.Literal("avatar"), source,
  fallback: Type.String({ minLength: 1, maxLength: 4 }) });
export const ExtendedNodeSchemas = [OptionsNodeSchema, MoneyNodeSchema, DateNodeSchema, TagNodeSchema, ImageNodeSchema, AvatarNodeSchema] as const;
export const ExtendedNodeSchema = Type.Union([...ExtendedNodeSchemas]);
export type ExtendedNode = Frozen<Static<typeof ExtendedNodeSchema>>;
export type OptionsNode = Extract<ExtendedNode, { kind: "options" }>;
export type MoneyNode = Extract<ExtendedNode, { kind: "money" }>;
export type DateNode = Extract<ExtendedNode, { kind: "date" }>;
export type TagNode = Extract<ExtendedNode, { kind: "tag" }>;
export type ImageNode = Extract<ExtendedNode, { kind: "image" }>;
export type AvatarNode = Extract<ExtendedNode, { kind: "avatar" }>;

export const ExtendedEventSchemas = [
  object({ kind: Type.Literal("options.change"), control: text(), selected: Type.Array(text(), { uniqueItems: true }) }),
  object({ kind: Type.Literal("money.change"), control: text(), currency: text(), minorUnits: Type.Union([Type.Null(), minor]) }),
  object({ kind: Type.Literal("date.change"), control: text(), value: Type.Union([Type.Null(), day]) }),
] as const;
export const ExtendedEventSchema = Type.Union([...ExtendedEventSchemas]);
export type ExtendedEvent = Frozen<Static<typeof ExtendedEventSchema>>;
```

## src/interaction/extended-controls.ts

Source SHA-256: 38c9f43b1af4bd0272ce8e4ce5236621c553a775d6c6bc42cc93122205b1a041

```ts
import type { ExtendedNode, ExtendedEvent, OptionsNode } from "./extended-nodes.ts";
import { inputMask } from "./input-mask.ts";

/** Cardinality belongs to the value, not to a journey. Contextual commands never
 * become required inputs merely because they retain at least one selection. */
export function optionsInputRequired(node: OptionsNode): boolean {
  return node.inputRequired === true && node.minSelected > 0 &&
    (node.maxSelected !== 1 || node.selected.length === 0);
}

/** The view and reducer ask this same law before offering or accepting an edit.
 * Requiredness is validation, not an editing lock: incomplete drafts remain legal. */
export function permitsOptionsSelection(node: OptionsNode, selected: readonly string[]): boolean {
  return !node.disabled && new Set(selected).size === selected.length && selected.length <= node.maxSelected &&
    selected.every(value => node.options.some(option => option.value === value && (!option.disabled || node.selected.includes(value)))) &&
    node.options.every(option => !option.disabled || node.selected.includes(option.value) === selected.includes(option.value));
}

function validDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const leap = year! % 4 === 0 && (year! % 100 !== 0 || year! % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return year! >= 1 && month! >= 1 && month! <= 12 && day! >= 1 && day! <= days[month! - 1]!;
}

export function checkExtendedControl(node: ExtendedNode) {
  if (node.kind === "options") {
    const values = node.options.map(option => option.value);
    if (new Set(values).size !== values.length || node.minSelected > node.maxSelected ||
      node.maxSelected > values.length || node.selected.length > node.maxSelected ||
      node.selected.some(value => !values.includes(value))) throw new Error("INVALID_CONTROL_SELECTION");
  }
  if (node.kind === "money") {
    const codes = node.currencies.map(currency => currency.code);
    if (new Set(codes).size !== codes.length || !codes.includes(node.currency)) throw new Error("INVALID_MONEY_CURRENCY");
    inputMask({ kind: "decimal", locale: node.locale ?? "en-US", scale: node.currencies.find(item => item.code === node.currency)!.scale });
  }
  if (node.kind === "date") {
    if ([node.value, node.minimum, node.maximum].some(value => value != null && !validDate(value)) ||
      (node.minimum && node.maximum && node.minimum > node.maximum) ||
      (node.value && ((node.minimum && node.value < node.minimum) || (node.maximum && node.value > node.maximum)))) {
      throw new Error("INVALID_CALENDAR_DATE");
    }
  }
}

export function changeExtendedControl(node: ExtendedNode, event: ExtendedEvent): ExtendedNode {
  if (node.kind === "options" && event.kind === "options.change") {
    if (!permitsOptionsSelection(node, event.selected)) throw new Error("INVALID_CONTROL_EVENT");
    return { ...node, selected: event.selected };
  }
  if (node.kind === "money" && event.kind === "money.change") return { ...node, currency: event.currency, minorUnits: event.minorUnits };
  if (node.kind === "date" && event.kind === "date.change") return { ...node, value: event.value };
  throw new Error("INVALID_CONTROL_EVENT");
}
```

## src/interaction/money.ts

Source SHA-256: 958472c0632ef2d58e8db7ad15d24294507dc50d6f733da0d83ec618f4769871

```ts
export function parseAmount(value: string, scale: number): string | null {
  if (value === "") return null;
  if (!Number.isInteger(scale) || scale < 0 || scale > 6 || !/^-?\d+(\.\d+)?$/.test(value)) {
    throw new Error("INVALID_MONEY_AMOUNT");
  }
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  if (fraction.length > scale) throw new Error("MONEY_PRECISION_EXCEEDED");
  const minor = BigInt(whole! + fraction.padEnd(scale, "0"));
  const result = (negative ? -minor : minor).toString();
  if (result.length > MoneyMinorUnitsLimit) throw new Error("MONEY_AMOUNT_TOO_LARGE");
  return result;
}

export function displayAmount(minorUnits: string | null, scale: number): string {
  if (minorUnits === null) return "";
  const negative = minorUnits.startsWith("-");
  const digits = minorUnits.replace(/^-/, "").padStart(scale + 1, "0");
  return `${negative ? "-" : ""}${scale ? `${digits.slice(0, -scale)}.${digits.slice(-scale)}` : digits}`;
}
export const MoneyMinorUnitsLimit = 80;
```

## src/interaction/input-mask.ts

Source SHA-256: bdc1ad79df040d5a5d090f3a6f0f13806fc2b8806457d7048cb38e91e2330b3c

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { decimalMaskLocale } from "./decimal-mask-locale.ts";

/** Installed editing syntax, not a domain value or an alternate domain validator. */
export const InputMaskSchema = Type.Object({ kind: Type.Literal("decimal"),
  locale: Type.String({ minLength: 1 }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
}, { additionalProperties: false });
export type InputMask = Frozen<Static<typeof InputMaskSchema>>;
export type MaskedValue = Readonly<{ value: string; valid: boolean; complete: boolean }>;

export function inputMask(value: unknown): InputMask {
  const snapshot = jsonSnapshot(value);
  if (!Check(InputMaskSchema, snapshot)) throw new Error("INVALID_INPUT_MASK");
  decimalMaskLocale(snapshot.locale);
  return freezeDeep(snapshot);
}

export function maskSeparators(mask: InputMask): { group: string; decimal: string } {
  const { group, decimal } = decimalMaskLocale(inputMask(mask).locale);
  return { group, decimal };
}

function lexical(value: string, scale: number): boolean {
  return value === "" || value === "-" || /^-?\d+(?:\.\d*)?$/.test(value) &&
    (value.split(".")[1]?.length ?? 0) <= scale;
}

/** Preserve writing (including zeros and a trailing decimal); never normalize or round it. */
export function formatMaskedValue(canonical: string, mask: InputMask): string {
  const checked = inputMask(mask);
  if (!lexical(canonical, checked.scale) || canonical === "") return canonical;
  const locale = decimalMaskLocale(checked.locale);
  const negative = canonical.startsWith("-");
  if (canonical === "-") return locale.minus;
  const [whole, fraction] = (negative ? canonical.slice(1) : canonical).split(".");
  return `${negative ? locale.minus : ""}${locale.groupDigits(whole!)}${fraction === undefined ? "" : locale.decimal + fraction}`;
}

/** Paste is strict; native edits may temporarily displace only known integer-group marks. */
export function readMaskedValue(display: string, mask: InputMask, strictGrouping = true): MaskedValue {
  const checked = inputMask(mask);
  const locale = decimalMaskLocale(checked.locale);
  const invalid = (): MaskedValue => ({ value: display, valid: false, complete: false });
  if (display === "") return { value: "", valid: true, complete: true };
  const negative = display.startsWith(locale.minus) || display.startsWith("-");
  const unsigned = negative ? display.slice(display.startsWith(locale.minus) ? locale.minus.length : 1) : display;
  if (negative && unsigned === "") return { value: "-", valid: true, complete: false };
  const pieces = unsigned.split(locale.decimal);
  if (pieces.length > 2) return invalid();
  const [whole, fraction] = pieces;
  const digits = whole!.split(locale.group).join("");
  if (!/^\d+$/.test(digits) || (fraction !== undefined && !/^\d*$/.test(fraction))) return invalid();
  if (strictGrouping && whole!.includes(locale.group) && locale.groupDigits(digits) !== whole) return invalid();
  const value = `${negative ? "-" : ""}${digits}${fraction === undefined ? "" : `.${fraction}`}`;
  if (!lexical(value, checked.scale)) return invalid();
  return { value, valid: true, complete: fraction !== "" };
}
```

## src/interaction/decimal-mask-locale.ts

Source SHA-256: 8aaa5acdfe8440a116ba0e68e484b204cc7ef7a0e0ce6d55585977fb1624a710

```ts
type DecimalLocale = Readonly<{
  decimal: string; group: string; minus: string; groupDigits: (digits: string) => string;
}>;
const locales = new Map<string, DecimalLocale>();
const unsupported = (): never => { throw new Error("UNSUPPORTED_INPUT_MASK_LOCALE"); };

/** Learn punctuation and grouping from Intl; amount digits never enter Number arithmetic. */
export function decimalMaskLocale(locale: string): DecimalLocale {
  const cached = locales.get(locale);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    if (Intl.NumberFormat.supportedLocalesOf([locale], { localeMatcher: "lookup" }).length !== 1) unsupported();
    formatter = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: "auto" });
  } catch { return unsupported(); }
  if (formatter.resolvedOptions().numberingSystem !== "latn") unsupported();
  const signed = formatter.formatToParts(-1.1);
  // Affixes/bidi literals require an explicit adapter; silently dropping them would guess.
  if (signed.some(part => !["minusSign", "integer", "decimal", "fraction"].includes(part.type))) unsupported();
  const decimal = signed.find(part => part.type === "decimal")?.value;
  const minus = signed.find(part => part.type === "minusSign")?.value;
  const probe = "123456789012345678901234";
  const parts = formatter.formatToParts(BigInt(probe));
  const groups = parts.filter(part => part.type === "group").map(part => part.value);
  const integers = parts.filter(part => part.type === "integer").map(part => part.value);
  const group = groups[0];
  if (!decimal || !minus || !group || decimal === group || group === minus || decimal === minus ||
    /[0-9]/.test(decimal + group + minus) || groups.some(value => value !== group) ||
    parts.some(part => part.type !== "integer" && part.type !== "group") || integers.join("") !== probe) return unsupported();
  const primary = integers.at(-1)!.length;
  const secondary = integers.at(-2)!.length;
  if (!primary || !secondary || integers.slice(1, -1).some(value => value.length !== secondary)) unsupported();
  let minimum = 1;
  while (minimum <= probe.length && !formatter.formatToParts(BigInt(`1${"0".repeat(minimum - 1)}`))
    .some(part => part.type === "group")) minimum += 1;
  if (minimum > probe.length) unsupported();
  function groupDigits(digits: string): string {
    if (digits.length < minimum) return digits;
    const chunks = [digits.slice(-primary)];
    let end = digits.length - primary;
    while (end > 0) { chunks.push(digits.slice(Math.max(0, end - secondary), end)); end -= secondary; }
    return chunks.reverse().join(group);
  }
  const result = Object.freeze({ decimal, group, minus, groupDigits });
  locales.set(locale, result);
  return result;
}
```

## src/interaction/information-content.ts

Source SHA-256: 3648f8ffe4c3858b22b4494c7f22f7a830424350059b891747dcd8371e69572e

```ts
import { Type } from "@sinclair/typebox";

const text = () => Type.String({ minLength: 1 });
/** Closed, ordered information only; no markup, styling, or renderer callbacks. */
export const InformationItemSchema = Type.Union([
  Type.Object({ kind: Type.Literal("text"), text: text() }, { additionalProperties: false }),
  Type.Object({ kind: Type.Literal("fact"), label: text(), value: Type.Union([Type.String(), Type.Null()]) },
    { additionalProperties: false }),
]);
export const InformationSchema = Type.Object({ kind: Type.Literal("information"),
  items: Type.Array(InformationItemSchema, { minItems: 1 }),
}, { additionalProperties: false });
```

## src/svelte/catalog/compositions/toolbar/Toolbar.svelte

Source SHA-256: 95d6500ce603f7e812ae79ce8d0833a8ae5732a509302ab5ded2c8116684a0f5

```svelte
<script lang="ts">
  import { submitsJourney } from "../../../../interaction/intent.ts";
  import type { ToolbarAction } from "../../../../interaction/toolbar.ts";
  import type { BarCommand } from "../../../infra/bar-command.ts";
  import { Bar } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { toolbar, invoke, submit, presentation = "standard" }: CatalogProps<"toolbar"> = $props();
  // The command that runs the frame's form journey submits that form; every other command invokes its intent.
  const command = (action: ToolbarAction): BarCommand =>
    submit && submitsJourney(action.intent, submit.journey) ? { ...action, submit: submit.form } : action;
</script>

{#if toolbar.edge === "top"}
  <Bar edge="top" purpose="commands" identity={{ title: toolbar.title, subtitle: toolbar.subtitle }}
    identityRole={presentation === "message" ? "message" : "heading"} face={toolbar.face} leading={toolbar.leading}
    trailing={toolbar.trailing ?? []} group={toolbar.actionGroup} primary={toolbar.primary && command(toolbar.primary)}
    availability={toolbar.availability} settingsPlaceholder={false} inert={false} oninvoke={invoke} />
{:else}
  <Bar edge="bottom" purpose={toolbar.navigation === "steps" ? "steps" : "commit"} identityRole="heading" trailing={[]}
    secondary={toolbar.secondary} primary={toolbar.primary && command(toolbar.primary)} settingsPlaceholder={false} inert={false}
    oninvoke={invoke} />
{/if}
```

## src/svelte/catalog/foundations/face/Face.svelte

Source SHA-256: 2422851544aa9aa5eb55cbf79c33412f7ecff38d24e330f05cda17b96a3864eb

```svelte
<script lang="ts">
  import { actionIconNames } from '../../../infra/action-icons.ts';
  import { Icon } from '../../index.ts';
  import type { CatalogProps } from "../../types.d.ts";
  let { face, compact = false }: CatalogProps<"face"> = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
</script>
<!-- The face draws its own round mark: its fill and border come from the theme's tm-face utility. -->
<div class="bank-face tm-face relative flex shrink-0 select-none overflow-hidden rounded-[30%] after:pointer-events-none after:absolute after:inset-0 after:rounded-[30%] after:border"
  class:face-warning={face.kind === "status" && face.severity === "warning"} class:face-error={face.kind === "status" && face.severity === "error"}
  data-piece="face" data-face-kind={face.kind} data-compact={compact || undefined}
  data-tone={face.kind === "status" ? face.severity : "neutral"} aria-hidden="true">
  <span class="face-content type-body flex size-full items-center justify-center rounded-[inherit]" data-face-content>
    {#if face.kind === 'icon'}<Icon name={actionIconNames[face.icon]} size="mark" />{:else if face.kind === "status"}<Icon name="circle-alert" size="mark" />{:else if face.kind === "document"}<Icon name="file-text" size="mark" />{:else}<span class="face-glyph" data-face-glyph>{glyph}</span>{/if}
  </span>
</div>

<style>
  /* Base geometry sits in the components layer, as in theme.css, so contextual rules keep their precedence. */
  @layer components {
    /* A host sizes the face through --face-size (the toolbar's); compact is the smaller mark of a dense list. */
    .bank-face { width:var(--face-size,2rem); height:var(--face-size,2rem); color:var(--muted-foreground); }
    .bank-face[data-compact] { width:1.5rem; height:1.5rem; }
    .face-glyph { font-size:calc(var(--face-size,2rem) * .6); line-height:1; }
    .bank-face[data-compact] .face-glyph { font-size:calc(1.5rem * .6); }
    .bank-face[data-face-kind="flag"] .face-glyph { font-family:"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif; }
    .face-warning { --face-tone:var(--warning); color:var(--face-tone); }
    .face-error { --face-tone:var(--destructive); color:var(--face-tone); }
  }
</style>
```

## src/svelte/catalog/foundations/field-well/FieldWell.svelte

Source SHA-256: 293deeb114a8647416308a82158727e86e8d43f0cae40be21e04240105d10e86

```svelte
<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { FieldWellContent } from "../../index.ts";
  import { cn } from "../../../vendor/utils.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, label, filled, required = false, prefix, accessory, footer, children, presentation = "standard" }: CatalogProps<"field-well"> = $props();
  function focusEditor(event: MouseEvent) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    if (event.target.closest('input, textarea, button, select, a, label, [contenteditable]')) return;
    const editor = document.getElementById(id);
    if ((editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) && !editor.disabled) {
      editor.focus({ preventScroll: true });
    }
  }
</script>
<Group.Root {presentation} onclick={focusEditor} class={cn("field-well overflow-hidden p-0", footer && "flex-col items-stretch")} data-floating-field data-field-focus="within" data-compound-field={!!prefix} data-filled={filled}>
  <div data-field-row class="flex w-full min-w-0 items-center">
    <FieldWellContent {id} {label} {required}>{@render children?.()}</FieldWellContent>
    {#if prefix}<Group.Addon align="inline-start" class="field-prefix">{@render prefix()}</Group.Addon>{/if}
    {@render accessory?.()}
  </div>
  {@render footer?.()}
</Group.Root>
```

## src/svelte/catalog/foundations/search-field/SearchField.svelte

Source SHA-256: abb3bec18b55386ea34a1cfb13dd568b4a80dcceca6d12c9a32e91eac366bd75

```svelte
<script lang="ts">
  import * as InputGroup from "../../../vendor/components/ui/input-group/index.js";
  import { Icon } from "../../index.ts";
  import { ClearInput } from "../../index.ts";

  const generatedId = $props.id();
  let { id = generatedId, value = $bindable(""), ref = $bindable(null), onvalue, disabled = false, readonly = false,
    placeholder, "aria-label": label, "aria-controls": controls, tabindex, onready }: {
    id?: string; placeholder?: string; disabled?: boolean; readonly?: boolean;
    "aria-label"?: string; "aria-controls"?: string; tabindex?: -1 | 0;
    value?: string; ref?: HTMLInputElement | null; onvalue?: (value: string) => void;
    onready?: (element: HTMLInputElement | null) => void;
  } = $props();
  let fieldId = $derived(id ?? generatedId);
  $effect(() => { onready?.(ref); return () => onready?.(null); });

  function update(next: string) { value = next; onvalue?.(next); }
</script>

<InputGroup.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined}
  onclick={event => {
    if (!(event.target as Element).closest("button,input")) ref?.focus({ preventScroll: true });
  }}>
  <InputGroup.Input id={fieldId} bind:ref type="search" {value} {disabled} {readonly}
    {placeholder} aria-label={label} aria-controls={controls} {tabindex}
    autocomplete="off" oninput={event => update(event.currentTarget.value)} />
  <InputGroup.Addon align="inline-start"><Icon name="search" search="leading" decorative /></InputGroup.Addon>
  <ClearInput control={fieldId} {value} label="Clear search" disabled={!!(disabled || readonly)} />
</InputGroup.Root>
```

## src/svelte/catalog/foundations/measured-field/MeasuredField.svelte

Source SHA-256: 589c0db710de5eccd4cc0c20d8c15d8c54b863111e562dc6039ec44b770f09e5

```svelte
<script lang="ts">
  import type { CatalogProps } from '../../types.d.ts';
  import * as Field from '../../../vendor/components/ui/field/index.js';
  // The outer box measures available space; the complete accessible field
  // (including validation/support) owns its preferred measure inside it.
  const measures = { 'input.text': 'writing', 'input.multiline': 'writing',
    'control.select': 'choice', 'control.date': 'date', 'control.money': 'amount' } as const satisfies Record<CatalogProps<'measured-field'>['kind'],string>;
  let { kind, children, invalid, disabled }: CatalogProps<'measured-field'> = $props();
</script>

<div data-control-measure={measures[kind]}>
  <Field.Field data-primitive={kind.startsWith('input.') ? kind : undefined}
    data-control={kind.startsWith('control.') ? kind.slice(8) : undefined}
    data-invalid={invalid} data-disabled={disabled}>{@render children?.()}</Field.Field>
</div>
```

## src/svelte/catalog/foundations/field/field-measure.css

Source SHA-256: 4852c117ca5bce4898c412555493ca0e5a55dcfa8832d08335bfb94b6313bdd1

```ts
/* A Field's preferred measure stays stable while editing. A 3rem residual strip is absorbed into the field. Queries
   measure the containing slot, never the device. `fill` takes the whole slot. `[data-control-measure]` is the box of
   the measured-field foundation, which its callers keep until they mount Field (Batch 3 deletes it). */
:is([data-measure], [data-control-measure]) { container:control-measure / inline-size; width:100%; min-width:0; align-self:stretch; }
:is([data-measure="writing"], [data-control-measure="writing"]) { --control-preferred:32rem; }
:is([data-measure="choice"], [data-control-measure="choice"]) { --control-preferred:26rem; }
:is([data-measure="date"], [data-control-measure="date"]) { --control-preferred:20rem; }
:is([data-measure="amount"], [data-control-measure="amount"]) { --control-preferred:22rem; }
[data-measure="fill"] { --control-preferred:none; }
:is([data-measure], [data-control-measure]) > [data-slot="field"] { width:100%; min-width:0; max-width:var(--control-preferred); margin-inline:0; }
/* Each cutoff is the preferred measure above plus the same 3rem allowance.
   No width transition: resizing must not chase the pointer or reflow text late. */
@container control-measure (max-width:35rem) {
  :is([data-measure="writing"], [data-control-measure="writing"]) > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:29rem) {
  :is([data-measure="choice"], [data-control-measure="choice"]) > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:23rem) {
  :is([data-measure="date"], [data-control-measure="date"]) > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:25rem) {
  :is([data-measure="amount"], [data-control-measure="amount"]) > [data-slot="field"] { max-width:none; }
}
```

## src/svelte/catalog/foundations/grouped-panel/GroupedPanel.svelte

Source SHA-256: 2b58281a3deb333667d4586c6377154dca80eb53518481853a663287ac455962

```svelte
<script lang="ts">
  import * as Card from "../../../vendor/components/ui/card/index.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { children, measure = 'reading' }: CatalogProps<"grouped-panel"> = $props();
</script>

<!-- One shared pane for sibling rows; Stack only supplies hierarchy. -->
<div data-reading-measure={measure === 'reading' || undefined}>
  <Card.Root class="grouped-panel" data-grouped-panel>{@render children?.()}</Card.Root>
</div>
```

## src/svelte/catalog/foundations/choice-row/ChoiceRow.svelte

Source SHA-256: 3c393362e4996817028b17b776838635245c016cec4315798b6f6bb161e5b0f3

```svelte
<script lang="ts">
  import * as Field from "../../../vendor/components/ui/field/index.js";
  import { ChoiceItem } from "../../index.ts";
  // lane-merge (lane N): press feedback moved to the press-feedback mechanism; Batch 3 deletes this folder.
  import { pressFeedback } from "../../mechanisms/press-feedback/press-feedback.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, labelId, descriptionId, label, description, disabled, children }: CatalogProps<"choice-row"> = $props();
  let row = $state<HTMLLabelElement | null>(null);
  $effect(() => { if (row) return pressFeedback(row); });
</script>

<Field.FieldLabel bind:ref={row} for={id} class="control-feedback material-interior" aria-disabled={disabled} data-grouped-row data-choice-row>
  <ChoiceItem {label} {labelId} {description} {descriptionId}>
    {@render children?.()}
  </ChoiceItem>
</Field.FieldLabel>
```

## src/svelte/catalog/foundations/selection-field/SelectionField.svelte

Source SHA-256: b37a5b847c8581cc3471529ae9adbd711d4bdc9c5aecde2702bc187a01d87697

```svelte
<script lang="ts">
  import { tick, untrack, type Snippet } from "svelte";
  import { dismissWhenInactive } from '../../../infra/surface-activity.svelte.ts';
  import { useSurfaceDensityClass } from "../../../infra/surface-typography.svelte.ts";
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { FieldWellContent } from "../../index.ts";
  import { Face } from "../../index.ts";
  import { PickerSheet } from "../../index.ts";
  import SelectionList from "./SelectionList.svelte";
  import { surfaceFocus, revealSurfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  // F1-merge: absorbed by Choice (which opens through Popover); its composition callers move to Choice (lane B) and this
  // folder, with its import of the popover part, goes in Batch 3.
  import { PickerPresentation, pickerBudget } from "../popover/picker-presentation.svelte.ts";
  import type { SelectionOption } from "../../../../interaction/selection-option.ts";
  let { id, selection, label, triggerLabel = label, value, options, disabled = false, required = false,
    fieldControl = false, contextual = false, selectedContent, optionLeading, onchange }: {
    id?: string; selection: string; label: string; triggerLabel?: string; value: string | null;
    options: readonly (SelectionOption & { readonly description?: string })[];
    disabled?: boolean; required?: boolean; fieldControl?: boolean; contextual?: boolean; onchange: (value: string) => void;
    selectedContent?: Snippet<[SelectionOption | undefined]>;
    optionLeading?: Snippet<[SelectionOption]>;
  } = $props();
  const generatedId = $props.id();
  const picker = new PickerPresentation(() => pickerBudget);
  let triggerId = $derived(id ?? generatedId);
  let selectedOption = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(selectedOption?.label ?? "Not selected");
  let open = $state(false);
  let activeValue = $state<string | null>(null);
  let list = $state<HTMLDivElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  const boundary = () => list?.closest<HTMLElement>('[data-picker-sheet],[data-slot="popover-content"]') ?? null;
  const initialFocus = surfaceFocus(boundary);
  // The anchored surface owns its focus scope; focus moving anywhere but the trigger dismisses it.
  let selectionSurface = $state<HTMLElement | null>(null);
  const surface = surfaceFocus(() => selectionSurface, event => {
    if (!(event.target instanceof HTMLElement) || event.target.id !== triggerId) open = false;
  });
  const density = useSurfaceDensityClass();
  function focus(event: Event) {
    void tick().then(() => { focusBoundary = boundary() ?? focusBoundary; });
    const retained = activeValue;
    if (!retained) { initialFocus(event); return; }
    event.preventDefault();
    void tick().then(() => {
      const target = [...list?.querySelectorAll<HTMLElement>('[role="option"]') ?? []]
        .find(option => option.dataset.value === retained && option.getAttribute('aria-disabled') !== 'true');
      const surface = boundary();
      if (!open || !surface) return;
      if (!target) { initialFocus(event); return; }
      target.focus({ preventScroll: true }); revealSurfaceFocus(target, surface);
    });
  }
  function restore(event: Event) {
    event.preventDefault();
    const active = document.activeElement;
    if (!open && (!active || active === document.body || focusBoundary?.contains(active)))
      document.getElementById(triggerId)?.focus({ preventScroll: true });
  }
  $effect(() => { if (!open) activeValue = null; });
  dismissWhenInactive(() => { open = false; });
  let observed = untrack(() => selection);
  $effect(() => {
    const next = selection, unavailable = disabled;
    untrack(() => { if (unavailable || next !== observed) open = false; observed = next; });
  });
  function change(next: string) {
    if (!disabled && next !== value && options.some(option => option.value === next && !option.disabled)) onchange(next);
  }
</script>
{#snippet selectedValue()}
  {#if selectedContent}{@render selectedContent(selectedOption)}{:else}
  <span class="selection-value" data-contextual={contextual || undefined}>
    {#if selectedOption?.face}<Face face={selectedOption.face} compact />{/if}
    <span class="selection-label">{valueLabel}</span>
  </span>
  {/if}
{/snippet}
{#snippet choices()}
  <SelectionList {label} {value} {options} {optionLeading} {required} bind:activeValue bind:ref={list}
    onchange={change} onclose={() => { open = false; }} />
{/snippet}
<Popover.Root bind:open>
  <Popover.Trigger id={triggerId} {disabled}>
    {#snippet child({ props })}
    <Button {...props} {disabled} wrap variant={fieldControl ? 'well' : 'field'} size={fieldControl ? 'well' : 'default'}
      data-slot="select-trigger" data-floating-field={fieldControl || undefined} data-filled={fieldControl || undefined}
      presentation={fieldControl ? 'selection-well' : contextual ? 'selection-context' : 'selection-inline'}
      aria-haspopup="listbox" aria-controls={open ? list?.id : undefined}
      aria-label={fieldControl ? `${label} · ${valueLabel}` : triggerLabel}
      aria-describedby={required ? `${triggerId}-requirement` : undefined} data-selection-trigger
      onkeydown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open = true; }
        else if (typeof props.onkeydown === 'function') props.onkeydown(event);
      }}>
    {#if fieldControl}
      <FieldWellContent {label} {required}>
        <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
          {@render selectedValue()}
          <Icon name="chevron-down" placement="inline-end" chevron decorative />
        </span>
      </FieldWellContent>
    {:else}
      {@render selectedValue()}
      <Icon name="chevron-down" placement="inline-end" chevron decorative />
    {/if}
    </Button>
    {/snippet}
  </Popover.Trigger>
  {#if picker.current === "sheet"}
    <PickerSheet bind:open {label} {triggerId} onOpenAutoFocus={focus}>
      {@render choices()}
    </PickerSheet>
  {:else}
    <Popover.Content bind:ref={selectionSurface} role="presentation" class={density()} presentation="selection"
      onOpenAutoFocus={event => surface.open(event, focus)} onCloseAutoFocus={event => surface.close(event, restore)}>
      {@render choices()}
    </Popover.Content>
  {/if}
</Popover.Root>
{#if required}<span id={`${triggerId}-requirement`} class="sr-only">Required</span>{/if}
<style>
  .selection-value { display:flex; flex:1; min-width:0; align-items:center; gap:.5rem; }
  .selection-value[data-contextual] { justify-content:flex-end; text-align:end; }
  .selection-label { min-width:0; white-space:normal; overflow-wrap:anywhere; text-wrap:balance; }
</style>
```

## src/svelte/catalog/compositions/collection-state/CollectionState.svelte

Source SHA-256: 2dd45bbbf5e91c5b83fecb441ed60e8ae6fede0d34f614039184a18e0722e0de

```svelte
<script lang="ts">
  import { List, Loading, Status } from "../../index.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { loaded, createLabel, connection }: CatalogProps<"collection-state"> = $props();
  let offline = $derived(connection === 'offline');
  let pending = $derived(!loaded && !offline);
</script>
<List kind="rows" measure="reading" label={say(m.collectionState.label)} busy={pending}>
  {#if pending}<Loading kind="lines" inset="block" label={say(m.collectionState.loading)} />
  {:else if offline}<Status tone="offline" size="regular" heading title={say(m.collectionState.offlineTitle)}
    description={say(m.collectionState.offlineDescription)} />
  {:else}<Status tone="neutral" size="regular" heading title={say(m.collectionState.emptyTitle)}
    description={createLabel ? say(m.collectionState.emptyDescription, { command: createLabel }) : undefined} />{/if}
</List>
```

## src/svelte/catalog/foundations/action/Action.svelte

Source SHA-256: 0f3413874945210d81ff9f660178d8672ff55a0f0e1c07142e0562f22b07a702

```svelte
<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { cn } from "../../../vendor/utils.js";
  import { actionIconNames } from "../../../infra/action-icons.ts";
  import { Icon } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, icon, state: status, emphasis, face: shown, type, reason, form, disclosure, current, onclick }: CatalogProps<"action"> = $props();
  const id = $props.id();
  const descriptionId = `${id}-reason`;
  const variants = { primary: "default", secondary: "secondary", destructive: "destructive" } as const;
  let button = $state<HTMLButtonElement | null>(null);
  let caption = $state<HTMLSpanElement | null>(null);
  let compact = $state(false);
  // Only the `fit` face measures: it shows the icon once the label no longer fits. `text` keeps its label, `icon` its glyph.
  let face = $derived(status === "pending" ? "pending" : shown === "icon" || shown === "fit" && compact ? "icon" : "label");
  $effect(() => {
    label;
    if (shown !== "fit" || !button || !caption) { compact = false; return; }
    const element = button, text = caption;
    const measure = () => { compact = text.scrollWidth > text.clientWidth + 1; };
    const observer = new ResizeObserver(measure);
    observer.observe(element); observer.observe(text); measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
<Button bind:ref={button} variant={variants[emphasis]} size={shown === "icon" ? "icon-lg" : "default"} spin={status === "pending"}
  {type} {form} id={disclosure?.id} aria-haspopup={disclosure?.haspopup} aria-expanded={disclosure?.expanded}
  aria-controls={disclosure?.expanded ? disclosure.controls : undefined}
  data-state={disclosure ? disclosure.expanded ? "open" : "closed" : undefined} aria-current={current || undefined}
  onclick={() => { if (status === "ready") onclick?.(); }} class="relative min-w-0 overflow-hidden {shown === 'icon' ? '' : 'w-fit max-w-[min(100%,22rem)]'}"
  disabled={status !== "ready"} aria-busy={status === "pending"} aria-label={label} title={reason ?? (compact ? label : undefined)}
  aria-describedby={reason ? descriptionId : undefined}
  data-action="" data-action-face={face} data-emphasis={emphasis}>
  <span bind:this={caption} data-button-label aria-hidden="true" class={cn("min-w-0 truncate", face !== "label" && "invisible")}>{label}</span>
  <span class={cn("absolute inset-0 flex items-center justify-center", face === "label" && "invisible")}
    aria-hidden="true" data-button-glyph data-action-face={face}>
    <Icon name={status === "pending" ? "loader-circle" : actionIconNames[icon]} placement="inline-start" decorative />
  </span>
</Button>
{#if reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
```

## src/svelte/infra/action-icons.ts

Source SHA-256: fdc440c606348edfbc9837731b37dbe668b90956f47eac5726e23548a8cf69b2

```ts
import type { ActionIcon } from "../../interaction/toolbar.ts";

/** The icon (a name of the catalog's `icon` foundation) that draws each action icon. */
export const actionIconNames = {
  back: "arrow-left", close: "x", save: "save", review: "eye", recover: "search", retry: "rotate-cw",
  create: "plus", archive: "archive", catalog: "layout-grid", open: "arrow-right", confirm: "check", search: "search", more: "ellipsis", navigation: "panel-left",
  media: "images", edit: "pencil", settings: "settings", lock: "lock", restore: "undo-2", palette: "palette",
  play: "play", pause: "pause", volume: "volume-2", muted: "volume-x", previous: "chevron-left", next: "chevron-right",
  "zoom-in": "plus", "zoom-out": "minus",
} as const satisfies Record<ActionIcon, string>;
```

## src/svelte/vendor/components/ui/button/button.svelte

Source SHA-256: ca78a8615fd28a1b57fb9ef324244f2d3c7fd2607c88b0a83e08f8a42b4ff72b

```svelte
<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	/** The public buttonVariants contract. */
	export const buttonVariants = tv({
        base: "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-[var(--radius)] type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants: {
            spin: { true: "[&_svg[data-icon]]:animate-spin" },
            variant: {
                default: "text-primary-foreground font-semibold",
                outline: "text-foreground",
                secondary: "text-secondary-foreground",
                ghost: "bg-transparent text-foreground",
                grip: "bg-transparent text-muted-foreground rounded-lg",
                destructive: "text-destructive",
                row: "bg-transparent text-foreground border-0 rounded-none justify-start whitespace-normal h-auto text-left font-normal w-full",
                field: "bg-transparent text-foreground border-0 rounded-none justify-start w-full font-normal",
                well: "text-foreground rounded-[var(--radius)] justify-start text-left whitespace-normal w-full font-normal",
            },
            size: {
                default: "min-h-11 px-4 py-2", xs: "min-h-6 px-2", sm: "min-h-9 px-3",
                icon: "size-10", "icon-xs": "size-6", "icon-sm": "size-9", "icon-lg": "size-11",
                row: "px-4 py-3", field: "min-h-10 px-3", well: "p-0",
                avatar: "size-[5.625rem] p-0 relative overflow-hidden rounded-full",
                "label-remove": "size-[28px] min-h-[28px] p-0 [@media(pointer:coarse)]:size-[44px] [@media(pointer:coarse)]:min-h-[44px]",
            },
        },
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	/** The public ButtonVariant contract. */
	export type ButtonVariant = VariantProps<typeof buttonVariants>["variant"];
	/** The public ButtonSize contract. */
	export type ButtonSize = VariantProps<typeof buttonVariants>["size"];

	/** The public ButtonProps contract. */
	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
			/** Rotate marked icons only; busy/disabled semantics remain the caller's responsibility. */
			spin?: boolean;
			presentation?: "standard" | "toolbar-return" | "search-toggle" | "media-tile" | "media-list-item" | "media-collection" | "media-cover-choice" | "record-row" | "selection-well" | "selection-inline" | "selection-context" | "summary-widget";
			searching?: boolean;
			/** Grouping and wrapping are finite recipe policies, never consumer CSS. */
			wrap?: boolean;
			onready?: (element: HTMLButtonElement | HTMLAnchorElement | null) => void;
		};
</script>

<script lang="ts">
	import { pressFeedbackProps } from "@desert/svelte/catalog/mechanisms/press-feedback/press-feedback.ts";
	import Search from "@lucide/svelte/icons/search";
	import X from "@lucide/svelte/icons/x";
	let {
		class: className,
		variant = "default",
		size = "default",
		spin = false,
		presentation = "standard",
		searching = false,
		wrap = false,
		onready,
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
	// The material is the variant's unless the caller names one (a sidebar row); prominence tints the pane.
	const interiors: readonly ButtonVariant[] = ["ghost", "grip", "row", "field"];
	let material = $derived(/\bmaterial-(?:pane|interior)\b/.test(cn(className)) ? undefined
		: interiors.includes(variant) ? "material-interior" : variant === "default" ? "material-pane material-pane-primary" : "material-pane");
	$effect(() => { onready?.(ref instanceof HTMLButtonElement || ref instanceof HTMLAnchorElement ? ref : null); return () => onready?.(null); });
</script>

{#if href}
	<a
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-summary-widget={presentation === "summary-widget" || undefined}
		data-media-grid-item={presentation === "media-tile" || presentation === "media-list-item" || undefined}
		data-media-list-item={presentation === "media-list-item" || undefined}
		data-media-collection-card={presentation === "media-collection" || undefined}
		data-media-reference-choice={presentation === "media-cover-choice" || undefined}
		class={cn(buttonVariants({ variant, size, spin }), material, variant === "grip" ? "control-focus" : "control-feedback", wrap && "max-w-full min-w-0 whitespace-normal text-balance h-auto", presentation.startsWith("selection-") && "w-fit max-w-full justify-between gap-3 rounded-[var(--radius)]", presentation === "selection-well" && "field-well overflow-hidden", presentation === "selection-context" && "justify-self-end", presentation === "record-row" && "record-button w-full min-h-11 text-start items-center justify-between gap-4 px-4 py-3 focus-visible:outline-offset-[-3px]", presentation === "toolbar-return" && "sr-only", className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
		data-variant={variant}
	>
		<span class="control-feedback-content" data-button-content>{@render children?.()}</span>
	</a>
{:else}
	<button
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-summary-widget={presentation === "summary-widget" || undefined}
		data-media-grid-item={presentation === "media-tile" || presentation === "media-list-item" || undefined}
		data-media-list-item={presentation === "media-list-item" || undefined}
		data-media-collection-card={presentation === "media-collection" || undefined}
		data-media-reference-choice={presentation === "media-cover-choice" || undefined}
		class={cn(buttonVariants({ variant, size, spin }), material, variant === "grip" ? "control-focus" : "control-feedback", wrap && "max-w-full min-w-0 whitespace-normal text-balance h-auto", presentation.startsWith("selection-") && "w-fit max-w-full justify-between gap-3 rounded-[var(--radius)]", presentation === "selection-well" && "field-well overflow-hidden", presentation === "selection-context" && "justify-self-end", presentation === "record-row" && "record-button w-full min-h-11 text-start items-center justify-between gap-4 px-4 py-3 focus-visible:outline-offset-[-3px]", presentation === "toolbar-return" && "sr-only", className)}
		data-toolbar-scroll-top={presentation === "toolbar-return" || undefined}
		data-catalog-search-toggle={presentation === "search-toggle" || undefined}
		data-catalog-search-cancel={presentation === "search-toggle" && searching || undefined}
		{type}
		{disabled}
		{...restProps}
		data-variant={variant}
	>
		<span class="control-feedback-content" data-button-content>{#if presentation === "search-toggle"}<Search data-search-icon="open" aria-hidden="true" /><X data-search-icon="close" aria-hidden="true" />{:else}{@render children?.()}{/if}</span>
	</button>
{/if}

<style>
  :global([data-summary-widget]) { width:min(100%,22rem); max-width:100%; min-width:0; min-height:13rem; padding:var(--space-4,1rem); border-radius:var(--radius-group); text-align:start; white-space:normal; align-items:stretch; }
  :global([data-summary-widget] > [data-button-content]) { display:flex; flex-direction:column; align-items:stretch; gap:var(--space-4,1rem); }
  @layer components {
    :global([data-slot="button"]) { min-height:2.75rem; }
    :global([data-button-content]) { position:relative; display:flex; width:100%; min-width:0; flex-direction:inherit; align-items:inherit; justify-content:inherit; gap:inherit; }
  }
  :global([data-catalog-search-toggle]) { position:relative; pointer-events:auto; }
  :global([data-catalog-search-toggle] [data-button-content]) { display:grid; place-items:center; }
  :global([data-catalog-search-toggle] svg) { grid-area:1/1; transition:opacity 180ms var(--ease-tm),transform 220ms var(--ease-tm); }
  :global([data-catalog-search-toggle] [data-search-icon="close"]) { opacity:0; transform:rotate(-90deg) scale(.75); }
  :global([data-catalog-search-actions][data-expanded="true"] [data-search-icon="open"]) { opacity:0; transform:rotate(90deg) scale(.75); }
  :global([data-catalog-search-actions][data-expanded="true"] [data-search-icon="close"]) { opacity:1; transform:none; }
  :global([data-media-reference-choice]) { position:relative; aspect-ratio:4/3; overflow:hidden; width:100%; }
  :global([data-media-reference-choice] [data-button-content]) { height:100%; }
  :global([data-media-collection-card]) { position:relative; width:100%; display:block; overflow:hidden; text-align:start; }
  :global([data-media-collection-card] > [data-button-content]) { display:block; }
  :global([data-media-grid-item]) { position:relative; display:block; width:100%; aspect-ratio:4/3; overflow:hidden; border-radius:var(--radius); }
  :global([data-media-grid-item] > [data-button-content]) { height:100%; }
  :global([data-media-grid-item][aria-current="true"]) { outline:2px solid var(--primary); outline-offset:2px; }
  :global([data-media-list-item]) { aspect-ratio:auto; border-radius:0; }
  :global([data-media-list-item] > [data-button-content]) { display:flex; align-items:center; gap:var(--stack-gap,16px); padding:12px 16px; }
</style>
```

## src/svelte/catalog/mechanisms/press-feedback/press-feedback.ts

Source SHA-256: 84ac4fd5285a46188c7a72f1373012fe2c19157dfa71e49695bfa3c42aaa5eeb

```ts
import { createAttachmentKey } from "svelte/attachments";

// One attachment key survives prop composition, including a custom child Button.
export const pressFeedbackProps = { [createAttachmentKey()]: pressFeedback };

// Visual feedback only. Native click, keyboard activation and pointer capture remain untouched.
export function pressFeedback(element: HTMLElement) {
  let pointer: number | null = null;
  let inside = false;
  let keyboard = false;
  const enabled = () => !element.matches(":disabled,[aria-disabled=true]");
  const sync = () => {
    if (enabled() && (keyboard || (pointer !== null && inside))) element.dataset.pressed = keyboard ? "keyboard" : "pointer";
    else delete element.dataset.pressed;
  };
  const release = () => { pointer = null; inside = false; keyboard = false; sync(); };
  const blur = () => { keyboard = false; sync(); };
  const windowblur = (event: Event) => { if (event.target === window) release(); };
  const keydown = (event: KeyboardEvent) => {
    if ((event.key === " " || event.key === "Enter") && enabled()) { keyboard = true; sync(); }
  };
  const keyup = (event: KeyboardEvent) => { if (event.key === " " || event.key === "Enter") blur(); };
  const pointerdown = (event: PointerEvent) => {
    if (event.isPrimary && event.button === 0 && enabled()) { pointer = event.pointerId; inside = true; sync(); }
  };
  const pointerend = (event: PointerEvent) => {
    if (event.pointerId === pointer) { pointer = null; inside = false; sync(); }
  };
  const pointermove = (event: PointerEvent) => {
    if (event.pointerId !== pointer) return;
    if (!(event.buttons & 1)) { pointerend(event); return; }
    const box = element.getBoundingClientRect();
    inside = event.clientX >= box.left && event.clientX <= box.right && event.clientY >= box.top && event.clientY <= box.bottom;
    sync();
  };
  const pointerleave = (event: PointerEvent) => {
    if (event.target === element && event.pointerId === pointer) { inside = false; sync(); }
  };
  const listeners: [EventTarget, string, EventListener][] = [
    [element, "keydown", keydown as EventListener], [element, "blur", blur],
    [element, "pointerdown", pointerdown as EventListener], [element, "pointerleave", pointerleave as EventListener],
    [element, "pointerenter", pointermove as EventListener],
    [element, "lostpointercapture", pointerend as EventListener],
    [window, "keyup", keyup as EventListener], [window, "blur", windowblur],
    [window, "pointerup", pointerend as EventListener], [window, "pointercancel", pointerend as EventListener],
    [window, "pointermove", pointermove as EventListener],
  ];
  for (const [target, event, listener] of listeners) target.addEventListener(event, listener, true);
  return () => {
    for (const [target, event, listener] of listeners) target.removeEventListener(event, listener, true);
    release();
  };
}
```

## src/svelte/catalog/compositions/select-control/SelectControl.svelte

Source SHA-256: 1b15c9c44eaa486e3aff0b7077cdfbea7d6930acefb7d133b84705036737db53

```svelte
<script lang="ts">
  import { Action, Choice, Column } from "../../index.ts";
  import { selectNode, selectInputRequired, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlEventFor } from "../../../renderer-contracts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"select-control"> = $props();
  let checked = $derived(selectNode(node));
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent?.(event);
  }
</script>
<!-- The field well at the choice measure; an optional choice offers to clear it 0.5rem below. -->
<Column gap="snug">
  <Choice presentation="menu" cardinality="one" menuTrigger="well" measure="choice" label={checked.label} labelVisibility="visible"
    selected={checked.value === null ? [] : [checked.value]} disabled={checked.disabled}
    required={selectInputRequired(checked)} options={checked.options.map(option => ({ value: option.value, label: option.label,
      disabled: option.disabled, ...option.face ? { leading: { kind: "face" as const, face: option.face } } : {} }))}
    onchange={selected => { if (selected[0] !== undefined) change(selected[0]); }} />
  {#if !checked.required}
    <Action icon="close" label={say(m.selectControl.clear)} emphasis="secondary" face="fit" type="button"
      state={checked.disabled || checked.value === null ? "unavailable" : "ready"} onclick={() => change(null)} />
  {/if}
</Column>
```

## src/svelte/catalog/compositions/popover-control/PopoverControl.svelte

Source SHA-256: 163f9f559f949e1b766e4397ac5408375f35a8f6ffad927638482d1f53fbee21

```svelte
<script lang="ts">
  import { Popover } from "../../index.ts";
  import { FrameBody } from "../../index.ts";
  import { popoverNode, applyControlEvent } from "../../../../interaction/control-nodes.ts";
  import type { ControlEventFor } from "../../../renderer-contracts.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"popover-control"> = $props();
  let checked = $derived(popoverNode(node));
  function change(open: boolean) {
    const event: ControlEventFor<"popover"> = { kind: "popover.open", control: checked.id, open };
    applyControlEvent(checked, event);
    onevent?.(event);
  }
</script>
<Popover label={checked.title} open={checked.open} disabled={checked.disabled} locked={checked.locked === true} content="information"
  placement="anchored" align="start" onopenchange={change}
  trigger={{ kind: "action", label: checked.label, icon: "open", face: "fit", emphasis: "secondary", state: "ready" }}>
  <FrameBody content={{ kind: "information", items: checked.content }} invoke={() => {}} edit={() => {}} />
</Popover>
```

## src/svelte/catalog/compositions/file-control/FileControl.svelte

Source SHA-256: cb9183ee0f121f6fe7c21bb83d936c0d9af84af7d4e799c089bf82714b6fdc6d

```svelte
<script lang="ts">
  import { Files } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  // The file control is the Files foundation (design §1.3), which reads the local file host from context; Batch 3 deletes
  // this folder.
  let { node, onevent }: CatalogProps<"file-control"> = $props();
</script>
<Files {node} {onevent} />
```

## src/svelte/catalog/renderer/control-renderer/ControlRenderer.svelte

Source SHA-256: 5aed4ec264773742d45fb4eba33ad7bdc26ce1a717ccbf944c706e34e87ce099

```svelte
<script lang="ts">
  import { controlResolvedNode } from "../../../../interaction/resolved-node.ts";
  import { NodeRenderer } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"control-renderer"> = $props();
</script>
<NodeRenderer node={controlResolvedNode(node)} onevent={event => { if ("control" in event) onevent?.(event); }} />
```

## src/svelte/catalog/compositions/options-control/OptionsControl.svelte

Source SHA-256: 8428be31602338563fa2db6bd3b7af02836752341b00df8f85a13a10db1ceee8

```svelte
<script lang="ts">
  import { Choice } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { permitsOptionsSelection, optionsInputRequired } from "../../../../interaction/extended-controls.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  let { node, onevent }: CatalogProps<"options-control"> = $props();
  // A stack titled like this control already shows its label; the legend then stays for assistive technology only.
  const stackTitle = currentStackTitle();
  const change = (selected: readonly string[]) => {
    if (permitsOptionsSelection(node, selected)) onevent?.({ kind: "options.change", control: node.id, selected });
  };
  const nextSelection = (value: string) => node.maxSelected === 1 ? [value] :
    node.selected.includes(value) ? node.selected.filter(item => item !== value) : [...node.selected, value];
  /** An option is unavailable when the node says so or when choosing it would break the selection's bounds. */
  const disabled = (value: string, unavailable: boolean) => unavailable || !permitsOptionsSelection(node, nextSelection(value));
</script>
<Choice presentation="rows" cardinality={node.maxSelected === 1 ? "one" : "many"} label={node.label}
  labelVisibility={stackTitle() === node.label ? "accessible" : "visible"} selected={node.selected} disabled={node.disabled}
  required={optionsInputRequired(node)} onchange={change}
  options={node.options.map(option => ({ value: option.value, label: option.label, disabled: disabled(option.value, option.disabled),
    ...option.description ? { description: option.description } : {} }))} />
```

## src/svelte/catalog/compositions/money-control/MoneyControl.svelte

Source SHA-256: 12d44eda3f243e5292c11d43f7da85c70eb510846e355109cba33d93e0c61ef8

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import { Choice, Field } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { displayAmount, parseAmount } from "../../../../interaction/money.ts";
  import { formatMaskedValue, type InputMask } from "../../../../interaction/input-mask.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node, onevent }: CatalogProps<"money-control"> = $props();
  let scale = $derived(node.currencies.find(currency => currency.code === node.currency)!.scale);
  let mask: InputMask = $derived({ kind: "decimal", locale: node.locale ?? "en-US", scale });
  const symbol = (currency: string) => new Intl.NumberFormat(mask.locale, {
    style: "currency", currency, currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find(part => part.type === "currency")!.value;
  // Each currency leads with its narrow symbol, in the list and in the inline value beside the amount.
  let options = $derived(node.currencies.map(item => ({ value: item.code, label: item.code, disabled: false,
    leading: { kind: "symbol" as const, text: symbol(item.code) } })));
  let draft = $state(untrack(() => displayAmount(node.minorUnits, scale)));
  let draftValid = true;
  let error = $state("");
  const ownerValue = () => ({ id: node.id, currency: node.currency, minorUnits: node.minorUnits, scale, locale: mask.locale });
  let observed = untrack(ownerValue);
  let pending: ReturnType<typeof ownerValue>[] = [];
  $effect(() => {
    const next = ownerValue();
    untrack(() => {
      const contextChanged = next.id !== observed.id || next.currency !== observed.currency || next.scale !== observed.scale || next.locale !== observed.locale;
      const acknowledgement = pending.findIndex(value => value.id === next.id && value.currency === next.currency &&
        value.scale === next.scale && value.locale === next.locale && value.minorUnits === next.minorUnits);
      // Acknowledgements preserve lexical writing, including a newer invalid draft.
      // Owner replacements reset both the display and errors without emitting an edit.
      if ((contextChanged || next.minorUnits !== observed.minorUnits) && acknowledgement < 0) {
        draft = displayAmount(next.minorUnits, next.scale); draftValid = true; error = ""; pending = [];
      } else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  function publish(currency: string, minorUnits: string | null) {
    pending.push({ id: node.id, currency, minorUnits, scale: node.currencies.find(item => item.code === currency)!.scale, locale: mask.locale });
    onevent?.({ kind: "money.change", control: node.id, currency, minorUnits });
  }
  function edit(value: string, valid: boolean, complete: boolean) {
    draft = value; draftValid = valid && complete;
    if (!draftValid) { error = say(m.moneyControl.format, { scale: String(scale), locale: mask.locale }); return; }
    try { const minorUnits = parseAmount(value, scale); error = "";
      publish(node.currency, minorUnits);
    } catch (cause) { error = cause instanceof Error && cause.message === "MONEY_AMOUNT_TOO_LARGE"
      ? say(m.moneyControl.tooLarge) : say(m.moneyControl.scale, { scale: String(scale) }); }
  }
  function currency(value: string | undefined) {
    if (value === undefined || value === node.currency) return;
    const nextScale = node.currencies.find(item => item.code === value)!.scale;
    try {
      if (!draftValid || draft && !/^-?\d+(\.\d+)?$/.test(draft)) throw new Error("INVALID_MONEY_AMOUNT");
      // Removing insignificant fractional zeros permits exact scale changes, never rounding or FX conversion.
      const exact = draft.includes(".") ? draft.replace(/0+$/, "").replace(/\.$/, "") : draft;
      const minorUnits = parseAmount(exact, nextScale);
      error = ""; publish(value, minorUnits);
    } catch { error = say(m.moneyControl.currencyScale, { currency: value, scale: String(nextScale) }); }
  }
</script>
<Field primitive="input.text" purpose="text" label={node.label} labelVisibility="visible" measure="amount" {mask}
  identity={`${node.id}/${node.currency}`} value={draft} placeholder={formatMaskedValue(displayAmount("0", scale), mask)}
  required={node.required} invalid={!!error} disabled={node.disabled} error={error || undefined} clear
  onmasked={({ value, valid, complete }) => edit(value, valid, complete)}>
  {#snippet prefix()}
    <Choice presentation="menu" cardinality="one" menuTrigger="inline" label={say(m.moneyControl.currency, { label: node.label })}
      labelVisibility="visible" selected={[node.currency]} {options} disabled={node.disabled || node.currencies.length === 1} required={false}
      onchange={selected => currency(selected[0])} />
  {/snippet}
</Field>
```

## src/svelte/catalog/foundations/date-control/DateControl.svelte

Source SHA-256: 654cc22790516fd6bbc198935cb9be9eea78af008e1cb59faa2243c1a48e45ee

```svelte
<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { untrack } from "svelte";
  import { parseDate, today, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import DateCalendar from "./DateCalendar.svelte";
  import { Popover } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { node, onevent }: CatalogProps<"date-control"> = $props();
  const format = new DateFormatter("en-US", { dateStyle: "medium" });
  let open = $state(false);
  let observed = untrack(() => node.id);
  let observedValue = untrack(() => node.value);
  let visibleDate = $state<DateValue>(untrack(() => node.value ? parseDate(node.value) : today(getLocalTimeZone())));
  let date = $derived(node.value ? parseDate(node.value) : undefined);
  let label = $derived(date ? format.format(date.toDate(getLocalTimeZone())) : say(m.dateControl.noDate));
  $effect(() => {
    const next = node.id, value = node.value, isOpen = open;
    untrack(() => {
      if (next !== observed) open = false;
      // Presentation may remount the calendar, but it does not start a new
      // browsing task. Closing or an owner replacement resets its cursor.
      if (!isOpen || next !== observed || value !== observedValue)
        visibleDate = value ? parseDate(value) : today(getLocalTimeZone());
      observed = next; observedValue = value;
    });
  });
  function change(value: DateValue | undefined) {
    if (!value || node.disabled) return;
    if (value.toString() !== node.value) onevent?.({ kind: "date.change", control: node.id, value: value.toString() });
    open = false;
  }
  function clear() {
    if (node.disabled || node.required) return;
    onevent?.({ kind: "date.change", control: node.id, value: null });
    open = false;
  }
</script>
<Popover label={node.label} {open} disabled={node.disabled} locked={false} content="information" placement="adaptive" align="start"
  trigger={{ kind: "field", label: node.label, required: node.required, invalid: false,
    display: { kind: "text", text: label, placeholder: date === undefined }, measure: "date" }}
  onopenchange={next => { open = next; }}>
  <DateCalendar value={date} bind:visibleDate label={node.label} minimum={node.minimum} maximum={node.maximum}
    disabled={node.disabled} onchange={change} onclear={node.required ? undefined : clear} />
</Popover>
```

## src/svelte/catalog/compositions/media-control/MediaControl.svelte

Source SHA-256: a167ab4721ddbd2036fd61c93f066d62d7076f982846cedcc21624571d5a2376

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Avatar, Column, Gallery, Inline, Status, Tag, Text } from "../../index.ts";
  import { imageIdentity } from "../../../infra/media-source.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  let { node }: CatalogProps<"media-control"> = $props();
  // A named library asset is served from its media path; a public path or a private asset is shown as it is.
  let source = $derived(node.kind === "tag" || node.source === null ? null
    : typeof node.source === "object" && "asset" in node.source ? `/media/${encodeURIComponent(node.source.asset)}` : node.source);
</script>

{#if node.kind === "tag"}
  <Tag presentation="chip" tone={node.tone} label={node.label} state="known" removable={false} disabled={node.disabled} />
{:else if node.kind === "avatar"}
  <Inline gap="close" overflow="none">
    <Avatar size="row" interaction="none" source={source ? { kind: "image", source, initials: node.fallback } : { kind: "initials", initials: node.fallback }} />
    <Text kind="body" text={node.label} wrap="anywhere" />
  </Inline>
{:else}
  <Column gap="snug">
    {#if source}
      {#key imageIdentity(source)}<Gallery photos={[{ source, alt: node.alt }]} title={node.label} presentation="inline" fit="fill" aspect={node.aspect} />{/key}
    {:else}<Status icon="image-off" title={say(m.mediaControl.unavailable)} tone="neutral" size="regular" heading={false} />{/if}
    <Text kind="body" text={node.label} />
  </Column>
{/if}
```

## src/svelte/catalog/foundations/popover/Popover.svelte

Source SHA-256: e082cea30287da0ac1a3c3084e6bda213ea6b483d4e3b65d4e47a83c7201ade1

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Action } from "../../index.ts";
  import { Field } from "../../index.ts";
  import { Modal } from "../../index.ts";
  import type { Disclosure } from "../../../infra/disclosure.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { useSurfaceDensityClass } from "../../../infra/surface-typography.svelte.ts";
  import { provideSheetFocus, takeOpenFocus } from "../../mechanisms/surface-focus/focus-return.ts";
  import { PickerPresentation, pickerBudget, calendarBudget } from "./picker-presentation.svelte.ts";
  import PopoverSurface from "./PopoverSurface.svelte";
  let { label, open, disabled, locked, trigger, content, placement, align, controls, onopenchange, children }: CatalogProps<"popover"> = $props();
  const id = $props.id(), panelId = `${id}-surface`;
  const triggerId = $derived(trigger.kind === "owned" ? trigger.id : `${id}-trigger`);
  const density = useSurfaceDensityClass();
  const calendar = $derived(trigger.kind === "field" && trigger.measure === "date");
  const picker = new PickerPresentation(() => calendar ? calendarBudget : pickerBudget);
  const sheet = $derived(placement === "adaptive" && picker.current === "sheet");
  const disclosure: Disclosure = $derived({ id: triggerId, controls: controls ?? panelId, expanded: open,
    haspopup: content === "list" ? "listbox" : "dialog" });
  /** The person asks to open or close; a disabled popover refuses both, a locked one refuses closing. */
  function change(next: boolean) { if (!disabled && next !== open && (next || !locked)) onopenchange?.(next); }
  const openFocus = takeOpenFocus();
  provideSheetFocus({ returnTo: () => document.getElementById(triggerId), open: openFocus });
  dismissWhenInactive(() => { if (open) onopenchange?.(false); });
  $effect(() => { if (disabled && open) onopenchange?.(false); });
</script>
{#if trigger.kind === "action"}
  <Action label={trigger.label} icon={trigger.icon} face={trigger.face} emphasis={trigger.emphasis} type="button"
    state={disabled ? "unavailable" : trigger.state} {disclosure} onclick={() => change(!open)} />
{:else if trigger.kind === "field"}
  <Field primitive="trigger" label={trigger.label} labelVisibility="visible" required={trigger.required} invalid={trigger.invalid}
    {disabled} measure={trigger.measure} display={trigger.display} {disclosure} onopen={() => change(!open)} />
{/if}
{#if sheet}
  <!-- In a sheet a list keeps the picker inset of its rows; a calendar frames its own header. -->
  <Modal {label} {open} {locked} presentation="sheet" ondismiss={() => change(false)}>
    {#if content === "list"}<div class="picker-content-inset pt-2 pb-4">{@render children?.()}</div>{:else}{@render children?.()}{/if}
  </Modal>
{:else}
  <PopoverSurface {label} {open} {locked} {content} {align} {triggerId} {panelId} {calendar} {openFocus}
    density={density()} {change} {children} />
{/if}
```

## src/svelte/catalog/foundations/popover/PopoverSurface.svelte

Source SHA-256: 7c944131e730080e7d79b96bad35bdf153dff6d827ad86daa629999f5d7c9ef4

```svelte
<script lang="ts">
  // Popover part: the anchored surface. Bits draws no trigger: the surface anchors to the trigger by id (customAnchor),
  // ignores presses on it (the trigger itself toggles once), and returns focus to it unless dismissal came from outside.
  import type { Snippet } from "svelte";
  import * as Popover from "../../../vendor/components/ui/popover/index.js";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import { anchoredTabExit } from "./anchored-tab-exit.ts";
  import { calendarBudget } from "./picker-presentation.svelte.ts";
  let { label, open, locked, content, align, triggerId, panelId, calendar, openFocus, density, change, children }: {
    label: string; open: boolean; locked: boolean; content: "information" | "form" | "list" | "menu"; align: "start" | "end";
    triggerId: string; panelId: string; calendar: boolean; openFocus: ((event: Event) => void) | undefined; density: string | undefined;
    change: (open: boolean) => void; children: Snippet | undefined;
  } = $props();
  const presentations = { information: "pane", form: "reference", list: "selection", menu: "speed-dial" } as const;
  /** A month calendar frames itself (its header is the surface's top row) at the calendar budget's width. */
  const calendarFrame = `width:${calendarBudget.panelRem}rem;overflow:hidden;padding:0;gap:0`;
  let panel = $state<HTMLElement | null>(null);
  let boundary: HTMLElement | null = null;
  $effect(() => { if (panel) boundary = panel; });
  /** Whether the person dismissed it by interacting elsewhere: focus then stays where they went. */
  let outside = false;
  const onTrigger = (target: EventTarget | null) => target instanceof Element && target.closest(`#${CSS.escape(triggerId)}`) !== null;
  const dismissOutside = () => { if (open && !locked) { outside = true; change(false); } };
  // Focus can leave for the trigger (a press toggles it) without dismissing; elsewhere it dismisses.
  const focus = surfaceFocus(() => panel, () => queueMicrotask(() => {
    const active = document.activeElement;
    if (!panel?.contains(active) && !onTrigger(active)) dismissOutside();
  }));
  function interactOutside(event: Event) {
    if (onTrigger(event.target) || locked) event.preventDefault();
    else outside = true;
  }
  function returnFocus(event: Event) {
    event.preventDefault();
    const leaving = outside, active = document.activeElement, trigger = document.getElementById(triggerId);
    outside = false;
    if (leaving || open || active && active !== document.body && !boundary?.contains(active)) return;
    if (trigger?.checkVisibility() && !trigger.closest("[hidden],[inert]")) trigger.focus({ preventScroll: true });
  }
</script>
<Popover.Root {open} onOpenChange={change}>
  <Popover.Content bind:ref={panel} id={panelId} customAnchor={`#${triggerId}`} presentation={presentations[content]} class={density} {align}
    role={content === "list" ? "presentation" : content === "menu" ? undefined : "dialog"}
    aria-label={content === "list" ? undefined : label} aria-modal={content === "list" || content === "menu" ? undefined : "false"}
    style={calendar ? calendarFrame : undefined} data-popover={content} data-presentation="anchored"
    onOpenAutoFocus={event => focus.open(event, openFocus)} onCloseAutoFocus={event => focus.close(event, returnFocus)}
    onkeydowncapture={event => { if (panel && !locked) anchoredTabExit(event, panel, dismissOutside); }}
    onEscapeKeydown={event => { if (locked) event.preventDefault(); }} onInteractOutside={interactOutside}>
    {@render children?.()}
  </Popover.Content>
</Popover.Root>
```

## src/svelte/catalog/foundations/files/Files.svelte

Source SHA-256: 60b613e1919050b859e27751ba53c71ada3625b94c11af105b2df275bb2aedf3

```svelte
<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { Action } from "../../index.ts";
  import { Text } from "../../index.ts";
  import { fileNode, type FileRejection } from "../../../../interaction/control-nodes.ts";
  import { useFileHost } from "../../../infra/file-host-context.ts";
  import { currentStackTitle } from "../../../infra/stack-context.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { fileSize } from "./file-size.ts";
  import { nativeFilePicker } from "../../mechanisms/file-picker/file-picker.ts";
  let { node, onevent }: CatalogProps<"files"> = $props();
  const provided = useFileHost();
  if (!provided) throw new Error("LOCAL_FILE_HOST_REQUIRED: files renders inside a subtree that provides a file host (provideFileHost)");
  const host = provided;
  let checked = $derived(fileNode(node));
  let rejected = $state<readonly FileRejection[]>([]);
  const id = $props.id();
  const stackTitle = currentStackTitle();
  const reasons = { "media-type": m.files.mediaType, "file-size": m.files.fileSize, "total-size": m.files.totalSize, count: m.files.count };
  /** The browser's chooser supplies the files; the host checks them against the limits and keeps the accepted handles. */
  async function choose() {
    const files = await nativeFilePicker(checked);
    if (!files) return;
    const selection = host.choose(checked, files);
    rejected = selection.result.rejected;
    onevent?.(selection.event);
  }
</script>
<div role="group" class="group/field flex w-full flex-col gap-2 [&>.sr-only]:w-auto" data-files data-disabled={checked.disabled}
  data-invalid={rejected.length > 0} aria-labelledby={`${id}-label`} aria-describedby={`${id}-limits`}>
  <span id={`${id}-label`} data-files-label class={stackTitle() === checked.label ? "sr-only"
    : "flex w-fit items-center gap-2 type-control leading-snug select-none group-data-[invalid=true]/field:text-destructive-text"}>{checked.label}</span>
  <Action icon="open" label={say(m.files.choose)} face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"} onclick={choose} />
  <Text id={`${id}-limits`} kind="caption" tone="muted" inset="row"
    text={say(m.files.limits, { count: String(checked.limits.maxCount), file: fileSize(checked.limits.maxFileBytes), total: fileSize(checked.limits.maxTotalBytes) })} />
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label={say(m.files.selected)} data-files-list>
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 break-all">{say(m.files.file, { name: file.name, size: fileSize(file.size) })}</span>
          <Action icon="close" label={say(m.files.remove, { name: file.name })} face="fit" emphasis="secondary" type="button" state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent?.(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {:else}<Text kind="caption" tone="muted" inset="row" text={say(m.files.none)} />{/if}
  <div role="status" aria-live="polite" data-files-status>
    {#each rejected as item (item.file.id)}<Text kind="support" tone="destructive" text={say(m.files.rejected, { name: item.file.name, reason: say(reasons[item.reason]) })} />{/each}
  </div>
</div>
```

## src/svelte/catalog/compositions/fields/Fields.svelte

Source SHA-256: e95bfc97c5eedfbe17268c0fb5acf81adb8b7eb2f5e12dc7a7558150181ffe4e

```svelte
<script lang="ts">
  import { Column, NodeRenderer } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { imageInputControl } from "../../../../interaction/image-input.ts";
  import { labelsInputControl } from "../../../../interaction/labels-control.ts";
  import { isFormControlEvent } from "../../../../interaction/form-control-event.ts";
  let { fields, edit, controlEvent }: CatalogProps<"fields"> = $props();
</script>

<!-- The form's fields stand 1.25rem apart, the gap of the field group they were drawn in. -->
<Column gap="loose">
  {#each fields as field (field.name)}
    {#if field.primitive === "control.files"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.files",
        control: imageInputControl(field.name, field.label, field.files,field.disabled ?? false,field.media) }}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.labels"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.labels",
        control: { ...labelsInputControl(field.name, field.label, field.values, field.limits, field.error, field.reference,field.mediaReference), disabled: field.disabled ?? false } }}
        onevent={event => { if (isFormControlEvent(event)) controlEvent(event); }} />
    {:else if field.primitive === "control.select"}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "control.select", control: {
        version: "desert.control/1", kind: "select", id: field.name, label: field.label,
        required: true, disabled: field.disabled ?? false, value: field.value, options: field.options,
      } }} onevent={event => { if (event.kind === "select.change" && event.value !== null) edit(field.name, event.value); }} />
    {:else}
    <NodeRenderer node={{ version: ResolvedNodeVersion, kind: field.primitive, name: field.name, label: field.label,
      value: field.value, required: field.required, disabled: field.disabled ?? false, ...(field.error ? { error: field.error } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}) }}
      onevent={event => { if (event.kind === "input.change") edit(event.name, event.value); }} />
    {/if}
  {/each}
</Column>
```

## src/svelte/catalog/foundations/field/Field.svelte

Source SHA-256: 7edbf1a8ef83061c83c460d8a2d3e16abdffcd2042b663194f130b52f676e0a6

```svelte
<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import { untrack } from "svelte";
  import * as Vendor from "../../../vendor/components/ui/field/index.js";
  import FieldWell from "./FieldWell.svelte";
  import FieldEditor from "./FieldEditor.svelte";
  import FieldTrigger from "./FieldTrigger.svelte";
  import SearchWell from "./SearchWell.svelte";
  import CharacterCounter from "./CharacterCounter.svelte";
  import ClearInput from "./ClearInput.svelte";
  import type { CatalogProps } from "../../types.d.ts";
  let { primitive, label, labelVisibility, required, invalid, disabled, helper, error, identity, measure, purpose, value, placeholder,
    mask, maxLength, counter, clear, focus, controls, display, disclosure, select, onchange, onmasked, onopen, accessory: trailing, prefix, selection }: CatalogProps<"field"> = $props();
  const id = $props.id();
  // Both editors receive their value; the trigger owns none. `writing` is the live text, `shown` a mask's formatted text.
  let written = $derived(typeof value === "string" ? value : "");
  let writing = $derived(written);
  let shown = $state("");
  let draft = $derived(mask ? shown : writing);
  let draftError = $state("");
  // A rejected or incomplete masked edit keeps its message until the owner's value or the field's identity changes.
  const context = () => `${identity ?? ""}/${primitive}/${mask?.kind ?? ""}/${mask?.locale ?? ""}/${mask?.scale ?? ""}`;
  let observed = untrack(() => ({ value: written, context: context() }));
  let pending: string[] = [];
  $effect(() => {
    const next = { value: written, context: context() };
    untrack(() => {
      const acknowledgement = pending.indexOf(next.value);
      if (next.context !== observed.context || next.value !== observed.value && acknowledgement < 0) { draftError = ""; pending = []; }
      else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  let message = $derived(error || draftError);
  let marked = $derived(invalid || !!message);
  let multiline = $derived(primitive === "input.multiline");
  // A multiline editor always counts its characters; a single line counts them when its caller asks (a limited label).
  let counted = $derived(multiline || counter === true);
  // A required select says so to assistive technology (its well marks it visibly).
  let requirement = $derived(primitive === "trigger" && select === true && required);
  let describedBy = $derived([helper ? `${id}-helper` : undefined, counted ? `${id}-counter` : undefined,
    message ? `${id}-error` : undefined, requirement ? `${id}-requirement` : undefined].filter(Boolean).join(" ") || undefined);
  function edited(next: string, valid: boolean, complete: boolean) {
    if (disabled || !mask) return;
    onmasked?.({ value: next, valid, complete });
    draftError = valid && complete ? "" : valid ? say(m.field.incompleteNumber) : say(m.field.invalidNumber, { scale: String(mask.scale) });
    if (valid && complete) { pending.push(next); onchange?.(next); }
  }
</script>
{#snippet characters()}<CharacterCounter id={`${id}-counter`} value={writing} {maxLength} />{/snippet}
{#snippet editor()}
  {#if primitive !== "trigger"}
    <FieldEditor {id} {primitive} {label} {purpose} value={written} {placeholder} {mask} {identity} {required} {disabled} {focus} {controls}
      invalid={marked} {describedBy} bind:writing bind:shown onchange={next => onchange?.(next)} onmasked={edited} />
  {/if}
{/snippet}
{#snippet trigger()}
  {#if display && disclosure}
    <FieldTrigger {label} {labelVisibility} {required} {disabled} {describedBy} {display} {disclosure} select={select === true} shown={selection}
      onopen={() => onopen?.()} />
  {/if}
  {#if requirement}<span id={`${id}-requirement`} class="sr-only">{say(m.field.required)}</span>{/if}
{/snippet}
<!-- A select without a measure takes no box: its well sits where its parent lays it, as a button does. A measured
     select keeps the measure box; its content fades as its button's does (the field's disabled rule restores field
     content), and its well is the only control, so the field is no group. -->
{#if primitive === "trigger" && select === true && measure === undefined}{@render trigger()}
{:else}
<div data-field data-field-filled={primitive === "trigger" || draft.length > 0} data-measure={measure}>
  <Vendor.Field data-primitive={primitive} data-invalid={marked} data-disabled={select ? undefined : disabled} role={select ? undefined : "group"}>
    {#if primitive === "trigger"}{@render trigger()}
    {:else if purpose === "search"}
      <SearchWell {id} {label} {placeholder} {disabled} invalid={marked} {describedBy} {focus} {controls} bind:writing onchange={next => onchange?.(next)} />
    {:else}
      <FieldWell {id} {label} {labelVisibility} {required} filled={draft.length > 0} {prefix} footer={counted ? characters : undefined}>
        {#snippet accessory()}
          {#if trailing}{@render trailing()}
          {:else if multiline || clear}<ClearInput control={id} value={draft} label={say(m.field.clear, { label })} {disabled} />{/if}
        {/snippet}
        {@render editor()}
      </FieldWell>
    {/if}
    {#if helper}<Vendor.FieldDescription id={`${id}-helper`}>{helper}</Vendor.FieldDescription>{/if}
    {#if message}<Vendor.FieldError id={`${id}-error`} role="status">{message}</Vendor.FieldError>{/if}
  </Vendor.Field>
</div>
{/if}
```

## src/svelte/catalog/foundations/field/FieldEditor.svelte

Source SHA-256: d536b97e665acb2d86cea31e34a2a9f618080b085227d3bb66eabc9e0fad6e53

```svelte
<script lang="ts">
  // The editor inside a Field's well: a single line (plain, credential or masked) or a multiline editor that grows to
  // the reading area. `writing` is the live text of a plain editor, `shown` the formatted text of a masked one.
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import type { InputMask } from "../../../../interaction/input-mask.ts";
  import MaskedInput from "./MaskedInput.svelte";
  import { observeEditorCapacity } from "./editor-capacity.ts";
  let { id, primitive, label, purpose, value, placeholder, mask, identity, required, disabled, invalid, describedBy, focus, controls,
    writing = $bindable(""), shown = $bindable(""), onchange, onmasked }: {
    id: string; primitive: "input.text" | "input.multiline"; label: string;
    purpose: "text" | "username" | "new-password" | "current-password" | "search" | undefined; value: string; placeholder: string | undefined;
    mask: InputMask | undefined; identity: string | undefined; required: boolean; disabled: boolean; invalid: boolean;
    describedBy: string | undefined; focus: "on-mount" | undefined; controls: string | undefined; writing?: string; shown?: string;
    onchange: (value: string) => void; onmasked: (value: string, valid: boolean, complete: boolean) => void;
  } = $props();
  let editor = $state<HTMLTextAreaElement | null>(null);
  let line = $state<HTMLInputElement | null>(null);
  $effect(() => { if (editor) return observeEditorCapacity(editor); });
  $effect(() => { if (focus === "on-mount" && line) line.focus({ preventScroll: true }); });
</script>
{#if primitive === "input.multiline"}
  <Group.Textarea {id} bind:ref={editor} bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalid}
    aria-label={label} rows={4} placeholder=" " aria-describedby={describedBy} class="focus-visible:outline-none"
    data-field-editor="multiline" onblur={event => onchange(event.currentTarget.value)} oninput={event => onchange(event.currentTarget.value)} />
{:else if mask}
  <MaskedInput {id} {value} {mask} {identity} bind:display={shown} {required} {disabled} {invalid} {label} {describedBy}
    placeholder={placeholder ?? " "} onvalue={onmasked} />
{:else}
  <Group.Input {id} bind:ref={line} type={purpose?.endsWith("password") ? "password" : "text"}
    autocomplete={purpose === "text" || purpose === "search" || purpose === undefined ? undefined : purpose} autocapitalize={purpose === "username" ? "none" : undefined}
    spellcheck={purpose === "text" ? undefined : false} bind:value={writing} {required} {disabled} aria-required={required}
    aria-invalid={invalid} aria-label={label} placeholder={placeholder ?? " "} aria-describedby={describedBy} aria-controls={controls}
    class="focus-visible:outline-none" onblur={event => onchange(event.currentTarget.value)} oninput={event => onchange(event.currentTarget.value)} />
{/if}
```

## src/svelte/catalog/foundations/text-input/TextInput.svelte

Source SHA-256: b05990e130ffd2b4dfc3ba19e79ad21f0d96851632200cb61933d37f85c459d0

```svelte
<script lang="ts">
  // TextInput was renamed Field (design §1.7). The folder stays until Batch 3 deletes it, and its entry draws through
  // Field, so the catalog keeps one implementation of the writing well.
  import { Field } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { primitive, label, value = "", required = false, invalid = false, error, helper, disabled = false,
    identity, mask, maxLength, purpose = "text", onchange, accessory: trailing }: CatalogProps<"text-input"> = $props();
</script>
{#if primitive === "input.multiline"}
  <Field primitive="input.multiline" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {value} {maxLength} {onchange} />
{:else if trailing}
  <Field primitive="input.text" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {purpose} {value} {mask} clear {onchange}>{#snippet accessory()}{@render trailing()}{/snippet}</Field>
{:else}
  <Field primitive="input.text" {label} labelVisibility="visible" {required} {invalid} {disabled} {error} {helper} {identity}
    measure="writing" {purpose} {value} {mask} clear {onchange} />
{/if}
```

## src/svelte/catalog/foundations/masked-input/MaskedInput.svelte

Source SHA-256: 3785a6650a2ad0b8632ce7c602496fac995f041996f65559d04ef165577d8d59

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { formatMaskedValue, readMaskedValue, maskSeparators } from "../../../../interaction/input-mask.ts";
  import type { CatalogProps } from "../../types.d.ts";
  import { historyKey, inputEditHistory, inputSnapshot, type InputSnapshot } from "./input-edit-history.ts";
  let { value, mask, identity = "", display = $bindable(""), onvalue, id, placeholder, disabled, required,
    "aria-required": ariaRequired, "aria-invalid": invalid, "aria-label": label, "aria-describedby": describedBy }: CatalogProps<"masked-input"> = $props();
  let composing = false, compositionInput = false, allowDisplacedGrouping = false;
  let published: string | undefined;
  let incomingValue: string | undefined;
  let echoes: string[] = [];
  const history = inputEditHistory();
  let pending: { state: InputSnapshot; kind: string } | undefined;
  const context = () => `${identity}/${mask.kind}/${mask.locale}/${mask.scale}`;
  let observed = untrack(context);
  $effect(() => {
    const next = context(), incoming = value;
    untrack(() => {
      const acknowledgement = echoes.indexOf(incoming);
      if (next !== observed || incoming !== incomingValue && incoming !== published && acknowledgement < 0) {
        display = formatMaskedValue(incoming, mask); history.reset(); pending = undefined;
        composing = false; compositionInput = false; allowDisplacedGrouping = false; published = undefined;
        echoes = [];
      } else if (acknowledgement >= 0) echoes.splice(0, acknowledgement + 1);
      observed = next; incomingValue = incoming;
    });
  });
  function position(text: string, offset: number) {
    const { group } = maskSeparators(mask);
    return text.slice(0, offset).split(group).join("").length;
  }
  function caret(text: string, logical: number) {
    if (!logical) return 0;
    for (let index = 1; index <= text.length; index++) if (position(text, index) >= logical) return index;
    return text.length;
  }
  function edit(input: HTMLInputElement, strict: boolean, record = true) {
    const previous = pending ?? { state: { ...inputSnapshot(input), text: display }, kind: "replacement" };
    pending = undefined;
    const raw = input.value, start = position(raw, input.selectionStart ?? raw.length);
    const end = position(raw, input.selectionEnd ?? raw.length), direction = input.selectionDirection ?? "none";
    const result = readMaskedValue(raw, mask, strict);
    if (!result.valid) {
      display = previous.state.text; input.value = display;
      input.setSelectionRange(previous.state.start, previous.state.end, previous.state.direction);
      return;
    }
    display = formatMaskedValue(result.value, mask);
    if (input.value !== display) {
      input.value = display;
      input.setSelectionRange(caret(display, start), caret(display, end), direction);
    }
    if (record) history.record(previous.state, inputSnapshot(input), previous.kind);
    published = result.value;
    if (result.valid && result.complete) echoes.push(result.value);
    onvalue(result.value, result.valid, result.complete);
  }
  function restore(input: HTMLInputElement, direction: "undo" | "redo") {
    if (composing || input.disabled || input.readOnly) return;
    const state = history[direction](); if (!state) return;
    input.value = state.text; input.setSelectionRange(state.start, state.end, state.direction);
    pending = undefined; compositionInput = false; allowDisplacedGrouping = false;
    edit(input, true, false);
  }
  function keydown(event: KeyboardEvent & { currentTarget: HTMLInputElement }) {
    if (event.defaultPrevented || composing || event.isComposing) return;
    const direction = historyKey(event);
    if (direction) { event.preventDefault(); restore(event.currentTarget, direction); }
    else if (event.key.length > 1 && !["Backspace", "Delete"].includes(event.key)) history.boundary();
  }
  function before(event: InputEvent & { currentTarget: HTMLInputElement }) {
    if (event.inputType === "historyUndo" || event.inputType === "historyRedo") {
      event.preventDefault(); restore(event.currentTarget, event.inputType === "historyUndo" ? "undo" : "redo"); return;
    }
    if (!composing) pending = { state: inputSnapshot(event.currentTarget), kind: event.inputType };
    const { group } = maskSeparators(mask);
    const insertsGrouping = event.data?.includes(group) ?? false;
    // Editing digits can displace generated separators. Newly supplied grouping
    // must already be valid; stripping it could silently change the amount.
    allowDisplacedGrouping = !insertsGrouping &&
      !["insertFromPaste", "insertFromDrop", "insertReplacementText"].includes(event.inputType);
    const input = event.currentTarget, start = input.selectionStart, end = input.selectionEnd;
    if (composing || event.isComposing || start === null || end === null) return;
    if (event.cancelable && event.inputType.startsWith("insert") && event.data !== null) {
      const next = input.value.slice(0, start) + event.data + input.value.slice(end);
      if (!readMaskedValue(next, mask, !allowDisplacedGrouping).valid) {
        event.preventDefault(); pending = undefined; allowDisplacedGrouping = false; return;
      }
    }
    if (start !== end) return;
    // Deleting beside a generated separator removes the adjacent digit, not
    // a separator that would immediately reappear. Let the native edit run.
    if (event.inputType === "deleteContentBackward" && start > 1 && input.value.slice(start - group.length, start) === group)
      input.setSelectionRange(start - group.length - 1, start);
    if (event.inputType === "deleteContentForward" && input.value.slice(start, start + group.length) === group)
      input.setSelectionRange(start, start + group.length + 1);
  }
</script>
<Group.Input {id} {placeholder} {disabled} {required} aria-required={ariaRequired} aria-invalid={invalid}
  aria-label={label} aria-describedby={describedBy} type="text" inputmode="decimal" value={display} data-input-mask={mask.kind}
  onbeforeinput={before}
  onkeydown={keydown}
  onpointerdown={() => history.boundary()}
  oncompositionstart={event => { composing = true; pending = { state: inputSnapshot(event.currentTarget), kind: "composition" }; }}
  oncompositionend={event => { composing = false; edit(event.currentTarget, true); compositionInput = true; }}
  oninput={event => {
    if (composing || event instanceof InputEvent && event.isComposing) { display = event.currentTarget.value; return; }
    if (compositionInput && event.currentTarget.value === display) { compositionInput = false; pending = undefined; return; }
    compositionInput = false;
    edit(event.currentTarget, !allowDisplacedGrouping); allowDisplacedGrouping = false;
  }}
  onblur={() => history.boundary()} />
```

## src/svelte/catalog/foundations/character-counter/CharacterCounter.svelte

Source SHA-256: 118d1e9a96c2fe421d6b8f46cca2b9c6442ac267e34d55abefc86d9664739de8

```svelte
<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { cn } from "../../../vendor/utils.js";
  import type { CatalogProps } from "../../types.d.ts";
  let { id, value, maxLength }: CatalogProps<"character-counter"> = $props();
  // Match JSON Schema's code-point length, not HTML maxlength's UTF-16 units.
  const count = $derived([...value].length);
  const remaining = $derived(maxLength === undefined ? undefined : maxLength - count);
  const exceeded = $derived(remaining !== undefined && remaining < 0);
</script>

<Group.Addon align="block-end" class="px-4 pb-2">
  <Group.Text {id} data-character-counter data-exceeded={exceeded}
    class={cn("ms-auto block min-w-0 text-end type-caption text-(length:--text-caption) tabular-nums", exceeded && "text-destructive-text")}>
    {#if remaining === undefined}{count} {count === 1 ? "character" : "characters"}
    {:else if exceeded}{-remaining} over limit
    {:else}{remaining} remaining{/if}
  </Group.Text>
</Group.Addon>
```

## src/svelte/catalog/foundations/clear-input/ClearInput.svelte

Source SHA-256: eb45aa213ea3fb09df084fdc9e5794545fff9c8566ea385bdde8f569d2e0a060

```svelte
<script lang="ts">
  import * as Group from "../../../vendor/components/ui/input-group/index.js";
  import { Icon } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { control, value, label, disabled = false }: CatalogProps<"clear-input"> = $props();

  function clear() {
    const input = document.getElementById(control);
    if (disabled || !(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) || input.disabled || input.readOnly) return;
    input.focus({ preventScroll: true });
    // Use the editor's ordinary edit pipeline, including masks and their history.
    // Clear replaces the entire value, regardless of the user's current selection.
    const selection = [input.selectionStart, input.selectionEnd, input.selectionDirection] as const;
    input.select();
    const options = { bubbles: true, inputType: "insertReplacementText", data: "" };
    if (!input.dispatchEvent(new InputEvent("beforeinput", { ...options, cancelable: true }))) {
      input.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined);
      return;
    }
    // Native replacement preserves plain-text undo; masks own their formatted history.
    if (!input.hasAttribute("data-input-mask")) {
      let notified = false;
      const observe = () => { notified = true; };
      input.addEventListener("input", observe, { once: true });
      let edited = false;
      try { edited = document.execCommand?.("delete") ?? false; }
      finally { input.removeEventListener("input", observe); }
      if (edited) {
        if (!notified) input.dispatchEvent(new InputEvent("input", options));
        return;
      }
    }
    input.value = "";
    input.dispatchEvent(new InputEvent("input", options));
  }
</script>

{#if value.length > 0}
  <Group.Addon align="inline-end" class="field-clear shrink-0">
    <Group.Button size="icon-sm" class="min-h-0" type="button" data-input-clear aria-label={label} title={label}
      aria-controls={control} {disabled} onclick={clear}><Icon name="circle-x" decorative /></Group.Button>
  </Group.Addon>
{/if}
```

## src/svelte/catalog/foundations/masked-input/input-edit-history.ts

Source SHA-256: ec677b92cd776a73189497b282612f08583be120fcf12915225b00d863f0d600

```ts
export type InputSnapshot = Readonly<{
  text: string; start: number; end: number; direction: "forward" | "backward" | "none";
}>;
type Edit = { before: InputSnapshot; after: InputSnapshot; kind: string; time: number };
const adjacent = (left: InputSnapshot, right: InputSnapshot) => left.text === right.text &&
  left.start === left.end && right.start === right.end && left.end === right.start;

export function inputSnapshot(input: HTMLInputElement): InputSnapshot {
  return { text: input.value, start: input.selectionStart ?? input.value.length,
    end: input.selectionEnd ?? input.value.length, direction: input.selectionDirection ?? "none" };
}

/** Formatting assigns input.value and clears native undo; keep a bounded local equivalent. */
export function inputEditHistory(limit = 100, coalesceMilliseconds = 1000) {
  const past: Edit[] = [], future: Edit[] = [];
  let group: Edit | undefined;
  return {
    reset() { past.length = 0; future.length = 0; group = undefined; },
    boundary() { group = undefined; },
    record(before: InputSnapshot, after: InputSnapshot, kind: string, time = Date.now()) {
      if (before.text === after.text) return;
      const coalescible = ["insertText", "deleteContentBackward", "deleteContentForward"].includes(kind);
      if (coalescible && group && group.kind === kind && time - group.time <= coalesceMilliseconds && adjacent(group.after, before)) {
        group.after = after; group.time = time;
      } else {
        const edit = { before, after, kind, time };
        past.push(edit); if (past.length > limit) past.shift();
        group = coalescible && before.start === before.end ? edit : undefined;
      }
      future.length = 0;
    },
    undo() {
      group = undefined;
      const edit = past.pop(); if (!edit) return;
      future.push(edit); return edit.before;
    },
    redo() {
      group = undefined;
      const edit = future.pop(); if (!edit) return;
      past.push(edit); return edit.after;
    },
  };
}

export function historyKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey" | "shiftKey">) {
  if (event.altKey || !(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === "z") return event.shiftKey ? "redo" : "undo";
  if (key === "y" && event.ctrlKey && !event.metaKey && !event.shiftKey) return "redo";
}
```

## src/svelte/catalog/compositions/context-panel/ContextPanel.svelte

Source SHA-256: fba3a8e92a72958a4093dcc42c225fc5c14648e353e239c211f394064cbdcd74

```svelte
<script lang="ts">
  import { AttentionStatus, Column, ContextProperties, List, MediaObject, NodeRenderer, ReadingContent, Row, Spacer, StackLayout } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {}, actions, selectors = [], attention=[],presentation, onselect }: CatalogProps<"context-panel"> = $props();
  let remaining = $derived(fields.filter(field => field !== presentation?.media && field !== presentation?.description));
  let prose = $derived(remaining.filter(field => multiline.includes(field)));
  let metadata = $derived(remaining.filter(field => !multiline.includes(field)));
  let imageFields = $derived(metadata.filter(field => images.includes(field)));
  let properties = $derived(metadata.filter(field => !images.includes(field)));
</script>
<Column gap="relaxed">
    <AttentionStatus signals={attention} />
    {#if presentation}<MediaObject {facts} {presentation} />{/if}
    {#if prose.length}<ReadingContent fields={prose} {facts} {object} {labels} />{/if}
    {#if imageFields.length}
      <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details: { kind: "facts", fields: imageFields, facts, object, labels, images: imageFields } }} />
    {/if}
    <ContextProperties fields={properties} {facts} {object} {labels} {references} {selectors} {onselect}/>
    {#if actions.length}
      <!-- The empty track keeps one more gap before the actions, which sets them apart from what the object reads. -->
      <Spacer size="fill" />
      <StackLayout title={say(m.contextPanel.actions)}>
        <List kind="rows" measure="reading">
          {#each actions as action (action.id)}
            <Row label={action.label} leading={{ kind: "face", face: { kind: "icon", icon: "open" } }} trailing="chevron" interaction="open"
              available={action.available} current={false} onopen={action.invoke} />
          {/each}
        </List>
      </StackLayout>
    {/if}
</Column>
```

## src/svelte/catalog/renderer/facts/Facts.svelte

Source SHA-256: d023c99c1fe3e33a48481991be62fcf1f3976d54ad50c07f5370a3790a4b6667

```svelte
<script lang="ts">
  import { FactGroup } from "../../index.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { fields, facts, object, labels, multiline = [], images = [], tags = [], references = {} }: CatalogProps<"facts"> = $props();
</script>

<FactGroup {fields} {facts} {object} {labels} {multiline} {images} {tags} {references} />
```

## src/svelte/catalog/compositions/review/Review.svelte

Source SHA-256: 7b4bbfe3fc0d52613452f85d06068fc586f06cc42af12c84ef786679523dbc2e

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { Column, NodeRenderer, Text } from "../../index.ts";
  import { ResolvedNodeVersion } from "../../../../interaction/resolved-node.ts";
  let { details, recovery }: CatalogProps<"review"> = $props();
</script>
<!-- The recovery note stands 1rem under the prepared facts, in the muted body ink, announced when it appears. -->
<Column gap="regular">
  <NodeRenderer node={{ version: ResolvedNodeVersion, kind: "fact", details }} />
  {#if recovery}<Text kind="body" tone="muted" live="polite" text={recovery} />{/if}
</Column>
```

## src/svelte/catalog/foundations/destination-row/DestinationRow.svelte

Source SHA-256: b95e986171ce4cd0b70e364c7695427a99d564da4fcde5e2ca9edd4cbe55661a

```svelte
<script lang="ts">
  import { Button } from "../../../vendor/components/ui/button/index.js";
  import { Icon } from "../../index.ts";
  import { Face } from '../../index.ts';
  import type { CatalogProps } from '../../types.d.ts';
let { destination, label, available, open, icon = 'open', reason }: CatalogProps<'destination-row'> = $props();
  const generatedId = $props.id();
  const descriptionId = `${generatedId}-reason`;
</script>
<Button variant="row" size="row" class="destination-row" type="button"
  data-piece="destination-row" data-destination={destination} data-grouped-row
  disabled={!available} aria-describedby={!available && reason ? descriptionId : undefined} title={!available ? reason : undefined} onclick={()=>{if(available)open();}}>
  <Face face={{kind:'icon',icon}} />
  <span class="destination-title">{label}</span>
  <Icon name="chevron-right" placement="inline-end" chevron destination decorative />
</Button>
{#if !available && reason}<span id={descriptionId} class="sr-only">{reason}</span>{/if}
```

## src/svelte/catalog/foundations/drawer/Drawer.svelte

Source SHA-256: baf12ed19b7bf57dfc1f31dde1a08a896a4eafd986520ac747d75b876a134627

```svelte
<script lang="ts">
  // F1-merge: transitional adapter of the renamed piece. View-panel mounts Modal(adaptive|transient, continuity)
  // over the frame itself and maps dismissal to the frame's secondary intent; this folder is deleted in Batch 3.
  import { Modal } from "../../index.ts";
  import { SurfaceFrame } from "../../index.ts";
  import { InstanceFrame } from "../../index.ts";
  import { transientFrame } from "../../../../interaction/transient-frame.ts";
  import type { SurfaceIntent } from "../../../../interaction/intent.ts";
  import type { CatalogProps } from "../../types.d.ts";
  let { label, open, locked = false, onclose, onclosed, frame, invoke, edit, continuity, readingIdentity, body, controlEvent, presentation }:
    CatalogProps<"drawer"> = $props();
  let composition = $derived(transientFrame(frame, locked));
  let frames = $derived(continuity ? { frame: continuity, ...readingIdentity ? { reading: readingIdentity } : {} } : undefined);
  let modal = $state<ReturnType<typeof Modal>>();
  let dispatch = $derived.by(() => {
    const receiver = invoke, owner = continuity;
    return (intent: SurfaceIntent) => {
      if (owner === continuity) modal?.noteInvocation(intent.kind === "back" || intent.kind === "close" ? "close" : "other");
      receiver(intent);
    };
  });
  const close = () => {
    const navigation = composition.bottom.secondary;
    if (locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") { modal?.noteInvocation("close"); onclose?.(); }
    else dispatch(navigation.intent);
  };
</script>
<Modal bind:this={modal} {label} {open} {locked} presentation={presentation === "transient" ? "transient" : "adaptive"} continuity={frames}
  ondismiss={close} {onclosed}>
  {#if continuity}
    {#key continuity}<InstanceFrame frame={composition} {body} {edit} invoke={dispatch} {controlEvent} />{/key}
  {:else}
    <SurfaceFrame frame={composition} {edit} {controlEvent} presentation="transient" invoke={intent => intent.kind === "close" ? close() : dispatch(intent)} />
  {/if}
</Modal>
```

## src/svelte/catalog/foundations/modal/Modal.svelte

Source SHA-256: 27f25f6da8a7d0dc74843eae4c61329a959a8fc1e359d813b0e0cec6f55561e1

```svelte
<script lang="ts">
  import type { CatalogProps } from "../../types.d.ts";
  import { dismissWhenInactive } from "../../../infra/surface-activity.svelte.ts";
  import { useSurfaceDensityClass } from "../../../infra/surface-typography.svelte.ts";
  import type { FrameInvocation } from "./frame-continuity.svelte.ts";
  import ModalPane from "./ModalPane.svelte";
  import ModalSheet from "./ModalSheet.svelte";
  import ModalDialog from "./ModalDialog.svelte";
  import ModalNavigation from "./ModalNavigation.svelte";
  let { label, open, locked, presentation, labelledBy, describedBy, navigation, continuity, ondismiss, onclosed, children, actions }: CatalogProps<"modal"> = $props();
  const density = useSurfaceDensityClass();
  /** Escape, the scrim and the grip ask to dismiss; a locked modal refuses, and the caller decides what dismissal means. */
  const dismiss = () => { if (!locked) ondismiss?.(); };
  // A task pane stays open while its surface is hidden (a retained place); a sheet, message or media stage does not.
  dismissWhenInactive(() => { if (open && presentation !== "adaptive" && presentation !== "transient") dismiss(); });
  let pane = $state<ReturnType<typeof ModalPane>>();
  /** Called by the caller just before it invokes something: "close" before Back or Close, "other" otherwise. */
  export function noteInvocation(kind: FrameInvocation): void { pane?.noteInvocation(kind); }
</script>
{#if presentation === "adaptive" || presentation === "transient"}
  <ModalPane bind:this={pane} {label} {open} {locked} {presentation} {continuity} density={density()} {dismiss} {onclosed} {children} />
{:else if presentation === "navigation"}
  <ModalNavigation {label} {open} {navigation} {dismiss} {onclosed} {children} />
{:else if presentation === "sheet"}
  <ModalSheet {label} {open} {locked} density={density()} {dismiss} {onclosed} {children} />
{:else}
  <ModalDialog {label} {labelledBy} {describedBy} {open} {presentation} density={density()} {dismiss} {onclosed} {children} {actions} />
{/if}
```

## src/svelte/catalog/foundations/modal/ModalPane.svelte

Source SHA-256: e8f408a441cf3d851611e5bf6803ddd5d4c3a2e492187d35b7f7b8aac5dcb39e

```svelte
<script lang="ts">
  import { say } from "../../../infra/messages.ts";
  import { m } from "../../../../messages/keys.ts";
  // Modal part: the pane of an adaptive or transient modal. An adaptive pane docks beside its parent when the
  // launching host has room (it is then not modal); otherwise it is modal at the right edge, or at the bottom edge with
  // its grip. Fit, modality and edge come from the host's available space, never a browser breakpoint.
  import { tick, type Snippet } from "svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import * as Dialog from "../../../vendor/components/ui/dialog/index.js";
  import { useSurfaceHost } from "../../mechanisms/surface-host/surface-host.svelte.ts";
  import { surfaceFocus } from "../../mechanisms/surface-focus/surface-focus.svelte.ts";
  import DrawerGrip from "./DrawerGrip.svelte";
  import { drawerMotion } from "./drawer-motion.svelte.ts";
  import { frameContinuity, type FrameIdentity, type FrameInvocation } from "./frame-continuity.svelte.ts";
  import { adaptiveSurfaceLayout } from "./adaptive-surface-layout.ts";
  import { adaptiveModality } from "./adaptive-modality.svelte.ts";
  let { label, open, locked, presentation, continuity, density, dismiss, onclosed, children }: {
    label: string; open: boolean; locked: boolean; presentation: "adaptive" | "transient";
    continuity: FrameIdentity | undefined; density: string | undefined;
    dismiss: () => void; onclosed: (() => void) | undefined; children: Snippet | undefined;
  } = $props();
  let content = $state<HTMLElement | null>(null);
  const frames = frameContinuity(() => content, () => continuity);
  export function noteInvocation(kind: FrameInvocation) { frames.note(kind); }
  let opener: HTMLElement | null = null, wasOpen = false;
  $effect.pre(() => {
    if (open && !wasOpen) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpen = open;
  });
  const host = useSurfaceHost();
  const owner = Symbol("adaptive-pane");
  const layout = $derived(adaptiveSurfaceLayout(host.availableInline, host.textSize, presentation === "adaptive" && host.canDock(owner)));
  const docked = $derived(layout.docked);
  // A docked replacement may mount already open. Do not acquire a transient body lock against the pre-measurement zero
  // width: that false modal can be removed before the lock's teardown effect has even registered.
  const modal = $derived(open && host.measured && !docked);
  $effect(() => { host.reserve(owner, open && docked ? layout.reservation : 0); });
  $effect(() => () => host.reserve(owner, 0));
  adaptiveModality(() => content, () => modal);
  const motion = drawerMotion(() => dismiss(), () => locked || docked, () => layout.edge);
  const edge = $derived(motion.edge);
  const width = $derived(`${layout.paneWidth}px`);
  const dragHeader = (event: PointerEvent) => {
    const target = event.target;
    if (docked || layout.edge === "bottom" || !(target instanceof Element) || !target.closest(".workspace-header")
      || target.closest("button,a,input,textarea,select,[contenteditable],.toolbar-title,.toolbar-subtitle")) return;
    motion.down(event);
  };
  const focus = surfaceFocus(() => content);
  const restore = (event: Event) => {
    event.preventDefault();
    const target = opener, active = document.activeElement;
    const ownsFocus = !active || active === document.body || content?.contains(active);
    if (ownsFocus) void tick().then(() => {
      if (target?.isConnected && !target.closest("[inert],[hidden]")) target.focus({ preventScroll: true });
    });
  };
</script>
<Dialog.Root {open} onOpenChange={next => { if (!next) dismiss(); }}
  onOpenChangeComplete={next => { if (!next) { motion.reset(); onclosed?.(); } }}>
  <Dialog.Content bind:ref={content} presentation="panel" class={density} data-modal={presentation} data-composition="transient"
    adaptiveModal={!docked} trapFocus={false} preventScroll={modal}
    data-adaptive-surface="" data-presentation={docked ? "docked" : "transient"}
    data-locked={locked || undefined} data-reduced-motion={prefersReducedMotion.current} data-edge={edge}
    overlayStyle={motion.overlayStyle} data-dragging={motion.dragging || undefined}
    style={`--panel-width:${width};--adaptive-left:${host.bounds.left}px;--adaptive-top:${host.bounds.top}px;--adaptive-right:${host.bounds.right}px;--adaptive-bottom:${host.bounds.bottom}px;transform:${motion.transform}`}
    onpointerdown={dragHeader} onpointermove={motion.move} onpointerup={motion.up}
    onpointercancel={motion.cancel} onlostpointercapture={motion.lost}
    onOpenAutoFocus={event => focus.open(event)} onCloseAutoFocus={event => focus.close(event, restore)}
    onEscapeKeydown={event => { event.preventDefault(); if (!docked || content?.contains(document.activeElement)) dismiss(); }}
    onInteractOutside={event => { event.preventDefault(); if (!docked) dismiss(); }}>
    <Dialog.Title class="sr-only">{label}</Dialog.Title>
    <Dialog.Description class="sr-only">{say(m.modal.description)}</Dialog.Description>
    {#if edge === "bottom" && !docked}<DrawerGrip {motion} {locked} />{/if}
    {@render children?.()}
  </Dialog.Content>
</Dialog.Root>
```

## src/svelte/catalog/foundations/modal/drawer-motion.svelte.ts

Source SHA-256: 8c68b871f6267f78f8acd60dec7a4decc53ec0d6ebc6ff4834c15dad863e2214

```ts
// The drag of a modal's edge: direct manipulation until release, dismissing past the threshold (a modal part).
import { untrack } from "svelte";
import { swipeMotion } from "../../mechanisms/swipe-motion/swipe-motion.svelte.ts";

export function drawerMotion(close: () => void, locked: () => boolean, edge: () => "bottom" | "right") {
  const motion = swipeMotion({ edge, enabled: () => !locked(), commit: close });
  $effect(() => { edge(); untrack(motion.reset); });
  return {
    get edge() { return edge(); },
    get progress() { return motion.progress; },
    get dragging() { return motion.dragging; },
    get overlayStyle() { return `--surface-scrim-opacity:${1 - motion.progress * .6}`; },
    get transform() { return motion.transform; },
    down(event: PointerEvent) {
      if (locked() || !(event.currentTarget instanceof HTMLElement)) return;
      event.currentTarget.closest("[data-modal]")?.getAnimations().forEach(animation => animation.finish());
      motion.down(event);
    },
    move: motion.move, up: motion.up, click: motion.click, cancel: motion.cancel, lost: motion.lost, reset: motion.reset,
  };
}
```

## src/validation-result.ts

Source SHA-256: ebb98be0f6f9ba3190954761907ffe7704d856f4a07f9e9b6b53a1ab7b2d33e5

```ts
import type { ErrorObject } from "ajv";
import { freezeDeep, jsonSnapshot, type Json } from "./json.ts";

export type ValidationIssue = {
  readonly keyword: string;
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly params?: Readonly<Record<string, Json>>;
};
export type ValidationResult = { readonly valid: boolean; readonly issues: readonly ValidationIssue[] };
type Validator = { (value: unknown): boolean; errors?: readonly ErrorObject[] | null };

const isJsonRecord = (value: Json): value is Readonly<Record<string, Json>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** A validator's keyword parameters as a JSON record; anything else is a validator this module does not understand. */
function issueParams(params: ErrorObject["params"]): Readonly<Record<string, Json>> {
  const snapshot = jsonSnapshot(params);
  if (!isJsonRecord(snapshot)) throw new Error("INVALID_VALIDATION_PARAMS: validator parameters are not a JSON record");
  return snapshot;
}

/** Snapshot validator diagnostics before its next call; never derive another set of constraints. */
export function inspectValidation(validate: Validator, value: unknown): ValidationResult {
  let input;
  try { input = jsonSnapshot(value); }
  catch { return freezeDeep({ valid: false, issues: [{ keyword: "json_value", instancePath: "" }] }); }
  const valid = validate(input);
  const issues = (validate.errors ?? []).map(error => ({ keyword: error.keyword,
    instancePath: error.instancePath, schemaPath: error.schemaPath, params: issueParams(error.params) }));
  // Frozen in place: JSON parameters make Frozen<ValidationResult> unbounded, and the declared type is already readonly.
  const result: ValidationResult = { valid, issues };
  freezeDeep(result);
  return result;
}
```

## src/web/client/field-feedback.ts

Source SHA-256: 7e1810ccc1f46097167ba66179e9140447ab7b145ba34837a927d138b57e2ac5

```ts
import type { ValidationIssue, ValidationResult } from "../../validation-result.ts";

function message(issue: ValidationIssue): string {
  const limit = issue.params?.limit;
  if (issue.keyword === "required" || (issue.keyword === "minLength" && limit === 1)) return "Enter a value.";
  if (issue.keyword === "minLength" && typeof limit === "number") return `Enter at least ${limit} characters.`;
  if (issue.keyword === "maxLength" && typeof limit === "number") return `Use no more than ${limit} ${limit === 1 ? "character" : "characters"}.`;
  if (issue.keyword === "maxItems" && typeof limit === "number") return `Use no more than ${limit} labels.`;
  if (issue.keyword === "uniqueItems") return "Remove the repeated label.";
  return "Check this value.";
}

/** Presentation only: paths and keyword parameters are supplied by canonical validation. */
export function fieldFeedback(result: ValidationResult, touched: readonly string[], labelFields: readonly string[] = []): Readonly<Record<string, string>> {
  if (result.valid) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const path = issue.instancePath.split("/");
    const field = path[1]?.replace(/~1/g, "/").replace(/~0/g, "~");
    const labelItem = path.length === 3 && field !== undefined && labelFields.includes(field) && /^(0|[1-9][0-9]*)$/.test(path[2]!);
    const name = issue.keyword === "required" && issue.instancePath === "" ? issue.params?.missingProperty
      : path.length === 2 || labelItem ? field : undefined;
    if (typeof name === "string" && touched.includes(name) && !Object.hasOwn(errors, name)) {
      Object.defineProperty(errors, name, { value: message(issue), enumerable: true });
    }
  }
  return errors;
}
```

## src/web/client/model.ts

Source SHA-256: 6bc6950fe64fd1239fe7c49b2075c68572302e0a755996ef48fa6c5f177c3717

```ts
import type { HumanSurface, Mutation, ValidateInput } from "../types.ts";
import { humanState, restoreCreationDraft, subjectActionAvailable, type HumanState } from "./state.ts";
import { webTransport, type ControllerTransport, type Transport } from "./transport.ts";
import { observeWebConnection, type ConnectionObserver } from "./connection.ts";
import { mutationFlow } from "./mutations.ts";
import { referenceScopeSurface, type ModelScope } from "./model-scope.ts";
import type { ViewJourney } from "../../views/program-schema.ts";
import { releaseDraftFiles, type DraftFileHost } from "../../interaction/image-input.ts";
import type { AssetReference } from "../../assets/types.ts";
import { TransportError } from "./transport.ts";
import { emptyInputDraft } from "./input-draft.ts";
import { modelInputs } from "./model-inputs.ts";
import { canInitializeInput, isInitialInputValue } from "../../interaction/input-initialization.ts";
import { modelReads } from "./model-reads.ts";
import { samePublishedData } from "./published-data.ts";
import { privateImageAccess, type PrivateImageContext } from "./private-images.ts";
import { modelReferences } from './model-references.ts';
import { modelMediaReferences } from './model-media-references.ts';

export type InputInitialization = Extract<ViewJourney, { kind: "update" }>["initialize"];
export function humanProduct(surface: HumanSurface, validate: ValidateInput,
  options: { reading?: boolean; initialize?: Readonly<Record<string, InputInitialization>>; scope: ModelScope;
    transport?: ControllerTransport; files?: DraftFileHost; observeConnection?: ConnectionObserver }) {
  const scope = options.scope;
  surface=referenceScopeSurface(surface,scope);
  const read = scope.kind === "read" ? scope.read : undefined;
  const store = humanState(surface, scope);
  const transport: ControllerTransport & Partial<Pick<Transport, "connect">> = options.transport ?? webTransport(surface.contractDigest);
  let readEpoch = 0;
  let stopped = false;
  let starting: Promise<void> | undefined;
  let reading = options.reading ?? true;
  let stopConnection: (() => void) | undefined;
  const primary = () => scope.kind === "read" ? scope.creations.find(journey => journey.id === store.get().creationJourneyId) : undefined;
  const ready = (id: string) => store.get().availability.journeys[id]?.dependenciesReady === true;
  const reads = modelReads(scope, store, transport, () => !stopped && reading, () => readEpoch);
  const images = privateImageAccess(imageContext);
  const references=modelReferences(surface,store,transport,()=>!stopped&&reading,validate,read?.subject);
  const mediaReferences=modelMediaReferences(surface,store,transport,()=>!stopped&&reading,read?.subject);
  store.subscribe(() => images.refresh());

  function imageContext(asset: AssetReference): PrivateImageContext | undefined {
    const choice=mediaReferences.imageContext(asset);if(choice)return choice;
    const current = store.get(), epoch = readEpoch;
    const records = current.view === "detail" && current.detail?.id === current.selectedId ? [current.detail, ...current.records.filter(record => record.id !== current.detail!.id)]
      : current.view === "list" ? current.records : [];
    const publishesImage = (record: (typeof records)[number]) => read?.fields.some(field => {
      const value = record.facts[field];
      return typeof value === "object" && value !== null && "reference" in value && value.reference === asset.reference;
    }) === true;
    const record = records.find(publishesImage);
    if (!read || !record || stopped || !reading || !ready(read.id) || !transport.image) return undefined;
    const valid = () => {
      const next = store.get();
      return !stopped && reading && readEpoch === epoch && ready(read.id)
        && next.view === current.view && next.selectedId === current.selectedId
        && (next.detail?.id === record.id ? next.detail.version === record.version && publishesImage(next.detail)
          : next.records.some(item => item.id === record.id && item.version === record.version && publishesImage(item)));
    };
    return { valid, async read(variant, signal) {
      const run = await transport.call("begin", { journeyId: read.id, subject: record.id });
      if (!valid() || signal.aborted) throw new TransportError("IMAGE_READ_EXPIRED");
      return transport.image!({ runId: run.id, reference: asset.reference, variant }, { signal });
    } };
  }

  function invalidateReading() { readEpoch++; reads.invalidate(); images.refresh(); }
  function refresh() { invalidateReading(); return Promise.all([reads.request(),references.refresh(),mediaReferences.refresh()]).then(()=>{}); }
  function leaveSelection(view: HumanState["view"]): Partial<HumanState> {
    if (view !== "list") return {};
    invalidateReading();
    return { selectedId: null, detail: null, offers: {} };
  }
  const mutations = mutationFlow(surface, store, transport, validate, refresh, scope, options.files);
  function stop() { stopped = true; readEpoch++; reads.stop(); references.stop(); mediaReferences.stop(); images.close(); stopConnection?.(); mutations.cancelPending(); }
  return {
    snapshot: store.get, subscribe: store.subscribe, refresh, ...mutations, ...modelInputs(surface, store, options.files),
    referenceEvent(event:Parameters<typeof references.event>[0]){return event.kind==='reference.refresh'&&surface.fieldMediaReferences?.[`${read?.subject}.${event.control}`]
      ?mediaReferences.event(event.control):references.event(event);},
    start(invitation?: string) {
      if (stopped) return Promise.resolve();
      return starting ??= (async () => {
        if (invitation) {
          try {
            if (!transport.connect) throw new Error("BROWSER_SESSION_REQUIRED");
            await transport.connect(invitation);
          }
          catch { store.update({ error: "BROWSER_SESSION_REQUIRED" }); }
        }
        if (stopped) return;
        const observe = options.observeConnection ?? (publish => observeWebConnection(surface, transport, publish));
        stopConnection = observe(snapshot => {
          const wasReady = read ? ready(read.id) : false;
          if (!samePublishedData(store.get().availability, snapshot)) store.update({ availability: snapshot });
          const isReady = read ? ready(read.id) : false;
          if (wasReady && !isReady) { invalidateReading(); references.invalidate(); mediaReferences.invalidate(); }
          if (!wasReady && isReady) void refresh(); else if (isReady) reads.observe();
        });
      })();
    },
    stop,
    dispose() { stop(); releaseDraftFiles(store.get().draft, options.files);
      if (store.get().editing) releaseDraftFiles(store.get().editing!.creationDraft.draft, options.files); store.dispose(); },
    images, image: images.read,
    setReading(enabled: boolean) {
      if (reading === enabled) return;
      reading = enabled;
      invalidateReading();
      if (enabled) { void reads.request(); void references.refresh(); void mediaReferences.refresh(); }
    },
    create(journeyId = scope.kind === "read" ? scope.primaryCreation?.id : undefined) {
      const mutation = scope.kind === "read" ? scope.creations.find(item => item.id === journeyId) : undefined;
      if (!mutation || !read ||
        store.get().busy || store.get().uncertain || store.get().editing || !ready(mutation.id)) return;
      const current = store.get();
      const sameDraft = current.creationJourneyId === journeyId;
      if (!sameDraft) releaseDraftFiles(current.draft, options.files);
      const draft = emptyInputDraft(surface, mutation, sameDraft ? current.draft : {});
      store.update({ view: "create", creationOrigin: current.view === "detail" ? "detail" : "list",
        creationJourneyId: mutation.id, draft, ...(sameDraft ? {} : { touchedFields: [], draftRevision: 0 }),
        prepared: null, notice: "", error: null });
      void references.refresh();
      void mediaReferences.refresh();
    },
    startEdit(journeyId: string): boolean {
      const current = store.get(), detail = current.detail;
      const journey = surface.journeys.find(item => item.id === journeyId);
      const mapping = options.initialize?.[journeyId];
      if (current.view !== "detail" || !detail || current.selectedId !== detail.id ||
        journey?.kind !== "mutation" || !journey.subject || !journey.inputFields.length ||
        !subjectActionAvailable(surface, current, journeyId, detail.id, detail.version, scope) ||
        read?.kind !== "read" || read.subject !== journey.subject || !mapping ||
        mapping.length !== journey.inputFields.length || new Set(mapping.map(item => item.input)).size !== mapping.length ||
        mapping.some(item => !journey.inputFields.includes(item.input) || !read.fields.includes(item.fact) ||
          !canInitializeInput(journey.inputSchema.properties[item.input], read.detailSchema.properties[item.fact]) ||
          !isInitialInputValue(journey.inputSchema.properties[item.input], detail.facts[item.fact]))) return false;
      store.update({ view: "edit", editing: { journeyId, subject: detail.id, expectedVersion: detail.version,
        facts: { ...detail.facts }, creationDraft: { draft: { ...current.draft }, draftRevision: current.draftRevision,
          touchedFields: [...current.touchedFields] } },
        draft: Object.fromEntries(mapping.map(item => [item.input, structuredClone(detail.facts[item.fact]) as string | readonly string[]])),
        draftRevision: 0, touchedFields: [], prepared: null, mutationId: null, notice: "", error: null });
      void references.refresh();
      void mediaReferences.refresh();
      return true;
    },
    async select(id: string) {
      if (!read || store.get().busy || store.get().uncertain || store.get().editing || !ready(read.id)) return;
      store.update({ view: "detail", selectedId: id, detail: null, offers: {}, prepared: null, notice: "" });
      await refresh();
    },
    back() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      const view = current.view === "review" ? (current.editing ? "edit" : current.mutationId === current.creationJourneyId ? "create" : "detail")
        : current.view === "edit" ? "detail" : current.view === "create" ? current.creationOrigin : "list";
      if (current.view === "edit") releaseDraftFiles(current.draft, options.files);
      store.update({ view, ...leaveSelection(view), prepared: null, notice: "", ...(current.view === "edit" ? restoreCreationDraft(current) : {}) });
    },
    dismissError() { store.update({ error: null }); },
    close() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      if (current.editing) releaseDraftFiles(current.draft, options.files);
      const view = current.editing ? "detail" : current.view === "create" ? current.creationOrigin : "list";
      store.update({ view, ...leaveSelection(view),
        ...restoreCreationDraft(current), prepared: null, mutationId: null, notice: "" });
    },
    get primary(): Mutation { const value = primary(); if (!value) throw new Error("PRIMARY_CREATION_REQUIRED"); return value; },
  };
}
```

## src/web/client/mutations.ts

Source SHA-256: 14f3cec03f0686b0f79cf3dcaeaa1e858c9ebb8f68664c67ccfa585c97ba4acd

```ts
import type { HumanSurface, Mutation, ValidateInput, Receipt } from "../types.ts";
import { restoreCreationDraft, subjectActionAvailable, type HumanState, type HumanStore } from "./state.ts";
import { TransportError, acceptanceOutcomeUnknown, type ControllerTransport } from "./transport.ts";
import type { ModelScope } from "./model-scope.ts";
import { inspectMutationDraft } from "./draft-validation.ts";
import { isImageFileSelection, releaseDraftFiles, type DraftFileHost } from "../../interaction/image-input.ts";
import type { Facts } from "../../fact-values.ts";
import { requireMutationReceipt } from "./mutation-receipt.ts";

export function mutationFlow(surface: HumanSurface, store: HumanStore, transport: ControllerTransport,
  validate: ValidateInput, refresh: () => Promise<void>, scope: ModelScope, files?: DraftFileHost) {
  let activeOperation: object | null = null;
  let upload: AbortController | undefined;
  function ready(id: string) { return store.get().availability.journeys[id]?.dependenciesReady === true; }
  function failure(error: unknown) { store.update({ error: error instanceof TransportError ? error.code : "OPERATION_FAILED" }); }
  function startOperation(action: NonNullable<HumanState["pendingAction"]>) {
    const operation = activeOperation = {};
    store.update({ busy: true, pendingAction: action, receiptMissing: false, error: null, notice: "" });
    return operation;
  }
  function finishOperation(operation: object, patch: Partial<HumanState> = {}) {
    if (activeOperation !== operation) return false;
    activeOperation = null;
    store.update({ ...patch, busy: false, pendingAction: null });
    return true;
  }
  async function completed(receipt: Receipt, operation: object) {
    const current = store.get();
    const prepared = current.prepared, journey = surface.journeys.find(item => item.id === current.mutationId);
    requireMutationReceipt(prepared, journey, receipt);
    if (!prepared || journey?.kind !== "mutation") throw new TransportError("INVALID_RESPONSE");
    const wasCreate = !journey.subject;
    const wasEdit = current.editing?.journeyId === current.mutationId;
    const newerEdit = wasEdit && current.preparedRevision !== current.draftRevision;
    if ((wasCreate || wasEdit) && current.preparedRevision === current.draftRevision) releaseDraftFiles(current.draft, files);
    const finished = finishOperation(operation, { prepared: null, uncertain: false, receiptMissing: false,
      view: newerEdit ? "edit" : "detail", selectedId: receipt.object.id,
      detail: null, offers: {},
      notice: "Saved", ...(wasCreate && current.preparedRevision === current.draftRevision ? { draft: {}, touchedFields: [] } : {}),
      ...(wasEdit ? newerEdit ? { editing: { ...current.editing!, expectedVersion: receipt.object.version, facts: prepared.facts } }
        : restoreCreationDraft(current) : {}) });
    if (finished) await refresh();
  }
  async function invoke(journey: Mutation, subject?: string) {
    const current = store.get();
    if (scope.kind !== "read" || ![...scope.creations, ...scope.subjectActions].some(item => item.id === journey.id)) return;
    const editing = current.editing;
    if (editing && (current.view !== "edit" || journey.id !== editing.journeyId || subject && subject !== editing.subject)) return;
    const target = editing?.subject ?? subject;
    if ((journey.subject && !target) || (!journey.subject && target)) return;
    if (target && !subjectActionAvailable(surface, current, journey.id, target, undefined, scope)) return;
    const input = target && !editing ? {} : { ...current.draft };
    if (current.busy || current.uncertain || !ready(journey.id) || !inspectMutationDraft(surface, journey, input, validate).valid) return;
    const selected = Object.entries(input).flatMap(([inputField, value]) => {
      if (!isImageFileSelection(value)) return [];
      const file = files?.resolve(value.file.id);
      return [{ inputField, file }];
    });
    if (selected.some(item => !item.file) || selected.length && !transport.stageImage) {
      failure(new TransportError("IMAGE_UPLOAD_UNAVAILABLE")); return;
    }
    const operation = startOperation("invoke");
    const abort = upload = new AbortController();
    try {
      const run = await transport.call("begin", { journeyId: journey.id, ...(target ? { subject: target } : {}) });
      if (activeOperation !== operation || current.draftRevision !== store.get().draftRevision) return;
      const staged = Object.fromEntries(Object.entries(input).filter(([, value]) => !isImageFileSelection(value))) as Facts;
      for (const item of selected) {
        staged[item.inputField] = await transport.stageImage!({ runId: run.id, inputField: item.inputField, file: item.file! }, { signal: abort.signal });
        if (activeOperation !== operation || current.draftRevision !== store.get().draftRevision) return;
      }
      if (!validate(journey.commandId, staged)) throw new TransportError("INVALID_INPUT");
      const prepared = await transport.call("prepare", { runId: run.id, input: staged,
        ...(editing ? { options: { expectedVersion: editing.expectedVersion } } : {}) });
      if (activeOperation !== operation) return;
      if (prepared.runId !== run.id || prepared.journeyId !== journey.id) throw new TransportError("INVALID_RESPONSE");
      if (target && prepared.object.id !== target) throw new TransportError("INVALID_RESPONSE");
      if (editing && (prepared.object.id !== editing.subject || prepared.object.expectedVersion !== editing.expectedVersion)) {
        throw new TransportError("INVALID_RESPONSE");
      }
      if ((!target || editing) && current.draftRevision !== store.get().draftRevision) return;
      store.update({ prepared, mutationId: journey.id, preparedRevision: current.draftRevision });
      if (surface.commit[journey.id] !== "submit") store.update({ view: "review" });
      else if (surface.commit[journey.id] === "submit") await acceptPrepared(operation);
      else throw new TransportError("INVALID_COMMIT_MODE");
    } catch (error) { if (activeOperation === operation) failure(error); }
    finally { if (upload === abort) upload = undefined; finishOperation(operation); }
  }
  async function acceptPrepared(operation: object) {
    const current = store.get();
    if (!current.prepared || !current.mutationId) throw new TransportError("INVALID_OPERATION");
    try {
      if (!ready(current.mutationId)) throw new TransportError("CONTROLLER_UNAVAILABLE");
      store.update({ pendingAction: "accept", receiptMissing: false });
      const receipt = await transport.call("accept", { intentId: current.prepared.id,
        confirmationDigest: current.prepared.confirmationDigest });
      await completed(receipt, operation);
    } catch (error) {
      if (activeOperation !== operation) return;
      const uncertain = current.uncertain || acceptanceOutcomeUnknown(error);
      store.update({ uncertain, ...(uncertain ? { view: "recovery" } : {}) });
      failure(error);
    }
  }
  async function accept() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    if (current.view !== "review" && current.view !== "recovery") return;
    const operation = startOperation("accept");
    try { await acceptPrepared(operation); }
    finally { finishOperation(operation); }
  }
  async function recover() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    const operation = startOperation("recover");
    try {
      const receipt = await transport.call("receipt", { intentId: current.prepared.id });
      if (receipt) await completed(receipt, operation);
      else store.update({ receiptMissing: true });
    } catch (error) { if (activeOperation === operation) failure(error); }
    finally { finishOperation(operation); }
  }
  return { invoke, accept, recover, cancelPending() { activeOperation = null; upload?.abort(); upload = undefined; } };
}
```

## src/web/client/transport.ts

Source SHA-256: a84cea81e116914be6a7a018cff29f47aa7ca64d86bcbd22130f72347212c0ef

```ts
import type { ApiMethods, Evidence } from "../types.ts";
import { Check } from "@sinclair/typebox/value";
import { AssetReferenceSchema, type AssetReference, type AssetImageVariant } from "../../assets/types.ts";
import {privateMediaTypes} from "../../assets/policy.ts";
import { schedulePrivateImageRead, waitForPrivateImageCapacity } from './private-image-queue.ts';

export class TransportError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function acceptanceOutcomeUnknown(error: unknown): boolean {
  return !(error instanceof TransportError) || ["CONNECTION_LOST", "COMMIT_UNCERTAIN", "CONTROLLER_UNAVAILABLE",
    "INVALID_RESPONSE", "BROWSER_SESSION_CHANGED"].includes(error.code);
}

export type WebSessionBinding = { readonly kind: "developer" } | {
  readonly kind: "identity"; readonly sessionBinding: string;
  isCurrent(): boolean; invalidate(): void;
};

export function webTransport(digest: string, binding?: WebSessionBinding) {
  function requireCurrentSession() {
    if (!binding) throw new TransportError("BROWSER_SESSION_BINDING_REQUIRED");
    if (binding.kind === "identity" && !binding.isCurrent()) throw new TransportError("BROWSER_SESSION_CHANGED");
  }
  function headers(contentType?: string) {
    requireCurrentSession();
    return { ...(contentType ? { "Content-Type": contentType } : {}), "X-Desert-Contract": digest,
      ...(binding?.kind === "identity" ? { "X-Desert-Session": binding.sessionBinding } : {}) };
  }
  function requireBoundResponse(response: Response) {
    requireCurrentSession();
    if (binding?.kind === "identity") {
      if (response.status === 401) { binding.invalidate(); throw new TransportError("BROWSER_SESSION_CHANGED"); }
      if (response.headers.get("X-Desert-Session") !== binding.sessionBinding) {
        if (!response.ok) throw new TransportError("CONTROLLER_UNAVAILABLE");
        binding.invalidate(); throw new TransportError("BROWSER_SESSION_CHANGED");
      }
    }
  }
  async function request(path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    try {
      const response = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST",
        headers: headers("application/json"),
        credentials: "same-origin", cache: "no-store", signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(path === "availability" ? 1200 : 20000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      requireBoundResponse(response);
      const result = await response.json();
      requireCurrentSession();
      if (!response.ok) throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
      return result;
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError("CONNECTION_LOST");
    }
  }
  return {
    async connect(invitation: string) {
      const result = await request("connect", { invitation }) as { contractDigest: string };
      if (result.contractDigest !== digest) throw new TransportError("CONTRACT_MISMATCH");
    },
    async evidence() { return await request("availability") as Evidence; },
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"], options: { signal?: AbortSignal } = {}): Promise<ApiMethods[K]["output"]> {
      return await request(method, input, options.signal) as ApiMethods[K]["output"];
    },
    async stageImage(input: { runId: string; inputField: string; file: Blob }, options: { signal?: AbortSignal } = {}): Promise<AssetReference> {
      options.signal?.throwIfAborted();
      const reserved = await request("reserveImage", { runId: input.runId, inputField: input.inputField, size: input.file.size });
      if (!Check(AssetReferenceSchema, reserved)) throw new TransportError("INVALID_RESPONSE");
      const query = new URLSearchParams({ runId: input.runId, inputField: input.inputField });
      try {
        const response = await fetch(`/api/private-images/${reserved.reference}?${query}`, { method: "POST", body: input.file,
          headers: headers("application/octet-stream"), credentials: "same-origin", cache: "no-store",
          signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(120000)]) : AbortSignal.timeout(120000) });
        requireBoundResponse(response);
        const result = await response.json();
        requireCurrentSession();
        if (!response.ok) throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
        if (!Check(AssetReferenceSchema, result) || result.reference !== reserved.reference) throw new TransportError("INVALID_RESPONSE");
        return result;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        if (error instanceof TransportError) throw error;
        const status = await request("imageStatus", { runId: input.runId, inputField: input.inputField, reference: reserved.reference }) as ApiMethods["imageStatus"]["output"];
        if ((status.state === "ready" || status.state === "attached") && Check(AssetReferenceSchema, status.asset)
          && status.asset.reference === reserved.reference) return status.asset;
        throw new TransportError("IMAGE_UPLOAD_NOT_READY");
      }
    },
    async image(input: { runId: string; reference: string; variant: AssetImageVariant }, options: { signal?: AbortSignal } = {}): Promise<Blob> {
      const query = new URLSearchParams({ runId: input.runId, variant: String(input.variant) });
      const signal = AbortSignal.any([AbortSignal.timeout(20000), ...(options.signal ? [options.signal] : [])]);
      try {
        return await schedulePrivateImageRead(signal, async () => {
          for (let attempt = 0; ; attempt++) {
            signal.throwIfAborted();
            const response = await fetch(`/api/private-images/${encodeURIComponent(input.reference)}?${query}`, {
              headers: headers(), credentials: "same-origin", cache: "no-store", signal });
            requireBoundResponse(response);
            if (!response.ok) {
              const result = await response.json(); requireCurrentSession();
              if (result.error === 'ASSET_TRANSFER_BUSY' && attempt < 4) {
                await waitForPrivateImageCapacity(signal, 100 * 2 ** attempt); continue;
              }
              throw new TransportError(typeof result.error === "string" ? result.error : "INVALID_RESPONSE");
            }
            const blob = await response.blob();
            requireCurrentSession();
            if (!(input.variant==="original"?privateMediaTypes:["image/webp"]).includes(blob.type)) throw new TransportError("INVALID_RESPONSE");
            return blob;
          }
        });
      } catch (error) {
        if (options.signal?.aborted || error instanceof TransportError) throw error;
        if (error instanceof Error && error.message === 'ASSET_TRANSFER_BUSY') throw new TransportError('ASSET_TRANSFER_BUSY');
        throw new TransportError("CONNECTION_LOST");
      }
    },
  };
}
export type Transport = ReturnType<typeof webTransport>;
/** Trusted host port; connection provisioning stays in the host-specific adapter. */
export type ControllerTransport = Pick<Transport, "call" | "evidence"> & Partial<Pick<Transport, "stageImage" | "image">>;
```

## src/web/gateway.ts

Source SHA-256: 7570a6d4ab7c2dc65f2f7e7603d3b5582ccc1cc624573a67efd0fbfc91e05bd5

```ts
import type { LocalSession } from "../local.ts";
import { localBrowserAccess } from "./access.ts";
import { gatewayTransport } from "./gateway-transport.ts";

export function localWebGateway(session: LocalSession, digest: string) {
  const access = localBrowserAccess();
  return { invitation: access.invitation, ...gatewayTransport(digest, {
    initial: session,
    resolve: cookie => access.authenticated(cookie) ? { session } : undefined,
    async request({ operation, request, body }) {
      if (operation === "accessState" && request.method === "GET") return { status: 200, value: { kind: "developer" } };
      if (operation !== "connect" || request.method !== "POST") return undefined;
      const input = await body();
      const invitation = input && typeof input === "object" && "invitation" in input ? input.invitation : undefined;
      return { status: 200, value: { contractDigest: digest }, cookie: access.connect(invitation) };
    },
  }) };
}
```

## src/web/dispatch.ts

Source SHA-256: 9a851b2451b7acba3f5edb51a1a7bcc37c2cebcaccdc50a75ffc0dc165f14f49

```ts
import type { LocalSession } from "../local.ts";
import { createSchemaValidator } from "../validation.ts";
import { Requests, type Method, type RequestInput } from "./protocol.ts";
import type { ApiMethods } from "./types.ts";

const validators = Object.fromEntries(Object.entries(Requests).map(([method, schema]) =>
  [method, createSchemaValidator(schema)]));

export function dispatch<K extends Method>(session: LocalSession, method: K, value: RequestInput<K>): Promise<ApiMethods[K]["output"]>;
export function dispatch(session: LocalSession, method: string, value: unknown): Promise<ApiMethods[Method]["output"]>;
export function dispatch(session: LocalSession, method: string, value: unknown) {
  if (!Object.hasOwn(Requests, method)) throw new Error("UNKNOWN_OPERATION");
  if (!validators[method]!(value)) throw new Error("INVALID_REQUEST");
  const handlers: { [K in Method]: (input: RequestInput<K>) => ReturnType<LocalSession[K]> } = {
    reserveImage: input => session.reserveImage(input.runId, input.inputField, input.size),
    imageStatus: input => session.imageStatus(input.runId, input.inputField, input.reference),
    activityCreate: input => session.activityCreate(input.occurrence, input.plan, input.options),
    activityList: input => session.activityList(input),
    activityRead: input => session.activityRead(input.id),
    activityAnswer: input => session.activityAnswer(input.id, input.revision, input.step, input.input),
    activityReopen: input => session.activityReopen(input.id, input.revision, input.step),
    activityPrepare: input => session.activityPrepare(input.id, input.revision),
    activityCancel: input => session.activityCancel(input.id, input.revision),
    preflight: input => session.preflight(input.journeyId, input.input, input.options),
    begin: input => session.begin(input.journeyId, input.subject),
    prepare: input => session.prepare(input.runId, input.input, input.options),
    read: input => session.read(input.runId),
    accept: input => session.accept(input.intentId, input.confirmationDigest),
    receipt: input => session.receipt(input.intentId),
    offer: input => session.offer(input.journeyId, input.subject),
  };
  return handlers[method as Method](value as never);
}
```

## src/local/session.ts

Source SHA-256: 84320c32740753faca1a7cc379379eae8680ce0477ce351f17263bf975860252

```ts
import type { PoolClient } from "pg";
import { jsonSnapshot } from "../json.ts";
import { authenticate } from "./identity.ts";
import { beginJourney, readJourney } from "./admission.ts";
import { prepareMutation } from "./prepare.ts";
import { acceptMutation, recoverReceipt } from "./accept.ts";
import type { Database } from "./database.ts";
import type { LocalProgram } from "./program.ts";
import { requireInstallation } from "./installation.ts";
import { watchLocalAvailability, type LocalAvailabilityOptions } from "./availability.ts";
import { inspectOffer } from "./offer.ts";
import { rememberSession } from "./session-binding.ts";
import { snapshotPrepareOptions, type PrepareOptions } from "../prepare-options.ts";
import { snapshotPreflightOptions, type PreflightOptions } from "../preflight.ts";
import { preflightMutation } from "./preflight.ts";
import { requireActivityCatalog, type ActivityIndex } from "../activities/activity-index.ts";
import { activityRecord, activitySnapshot } from "../activities/records.ts";
import { answerActivity, cancelActivity, reopenActivity } from "../activities/drafts.ts";
import { createActivity } from "../activities/create.ts";
import { listActivities, snapshotActivityListOptions } from "../activities/discovery.ts";
import type { ActivityListOptions } from "../activities/schema.ts";
import { prepareActivity } from "../activities/prepare.ts";
import { readActivity } from "../activities/read.ts";
import { privateImageSession } from "../assets/session.ts";
import type { PrivateImageHost } from "../assets/host.ts";

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number,
  activities?: ActivityIndex, images?: PrivateImageHost) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>, readOnly = false) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, roles: program.roles }, !readOnly);
      const result = await operation(client, await authenticate(client, token, !readOnly));
      await authenticate(client, token, !readOnly);
      return result;
    }, readOnly);
  const session = Object.freeze({
    ...privateImageSession(transact, program, surface, images),
    activityCreate(occurrence: string, plan: unknown, options: PreflightOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(plan);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => createActivity(client, program, catalog, actor, surface, occurrence, snapshot, metadata));
    },
    async activityList(options: ActivityListOptions = {}) {
      const catalog = requireActivityCatalog(activities, program.application);
      const snapshot = snapshotActivityListOptions(options);
      return transact((client, actor) => listActivities(client, program, catalog, actor, surface, snapshot), true);
    },
    activityRead(id: string) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => readActivity(client, program, catalog, actor, surface, id));
    },
    activityAnswer(id: string, revision: number, step: number, input: unknown) {
      const catalog = requireActivityCatalog(activities, program.application), snapshot = jsonSnapshot(input);
      return transact((client, actor) => answerActivity(client, program, catalog, actor, surface, id, revision, step, snapshot));
    },
    activityReopen(id: string, revision: number, step: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => reopenActivity(client, program, catalog, actor, surface, id, revision, step));
    },
    activityPrepare(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => prepareActivity(client, program, catalog, actor, surface, id, revision, lifetime));
    },
    activityCancel(id: string, revision: number) {
      const catalog = requireActivityCatalog(activities, program.application);
      return transact((client, actor) => cancelActivity(client, program, catalog, actor, surface, id, revision));
    },
    async preflight(journeyId: string, input: unknown, options: PreflightOptions = {}) {
      const snapshot = jsonSnapshot(input);
      const metadata = snapshotPreflightOptions(options);
      return transact((client, actor) => preflightMutation(client, program, actor, surface, journeyId, snapshot, metadata), true);
    },
    offer(journeyId: string, subject: string) {
      return transact((client, actor) => inspectOffer(client, program, actor, surface, journeyId, subject));
    },
    watchAvailability(options?: LocalAvailabilityOptions) {
      return watchLocalAvailability(database, program, token, surface, options);
    },
    begin(journeyId: string, subject?: string) {
      return transact((client, actor) => beginJourney(client, program, actor, surface, journeyId, subject, lifetime));
    },
    read(runId: string) {
      return transact((client, actor) => readJourney(client, program, actor, surface, runId));
    },
    async prepare(runId: string, input: unknown, options?: PrepareOptions) {
      const snapshot = jsonSnapshot(input);
      const base = options === undefined ? undefined : snapshotPrepareOptions(options);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot, base, images?.store.id));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest, activities, images?.store.id));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, roles: program.roles,
    ...(activities ? { activitiesDigest: activities.digest } : {}) });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
```

## src/local/admission.ts

Source SHA-256: 071dd51524f18ffb032b070ad3d7a41539f072bb0bb19b481d960f7381d8aba4

```ts
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import type { StoredObject } from "./types.ts";
import { matchesConditions } from "./conditions.ts";

export async function beginJourney(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, journeyId: string, subject: string | undefined, lifetime: number) {
  const journey = program.journey(surface, journeyId);
  const object = journey.kind === "read" ? journey.object : journey.command.object;
  if (journey.kind === "mutation") {
    if (journey.command.kind === "create" && subject !== undefined) throw new Error("UNEXPECTED_SUBJECT");
    if (journey.command.kind === "update" && subject === undefined) throw new Error("SUBJECT_REQUIRED");
  }
  if (subject !== undefined) await ownedObject(client, program, actor, object, subject);
  const id = randomUUID();
  const { rows: [row] } = await client.query(`INSERT INTO desert_runs
    (id, actor, surface, journey, subject, contract_digest, expires_at, state)
    VALUES ($1, $2, $3, $4, $5, $6, clock_timestamp() + $7 * interval '1 millisecond', 'admitted') RETURNING expires_at`,
  [id, actor, surface, journeyId, subject ?? null, program.application.digest, lifetime]);
  return Object.freeze({ id, journeyId, expiresAt: row.expires_at.toISOString() as string });
}

export async function readJourney(client: PoolClient, program: LocalProgram, actor: string, surface: string, runId: string) {
  const run = await admittedRun(client, program, actor, surface, runId);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "read") throw new Error("NOT_A_READ_JOURNEY");
  const records = run.subject ? [await ownedObject(client, program, actor, journey.object, run.subject)] :
    (await client.query<StoredObject>(`SELECT * FROM desert_objects
      WHERE object_type = $1 AND facts ->> $2 = $3 ORDER BY id`, [journey.object, program.owners.get(journey.object), actor])).rows;
  const fields = run.subject ? journey.fields : journey.collection;
  await requireLiveRun(client, run);
  return freezeDeep(records.flatMap(record => {
    if (!program.application.validate(journey.object, record.facts).valid) throw new Error("CORRUPT_OBJECT");
    if (!matchesConditions(record.facts, journey.where ?? {})) return [];
    return [{ id: record.id, version: record.version,
      facts: Object.fromEntries(fields.map(field => [field, record.facts[field]!])) }];
  }));
}
```

## src/local/prepare.ts

Source SHA-256: 1be06e63a0cf67a59e5b8f3b5339d631356166dba43c54612bb135b02e534cd9

```ts
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize, preparedView } from "./effects.ts";
import type { Facts, Intent } from "./types.ts";
import type { PrepareOptions } from "../prepare-options.ts";
import { bindImageEffect } from "../assets/acceptance.ts";
import { validateReferences } from './reference-validation.ts';

export async function prepareMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, runId: string, input: unknown, options?: PrepareOptions, imageStoreId?: string) {
  const run = await admittedRun(client, program, actor, surface, runId);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  if (!program.application.validateInput(journey.command.id, input).valid) throw new Error("INVALID_INPUT");
  const expectedVersion = options?.expectedVersion;
  if (journey.command.kind === "create" && options !== undefined) throw new Error("INVALID_EDIT_BASE");
  if (journey.command.kind === "update" && journey.command.input.length && expectedVersion === undefined) {
    throw new Error("EDIT_BASE_REQUIRED");
  }
  const values = input as Facts;
  const { rows: [existing] } = await client.query<Intent>("SELECT * FROM desert_intents WHERE run_id = $1", [run.id]);
  if (existing) {
    if (canonical(existing.input) !== canonical(values) ||
      (expectedVersion !== undefined && expectedVersion !== existing.effect.expectedVersion)) throw new Error("INTENT_CONFLICT");
    return preparedView(program, run, existing);
  }
  if (run.state !== "admitted") throw new Error("INVALID_RUN_STATE");
  const record = journey.command.kind === "update"
    ? await ownedObject(client, program, actor, journey.command.object, run.subject!) : undefined;
  if (expectedVersion !== undefined && record?.version !== expectedVersion) throw new Error("VERSION_CONFLICT");
  const effect = await bindImageEffect(client, program, run, journey, values,
    materialize(program, journey, actor, values, record?.id ?? randomUUID(), record), imageStoreId);
  await validateReferences(client,program,actor,effect.objectType,effect.facts,effect.objectId);
  const intent: Intent = { id: randomUUID(), run_id: run.id, input: values, effect,
    confirmation_digest: confirmationDigest(run, values, effect) };
  await requireLiveRun(client, run);
  await client.query("INSERT INTO desert_intents VALUES ($1, $2, $3, $4, $5)",
    [intent.id, run.id, JSON.stringify(values), JSON.stringify(effect), intent.confirmation_digest]);
  await client.query("UPDATE desert_runs SET state = 'prepared' WHERE id = $1", [run.id]);
  return preparedView(program, run, intent);
}
```

## src/local/accept.ts

Source SHA-256: 985271ad5e36f08f43229323c598ff0867cab7dab7b6fea7e4fdacbbe0567c1a

```ts
import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize } from "./effects.ts";
import { requireUUID, type Intent, type Receipt, type ReceiptRow } from "./types.ts";
import { requireCurrentActivityIntent, completeActivityIntent } from "../activities/acceptance.ts";
import type { ActivityIndex } from "../activities/activity-index.ts";
import { bindImageEffect, attachImageEffect } from "../assets/acceptance.ts";
import { validateReferences } from './reference-validation.ts';

export async function loadIntent(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  requireUUID(id);
  const { rows: [intent] } = await client.query<Intent>(`SELECT i.* FROM desert_intents i
    JOIN desert_runs r ON i.run_id = r.id WHERE i.id = $1 AND r.actor = $2 AND r.surface = $3`, [id, actor, surface]);
  if (!intent) throw new Error("NOT_FOUND");
  const run = await admittedRun(client, program, actor, surface, intent.run_id, true);
  if (confirmationDigest(run, intent.input, intent.effect) !== intent.confirmation_digest) throw new Error("CORRUPT_INTENT");
  return { intent, run };
}

async function receipt(client: PoolClient, id: string) {
  const { rows: [row] } = await client.query<Pick<ReceiptRow, "result">>("SELECT result FROM desert_receipts WHERE intent_id = $1", [id]);
  return row ? freezeDeep(row.result) : null;
}

export async function recoverReceipt(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  await loadIntent(client, program, actor, surface, id);
  return receipt(client, id);
}

export async function acceptMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, id: string, expectedDigest: string, activities?: ActivityIndex, imageStoreId?: string) {
  await requireCurrentActivityIntent(client, id, actor, surface, activities);
  const { intent, run } = await loadIntent(client, program, actor, surface, id);
  if (expectedDigest !== intent.confirmation_digest) throw new Error("CONFIRMATION_MISMATCH");
  const existing = await receipt(client, id);
  if (existing) return existing;
  await requireLiveRun(client, run);
  if (run.state !== "prepared") throw new Error("INVALID_RUN_STATE");
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  const record = journey.command.kind === "update"
    ? await ownedObject(client, program, actor, journey.command.object, run.subject!) : undefined;
  if ((record?.version ?? 0) !== intent.effect.expectedVersion) throw new Error("VERSION_CONFLICT");
  const effect = await bindImageEffect(client, program, run, journey, intent.input,
    materialize(program, journey, actor, intent.input, intent.effect.objectId, record), imageStoreId);
  if (canonical(effect) !== canonical(intent.effect)) throw new Error("EFFECT_CHANGED");
  await validateReferences(client,program,actor,effect.objectType,effect.facts,effect.objectId);
  await requireLiveRun(client, run);
  const version = effect.expectedVersion + 1;
  if (effect.kind === "create") {
    await client.query("INSERT INTO desert_objects VALUES ($1, $2, $3, $4)",
      [effect.objectId, effect.objectType, version, JSON.stringify(effect.facts)]);
  } else {
    const updated = await client.query("UPDATE desert_objects SET version = $1, facts = $2 WHERE id = $3 AND version = $4",
      [version, JSON.stringify(effect.facts), effect.objectId, effect.expectedVersion]);
    if (updated.rowCount !== 1) throw new Error("VERSION_CONFLICT");
  }
  await attachImageEffect(client, effect);
  const result: Receipt = { id, runId: run.id, commandId: journey.command.id, status: "completed",
    object: { id: effect.objectId, type: effect.objectType, version } };
  await client.query("INSERT INTO desert_receipts (intent_id, result) VALUES ($1, $2)", [id, JSON.stringify(result)]);
  await client.query("UPDATE desert_runs SET state = 'completed' WHERE id = $1", [run.id]);
  await completeActivityIntent(client, id);
  return freezeDeep(result);
}
```

## src/local/database.ts

Source SHA-256: e08211c56cd59d991bf5cf172e86caa2116f20d2611668ea6cad4d85071c9c61

```ts
import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { Pool, type PoolClient } from "pg";
import { LocalSchemaVersion, requireDurablePrimary, requireInstallation } from "./installation.ts";

export type LocalDatabase = { socketDirectory: string, database: string, user: string, port?: number };

export function localDatabase(options: LocalDatabase) {
  if (!isAbsolute(options.socketDirectory)) throw new Error("LOCAL_SOCKET_REQUIRED");
  const socket = statSync(options.socketDirectory);
  if (!socket.isDirectory() || socket.uid !== process.getuid?.() || (socket.mode & 0o077)) {
    throw new Error("PRIVATE_SOCKET_REQUIRED");
  }
  const pool = new Pool({ host: options.socketDirectory, database: options.database, user: options.user,
    port: options.port ?? 5432, max: 8, connectionTimeoutMillis: 5000 });
  const faults = new Set<(error: unknown) => void>();
  const closing = new Set<() => void>();
  let closed = false;
  let completion: Promise<void> | undefined;
  const assertOpen = () => { if (closed) throw new Error("CONTROLLER_CLOSED"); };
  const notifyFault = (error: unknown) => { for (const listener of faults) listener(error); };
  const clientFaults = new WeakMap<PoolClient, unknown>();
  function recordFault(client: PoolClient, error: unknown) {
    if (clientFaults.has(client)) return;
    clientFaults.set(client, error);
    notifyFault(error);
  }
  // Pool checkout removes its idle listener before the awaiting caller resumes.
  pool.on("connect", client => { client.on("error", error => recordFault(client, error)); });
  pool.on("error", (error, client) => recordFault(client, error));
  const requireHealthy = (client: PoolClient) => {
    if (clientFaults.has(client)) throw clientFaults.get(client);
  };

  async function transaction<T>(operation: (client: PoolClient) => Promise<T>, readOnly = false): Promise<T> {
    assertOpen();
    const client = await pool.connect();
    let committing = false;
    let broken = false;
    try {
      assertOpen();
      requireHealthy(client);
      await client.query(readOnly
        ? "BEGIN READ ONLY; SET LOCAL lock_timeout = '1s'; SET LOCAL statement_timeout = '1s'"
        : "BEGIN; SET LOCAL lock_timeout = '5s'; SET LOCAL statement_timeout = '15s'; SET LOCAL synchronous_commit = on");
      const result = await operation(client);
      requireHealthy(client);
      committing = true;
      await client.query("COMMIT");
      return result;
    } catch (error) {
      if (!clientFaults.has(client)) await client.query("ROLLBACK").catch(() => { broken = true; });
      if (committing && !readOnly) throw new Error("COMMIT_UNCERTAIN: recover the original intent receipt", { cause: error });
      throw error;
    } finally { client.release(broken || clientFaults.has(client)); }
  }

  async function install(product: string, digest: string, roles: readonly string[]) {
    await transaction(async client => {
      await requireDurablePrimary(client);
      await client.query("SELECT pg_advisory_xact_lock(842721)");
      await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
      await client.query(readFileSync(new URL("../activities/schema.sql", import.meta.url), "utf8"));
      await client.query(readFileSync(new URL("../identity/schema.sql", import.meta.url), "utf8"));
      await client.query(`INSERT INTO desert_installation VALUES (true, $1, $2, $3, $4)
        ON CONFLICT DO NOTHING`, [LocalSchemaVersion, product, digest, roles]);
      await requireInstallation(client, { product, digest, roles });
    });
  }
  return { transaction, install, assertOpen,
    onFault(listener: (error: unknown) => void) { assertOpen(); faults.add(listener); return () => { faults.delete(listener); }; },
    onClose(listener: () => void) { assertOpen(); closing.add(listener); return () => { closing.delete(listener); }; },
    close() {
      if (!closed) {
        closed = true;
        for (const listener of closing) listener();
        closing.clear();
        faults.clear();
        completion = pool.end();
      }
      return completion!;
    },
  };
}
export type Database = ReturnType<typeof localDatabase>;
```
