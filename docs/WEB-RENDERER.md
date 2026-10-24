# The DESERT human web renderer

This describes the current source contract, not certification of every state or
device. The installed human renderer uses SvelteKit and the shared shadcn/Bits UI
bank. It interprets the product's admitted View program; it does not invent
product pages, commands or presentation rules.

Historical approvals and screenshots remain evidence for their exact revisions.
They do not qualify a later build automatically. See [STATUS](STATUS.md),
[bank coverage](BANK-COVERAGE.md) and [VOID verification](../../void/docs/VERIFICATION.md)
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
[prepare-response finding](BANK-SECURITY-FINDING.md) is corrected; its historical
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
See [ACTIVITIES](ACTIVITIES.md) for grammar, recovery and remaining limits.

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

Use the host launch/access flow in [LOCAL-CONTROLLER](LOCAL-CONTROLLER.md) and
[DISTRIBUTION-BUILDS](DISTRIBUTION-BUILDS.md). Never publish a private invitation.
Use a new build/store when a contract is incompatible; do not repin or overwrite
an older store to silence a mismatch. The generated
[source walkthrough](../skills/desert/references/web-renderer.md) is hash-checked
and must be regenerated for its own source checkpoint. Documentation does not
replace executable evidence.
