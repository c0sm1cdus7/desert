# Web renderer: ownership and boundaries

Generated from the bundled SDK documentation; do not edit this snapshot.

## Source: docs/WEB-RENDERER.md

Source SHA-256: 7aa3196110f69673ca20ac8c708a33a8d85276fbf4288fa44934ffa39669dab6

# The DESERT human web renderer

This is an implemented, finite renderer, not a proposal for arbitrary UI generation.
The surface defines interaction meaning; the distribution chooses how it reaches
a device. “Surface renderer” is the right name. The installed implementation is
the human web renderer, built with SvelteKit and an audited Tres Marías/shadcn port.

## Authoring boundary

Notebook authors objects, commands, journeys, policies, language, navigation,
commit modes and controller requirements. It does not author Svelte pages.
Its only added input presentation is:

```ts
inputs: { "note.body": "input.multiline" }
```

This selects an installed need, not a CSS variant. The field must be a text input
of an exposed command. Unknown fields and unknown primitives are rejected.
The remaining text input uses the bank's canonical single-line representation.
Requiredness, field order and input schemas derive from the command, which
references the object's facts. They are not copied into form components.

Product code cannot supply classes, styles, raw HTML, shadcn sizes, motion timings
or custom component callbacks through the closed contract grammar.
This is an authoring boundary, not a sandbox against someone editing SDK source.

## Installed composition anatomy

```text
Place — one full-width parent surface
├─ ToolbarLayout (top, expanding)
│  ├─ feature media, behind floating siblings
│  ├─ navigation/action rail
│  ├─ eyebrow + one title + subtitle
│  └─ optional search + primary action
├─ scroll viewport — fixed expanded-toolbar reservation
│  └─ titled sibling stacks
│     └─ inputs / facts / actions / lists (always-visible content)
├─ ToolbarLayout (bottom, static; optional)
└─ ScrollEdges — local overflow shadows, no blur

Floating sidebar — its own Place
├─ ToolbarLayout: product name + navigation toggle
├─ navigation groups
└─ ToolbarLayout: settings

Transient/search layers compose above retained places.
They change input ownership, not the lower layer's geometry or paint.

Content does not collapse. A titled Stack contains direct nodes, never a
disclosure, accordion or expandable summary. Facts and supporting explanations
remain visible without activation; a Stack does not add a shared material around
unrelated inputs. This rule does not prohibit opening navigation surfaces,
selection/calendar popovers, search or dock-above identity transitions. Older
disclosure definitions are rejected by the closed contract, not silently flattened.
```

The actual Svelte assembly is in `src/svelte/explorer/CatalogWorkspace.svelte`.
`src/svelte/pieces/Place.svelte` owns the frame;
`ToolbarLayout.svelte` selects static or expanding composition;
`ExpandingToolbar.svelte` retains one identity/action tree;
`toolbar-geometry.ts` measures capacity and paints the scroll transformation.
`src/interaction/place.ts` validates the closed TypeScript stack/content contract,
and `Stack.svelte` dispatches its typed rows through the shared renderer bank.
These renderer-private Svelte slots are not an author-facing arbitrary markup API.

Focus reveal belongs to `Place`, which measures the actual top/bottom rails and
reveals the focused control (preferably its complete well). It reacts to focus
and multiline editing, not ordinary scrolling; wheel/touch movement remains
user-owned. Multiline autosizing is bounded by the viewport minus compact chrome
and the well's measured label/accessory/footer space. Further text uses the native
editor's internal caret scrolling. This is capacity-based, not a device breakpoint.

Picker browsing state belongs to the field owner, separate from its selected
value. Calendar month and selection exploration survive popover/drawer replacement;
only activation commits a value. Reopening starts from the selected value. Both
selection presentations compose the same roving-focus list, and repeated surface
autofocus callbacks replace their keyboard listener instead of accumulating it.

## One versioned bank

`src/interaction/catalog.ts` is renderer-neutral and exported by the SDK.
`desert.human-interaction@0.4.1` contains twenty-three stable semantic entries and
fifty-seven specimen labels. The explicit 0.3→0.4 migration adds canonical inspection
metadata to the serialized catalog, without adding command capabilities or changing
semantic IDs. Discovery groups (Foundations, Controls, Compositions, Product examples)
are distinct from compatibility families. `catalog-ownership.ts` records shared
visual owners, applicable axes, fixture identities, behavior assertions and evidence
paths; the bank generates its ownership and coverage view from this metadata.
Evidence paths are not certification. Qualification gaps remain explicit, including
native Safari/VoiceOver. Money now includes populated, disabled and fixed-currency
specimens; options include disabled and bounded multiple selection. Invalid money
drafts are exercised through real typing rather than invalid canonical values.
These additions do not certify every locale or native platform. Existing specimen
instances remain mounted through filtering; no collapsible or lazy-unmount behavior
is introduced.
Eleven are product-backed:
text, multiline, fact, action, availability, collection, form, context, review,
transient and problem. Nine renderer-only control families and their specimens
are declared once in `src/interaction/control-bank.ts`; catalog states derive from
those typed objects. These are select, popover, files, options, money, date, tag,
image and avatar. This does not admit those controls as product command inputs.
Three experimental public-catalog compositions add card, home and detail without
pretending that public records are privately owned controller objects.
The human projection carries the exact catalog under
`desert.interaction/6`; the build's surface digest binds its content.

The web builder and mounted renderer reject catalog mismatch. Generic
`RendererBank<T>` checks inventory only; it must not be used as evidence of
component compatibility. The web's `WebRendererBank` maps every entry to its own
props and event contract. Mutable control nodes and events derive from the canonical
discriminated unions; unrelated components and wrong event callbacks fail Svelte checking.
`src/svelte/renderer-registry.ts` binds the bank to actual components used by the application.
This implementation registry is not the bank itself. Field and typed-control
selection dispatch through it, rather than guessing a component from field position.
`BankRenderer` validates the closed `desert.bank-node/1` descriptor and dispatches
through this registry. Nested forms, context and catalog compositions dispatch
their installed leaf owners through the same bank; private renderer adapters may
carry handlers, but serializable descriptors cannot carry callbacks or markup.

Human terminal and native renderers must consume the same vocabulary when they
are implemented. That means semantic parity, not copying HTML or drag gestures
into a terminal. Those renderers are not implemented or certified by this work.
The agent surface shares domain journeys and schemas, not decorative UI controls.

## Public catalog navigation shell

### Approved v117 implementation (v118)

The owner approved the sealed five-decision review; its acceptance event is in
`artifacts/ui-maturity-v118/acceptance.json`. The v117 bytes remain unchanged.

- **S1:** `pieces/pane-material.css` is the single material role: 88% neutral
  background, blur(24px), one 1px perimeter. Independent wells, buttons, grouped
  lists, sidebar and transient panes consume it; interiors remain transparent.
  Disabled content dims once without dimming its pane. Invalid/focus outlines are
  additional semantic ink. Contrast/reduced-transparency fallback changes the
  shared recipe once. Unconsumed vendor variants are not implicitly qualified.
- **S2:** `ChoiceList`/`ChoiceItem` own divided option anatomy. Inline and picker
  hosts share metrics, not commit semantics: radio arrows select, listbox arrows
  explore, Enter/Space commits. Requiredness does not prevent editing an incomplete
  draft. Existing min/max/disabled eligibility remains authoritative.
- **V1:** record identity is title plus its existing group title; the full original
  description stays in an always-visible About stack with a 65ch reading measure
  aligned to the shared content axis. No synopsis or hidden reading content.
- **M1 r2:** one mounted frame adapts between docked, right transient and bottom
  transient. Fit uses remaining host width after navigation: 45rem Place +36rem
  pane +24px. Right transient fits at36rem+24px, without a width discontinuity.
  Native inert/focus-boundary adaptation complements the existing Bits presence,
  dismissal and focus-return lifecycle. Locked, pending and uncertain work cannot
  be orphaned through navigation. Geometry changes do not replay entrance motion.
- **S3:** canonical ownership/fixture metadata generates the bank rather than a
  second UI inventory; gaps are displayed instead of simulated domain capability.

Search growth, mirrored scroll-edge shading, heading snap thresholds and the field
measure system are preserved by this increment. This is a web implementation, not
a claim of native Liquid Glass fidelity or complete platform qualification.

Landmarks and its bank share `CatalogWorkspace`, composed from the installed
shadcn Sidebar/Dialog and InputGroup. The Apple-reference profile allocates a
240px navigation column and reserves 45rem of reading space beside it. The provider
measures its actual containing box against that CSS-resolved budget: `docked` when
both fit, `overlay` otherwise. It does not classify devices or inspect user agents.
Changing the host or text size can change presentation without resizing the browser.
Other consumers explicitly reserve their own content width (default 32rem).
Docked Back and Search occupy the upper rail; overlay Back is top-leading while
Search remains bottom-trailing. Targets are 36px, or 44px for overlay/coarse pointers.
The sidebar toggle lives at the trailing end of its upper toolbar, aligned with
the product name; Settings occupies the aligned trailing lower toolbar. When
collapsed, the toggle appears in the place's upper toolbar. Both use ordinary
glass action faces, not ghost controls.
The header displays the authored product name, without invented window controls.
Explore and Developer groups separate destinations, with distinct colored icon faces.
Overlay navigation uses the same `Dialog.Content presentation="panel"` as task
transients, with a narrower width and leading edge. Both share 28px corners,
12px safe-area-aware screen insets, material, focus lifecycle and directional
motion. Persistent navigation retains its layout and shares the panel radius
and material tokens. Search excludes the underlying navigation toggle from input and
accessibility while retaining its painted geometry beneath the foreground.
The full destination name remains visible; abbreviations do not hide poor fit.
All root destinations expose one mounted identity in the same expandable toolbar.
Edge drags preview the actual sidebar or move the
current detail before release; short, canceled and vertical gestures do not navigate.
Sidebar header dismissal and transient grips share the same directional gesture
mechanism, and buttons remain the keyboard alternative.

The parent place viewport and shadows span the full workspace. A docked sibling
reserves only a leading content/control inset; it never clips the parent's media.
The original hero/detail image extends underneath the sidebar. No mirrored image
or separate scroll-synchronized decoration is mounted. Foreground search retains
the underlying viewport, toolbar and edge instances; its own material and controls
compose above them. Edge shadows are mirrored gradients without optical blur.
The owner's23:11 correction separates content identity from chrome. `Place`
owns the viewport; `PlaceHeading` is ordinary scrolling content with title,
subtitle, optional eyebrow/media and primary action. There is no expansion API,
reserved phantom header, duplicate compact title or CTA transfer. Top and bottom
use the same fixed `ToolbarLayout`, including task footers. Catalog navigation
and search remain icon controls. The bank uses the shared magnifier/search
overlay; its permanently expanded search, category shortcuts and count rails
remain removed. `PlaceHeader` is a static content adapter for embedded specimens,
not a toolbar or a second root heading.

The approved lower fade is restored:24% black shading with a32px feather,
mirrored above. Search composes over it without changing underlying edge state.
Transient frames omit the redundant lower dismissal when there is no primary
footer action. The upper dismissal, Escape, gesture and focus-return mechanisms
remain. With a primary action, the paired secondary dismissal remains available.

`PlaceIdentity` is a renderer-private TypeScript interface for title, subtitle,
eyebrow and image/video media. Video has explicit playback controls and does not
autoplay; this does not install a public catalog video authoring/host contract.
Root catalog adapters derive identity and actions from their existing closed
semantic data, not product-authored Svelte snippets. See STATUS for the exact
frozen candidate, independent findings and preview verification.

The owner superseded the earlier Indigo visual language with a shared
Settings-inspired foundation. System typography, neutral light/dark surfaces,
semantic blue accents and restrained content groups apply to product and catalog,
not just the Landmarks page. The catalog profile owns geometry, not a second
forced-dark palette. Explicit renderer theme overrides still take precedence;
otherwise system appearance is followed. Reduced transparency, reduced motion
and increased contrast remain authoritative.

Sibling specimens use transparent layout, with the same
`SpecimenGroup`/`SpecimenRow` in public bank, product catalog and typed bench.
They do not become a shared pane merely because they demonstrate one component.
Component identity uses the section role, and state metadata uses caption. The
public bank omits redundant category headings; its components are h2. Unavailable
specimens are compact catalog annotations, not fabricated product empty states.
Field descriptions and collection search/sort metadata use the shared caption
role; real specimen controls are not scaled down to fit the bank.
Content groups have no optical blur or outer shadow/frame. Glass belongs to
navigation, action faces and transient layers. Controls retain meaningful outlines, including
the whole-well input exception: its 62px base geometry, 12/16px caption and
16/24px value roles remain shared across text, selection and money.
Invalid-state color belongs to the field label and error explanation, never to
entered content. Floating and ordinary labels use the same readable error-text
token; the field retains its error border and independent keyboard focus ring.

**Titled input groups — owner rule, 2026-10-16.** Every input belongs to an
explicitly titled semantic group, even when that group contains only one input.
Related inputs may share a group; this does not require a separate group for each
field. The visible group title sits outside the controls. A stack arranges
siblings through spacing without adding a painted parent card. Each standalone
input retains its own well. Only genuine row groups, such as options or facts,
own a shared quiet content surface.
Individual controls keep their own accessible labels; a group title is not a
placeholder or a replacement for the field label. Titles describe the content
and must be explicitly authored, not inferred from device classes or control types.
For example, **Budget** names the group containing **Estimated budget** and its
currency control. No implicit exception for singleton inputs is permitted.
This is a general composition requirement, not just a Travel kit styling rule.
`PlaceContent` validates typed stacks and `StackLayout` composes their visible
titles outside the children. Budget is a separate authored group. Its compound
amount/currency control owns one well, not a second enclosing card.
Controls retain family-specific maximum measures and align to the leading edge.
The transparent reading group is bounded independently of its children's
family-specific measures. It never paints the empty space beside a narrower field.
This is installed in current source; older frozen
builds and screenshots remain historical evidence, not proof of this revision.

Embedded catalog compositions scope their heading levels through a private
renderer context: native pages keep h1/h2; public-bank specimens sit at h3/h4
below the component's h2 (the separately grouped developer catalog retains
h3 components and h4/h5 specimens). Appearance is independent of heading rank. No author-facing
heading/style grammar or additional controller capability is introduced.

At enlarged text sizes, Calendar preserves its meaningful seven-column grid in
a local horizontal viewport. Month caption/navigation remain outside that
viewport and can wrap without smaller type. Focus revelation adjusts only that
grid's horizontal scroll; date and arrow-key behavior stay with Bits UI.
Standard transient toolbars bound summary titles/subtitles to two lines and
yield height to at least two enlarged body lines. Complete titles and prose
remain available in the reading body; ordinary document contexts are not clamped.

Catalog jumps distinguish the scroll anchor from the focus destination. Return
links scroll to catalog navigation and focus its shadcn search input, never the
whole navigation region. Group jumps focus their concise heading and preserve
normal Tab order. The scroll container reserves its floating toolbar's actual
height when revealing anchors, so keyboard focus is not covered by chrome.
The application viewport clips without becoming a second scroll container;
native focus revelation must not shift the surrounding navigation.
Visible focus indicators remain enabled; query and specimen drafts are preserved.

`ScrollEdges` is shared by the floating catalog shell and `SurfaceFrame`. It
observes each pane's own native viewport, toolbar geometry and content size.
Top/bottom bands exist only beside installed toolbars and become active only
while content overflows in that direction. The floating shell protects the
toolbar plus a 32px feather; framed surfaces soften the content's approach to
their nonoverlapping header/footer. At the beginning/end the corresponding band
clears, preserving first/last lines. Keyboard revelation reserves the feather.
Progressive shading gives the controls depth without blurring the page. Actual
Glass panes alone filter what is beneath their own silhouettes; toolbar labels
remain sharp, clickable and independently focusable. Decorations are pointer-inert and aria-hidden.
Their clipped overlay plane cannot enlarge layout during the interval between
a container resize and its next geometry measurement.
Both edges use the same surface-colored fade. The media and scrolling content
paint below that shared plane; toolbar titles and controls paint above it. There
is no additional opaque toolbar panel and no page-edge backdrop blur.
Ordinary edge shading does not require backdrop-filter support. Scroll drives intensity directly, without
delayed animation. Resize, font and content changes remeasure the local pane;
document-flow reading does not gain artificial floating chrome.

All renderer searches compose `pieces/SearchField.svelte`: a leading magnifier,
semantic search input and embedded Clear search accessory while nonempty. Clearing
emits one empty-value update and restores input focus without scrolling, submitting
or closing search. Disabled/read-only fields cannot clear. The shared component
suppresses the browser's duplicate clear affordance and reuses InputGroup/Button
feedback; each consumer retains its own query, filtering scope and lifecycle.

The catalog toolbar search starts as a magnifier. Activating it expands a Glass
input across the available toolbar width, leaving only the close X beside it;
other toolbar actions become unavailable until search closes. Compact layouts
place this toolbar at the bottom with safe-area clearance. Short, reversible
transitions respect reduced motion.

Search expansion animates a rounded paint clip, not width, gap, typography or
the underlying navigation layout. The original input remains mounted and usable
immediately. Closing retains its outgoing text and foreground plane until hidden;
product cancellation still clears the functional query. Modal messages and drawers
share the search overlay timing tokens. Centered dialogs move vertically without
scaling or transform-based centering. Surface/scrim transitions start from their
current presented values on interruption; Bits transition-presence attributes
own entry and unmounting. Reduced motion removes these transitions entirely.
The empty invitation names the current scope
over an inert retained page. One translucent, blurred material spans the entire
workspace underneath navigation in every search state: blank, matching and empty
results. Results never replace the retained page with a neutral backdrop.
Landmarks searches published record fields, the bank searches canonical component
metadata, and Travel kit searches declared section/control labels, never draft
values. Results navigate only when activated. Clear keeps search active;
Close/Escape restore the retained page and reading position without remounting
draft controls. Close/Escape return focus to the Search opener when available;
otherwise the retained content control or viewport is the fallback.
An outside pointer or focus leaving the search composite closes it. Internal
Clear, close and result activation remain usable, and intentional outside focus
is not stolen by dismissal. Composition Escape is left to the input method. Returning from
a record opened through search restores its query, result position and focus.
Reduced transparency/increased contrast remove the search blur. There is no
stored search history, rotating-language animation or remote search provider.

The reflected background derives from the currently visible home/detail image
and follows that page's scroll. Exercises and bank pages have no unrelated
photographic decoration. Search retains its originating page and current image
under the workspace material. The image extension covers the navigation column
including its outer inset, so the hero no longer stops at the pane's rounded top.
Sharp content remains above that background layer.
The functional navigation pane filters its background, not its text or controls.
Reduced transparency/increased contrast use an opaque navigation surface without
the reflected image. Modal scrims dim, while their actual panes may use Glass.
This is a web
approximation of background extension, not native Liquid Glass refraction or
pixel parity. Width and responsive changes intentionally differ from the pinned
900px native reference, which remains unchanged as comparison evidence.

## Complete execution path

1. `products/notebook/note.ts`: facts, constraints and ownership.
2. `commands.ts` and `journeys.ts`: requested input, effects, guards and dependencies.
3. `surfaces.ts`: human exposure, context actions, review choice and input needs.
4. `src/project-surface.ts`: frozen, limited interaction projection.
5. `src/web/build.ts`: supported-composition gate and standalone schema validators.
6. `src/build/svelte/template/src/routes/+page.svelte`: generic entry, no Notebook rules.
7. `src/svelte/HumanProduct.svelte`, `ProductWorkspace.svelte`, `SurfaceHost.svelte`, `src/web/client/frame.ts`:
   collection, context lifecycle and a derived typed frame, not arbitrary children.
8. `SurfaceFrame.svelte` → `FrameBody.svelte` → `TextInput.svelte`:
   declared need rendered using Field and InputGroup from the audited port.
9. `src/web/client/mutations.ts`: explicit human submission → begin → prepare →
   accept, or contract-required review. It never treats availability as permission.
10. `transport.ts` → `src/web/gateway.ts` → `dispatch.ts`: authenticated local
    HTTP request, exact contract header, closed request shape and origin checks.
11. `src/local/session.ts`, `admission.ts`, `prepare.ts`, `accept.ts`:
    identity, installed journey, owned subject, effect identity and atomic acceptance.

The generated complete source walkthrough (SDK file: `skills/desert/references/web-renderer.md`)
contains the actual modules, including Svelte and the controller path, with source
hashes. Regeneration and drift detection use the existing authoring tools.

## Human behavior

The bank's `src/interaction/surface-frame.ts` defines the versioned, serializable
`desert.surface-frame/6` object. Its top, content and bottom slots are mandatory
for task/dialog frames, not for every temporary control presentation.
Header identity is a closed `Face` value in the top slot, not body decoration.
Messages carry text in content; status severity belongs to their header face.
`ToolbarLayout.svelte` owns the header anatomy for both `Toolbar.svelte` (all
persistent and transient frames), the catalog's search/navigation toolbar, and
the normal product and product-catalog shell headers.
An optional face occupies its own full-width row above navigation, place/title
and actions, centered against the complete header rather than the leftover title
lane. When absent, neither that row nor its spacing is rendered. Current product
presenters supply a toolbar face only for messages/dialogs. Renderer-internal
snippets compose shadcn controls; they are not added to product authoring or the
serialized bank. The typed top slot continues to require its meaningful title.
At narrow widths, the action rail yields a full row to the title. Bounded transient
hosts constrain oversized header identity to a scrollable region, retaining room
for content and dismissal; persistent reading keeps its natural document flow.
Neither path truncates the title to a fixed line count.
Ordinary toolbar text enlarges independently of the decorative face and width-constrained
actions: its face grows from 32px to at most 40px, and compact action rails keep
44px touch targets. Compact messages instead use a 3rem identity face with the
same rem-scaled reading stack. A short message title must remain fully visible initially,
not merely be recoverable by discovering a second scroll region.
Content accepts only the installed form, facts, context, review, ordered information, utility-list or status-message
objects. HTML, CSS, classes, callbacks and arbitrary child snippets are not values
in this contract. Static types derive from the same closed runtime grammar.
Product presentation derives these values from the compiled contract and current
state; the author does not repeat fields, input constraints or action authority.

The task/dialog transient renderer owns visible top chrome, padded scrolling content and a non-scrolling
bottom toolbar. Persistent reading uses document flow and does not fabricate an empty footer.
Drawer does not accept a Svelte children snippet. Catalog forms
and drawers use the same frame rather than recreating its layout. Context footer
contains surface dismissal only, not journey confirmation; context/form and
context/primary-command combinations are rejected statically and at runtime. Action destinations
remain in the context's Actions collection. The web realization uses existing
shadcn port pieces and Tailwind layout utilities; custom styling remains below
this boundary only for behavior/tokens not supplied by those pieces.

TypeScript does not prove pixel geometry. Runtime grammar rejects malformed
objects; browser tests separately check layout, overflow, focus and pressed states.
This is a finite implemented frame contract, not proof of every future primitive
or renderer. It does not introduce a new product contract or repin existing data.

`FieldWellContent` and the shared field-well role own label/value geometry for
text, selection and money. Captions
reserve their actual wrapped height in normal flow, with a separate editing row;
textarea scrolling never paints values underneath the caption. Empty single-line
labels retain their floating presentation, without a fixed reserve that assumes
one line. Text and money compose shadcn Field, FieldLabel and InputGroup. A standalone
selection instead makes the native shadcn Select Trigger the entire well, using the
shared Button well variant: caption, value, chevron and padding belong to that one
hit target. One outer plane retains its material through hover/press; one inner content layer compresses
the caption and value together, without moving the border or changing its hitbox.
No click relay, nested button or transparent overlay expands the target. Its
accessible name includes the visible field label and current option; requiredness
is semantic, not a spoken asterisk. Money keeps currency and amount independently
operable. Native pointer/keyboard selection and reduced-motion behavior remain
owned by their existing primitives.

Every multiline editor has a passive bottom-trailing `CharacterCounter`, composed
from InputGroup Addon/Text in FieldWell's optional footer. The footer is outside
the native editing scrollport, never laid over the final text line. It uses the
shared caption role and joins existing errors in `aria-describedby`, without a
tab stop or per-keystroke live announcement. Its click focuses the textarea.
Unlimited fields show characters written; a declared `maxLength` shows remaining
characters, including zero. Excess text is retained and described as over limit.
Counts follow JSON Schema's Unicode code-point semantics. Native `maxlength`
(UTF-16 units) is intentionally not an editing/truncation policy.
Form projection carries the existing command schema maximum through the shared
bank; no duplicate product validator is introduced. Portable catalog exercises
with a multiline maximum require `input.length-hint`, an advisory renderer feature,
not enforcement or submission authority.

- Create submits without an extra review; Archive is a context action and retains
  its contract-required review. A context has no command-step footer.
- Context Actions are destination rows in a stack: leading title, trailing chevron,
  whole-row interaction and dependency/authority-driven disabled state. They are
  not the command buttons used in journey footers. The shared ContextPanel uses
  the audited shadcn port's existing row variant, including keyboard activation.
  In Notebook, opening Archive enters review and leaves the note active until
  the separate confirmation is accepted. The catalog uses the same composition.
- Ordinary object reading is nonmodal: a collection rail and reading pane on wide
  screens, a full-width context with Back on compact screens. Reading does not
  borrow a command footer or trap collection navigation behind an overlay.
- The collection offers explicitly local retrieval over its already-exposed loaded
  values and a labelled ascending order derived from its first collection field.
  Filtering neither calls a journey nor searches detail-only or private facts. It
  keeps the selected reading context and does not mutate the controller's record array.
  An unread collection, a known-empty collection and no search matches remain distinct.
  Selected rows retain a visible state after hover and keyboard focus leave.
- Collection rows center their complete content stack. Title-only rows omit the
  metadata container entirely, so no empty second line or gap displaces the title
  and chevron. With metadata, the chevron remains centered on the heading while
  the complete stack stays centered in the hit surface. Grouped radio/checkbox
  rows center their indicators on FieldContent without Field's top-aligned margin.
  These are shared layout rules, not per-icon offsets; fixed hit geometry and
  ordinary pointer/keyboard activation remain unchanged.
- A transient has one bound identity. Creation outcome closes the creation drawer
  and opens the saved object in the persistent reading pane. Review and uncertain
  recovery remain task transients; neither silently replaces another identity.
- Back, Escape, backdrop and handle dismissal use the same typed navigation intent.
  Cancelling review retains the object and restores its originating action. A successful
  command focuses the resulting reading region instead of abandoning focus on the page.
- Creation remembers whether it started from the collection or a reading context.
  Cancelling restores that context and reading position while keeping its draft. Back
  from primary review still returns to its composer before leaving the transient.
  If local filtering removed a record opener, context Back focuses the collection search.
- Review compares exposed values only when the known object identity and version match
  the prepared operation. Changed fields precede unchanged prose; a concise derived
  summary leads the review. Unknown or stale baselines never invent a previous value.
  This presentation does not change effects, grant visibility or weaken confirmation.
- The declared `input.multiline` field need also derives multiline reading. Prose
  uses start alignment, paragraph-preserving whitespace and a reading type role,
  alongside always-visible metadata. A record title is presented once.
  This is a derivation from existing exposure, not inference from field names.
- Unknown facts display as Unknown; visually blank values display as Empty and
  visually blank record titles as Untitled. These are presentation fallbacks only:
  they do not trim, reject or rewrite valid stored facts.
  Fact rows and typed information share one passive value renderer: actual content
  retains normal emphasis; Empty uses a minus and Unknown a circled question mark,
  both with semantic secondary text. Accessible reading identifies these as value
  states; literal stored "Empty"/"Unknown" remains ordinary content. No control,
  loading, error or live-announcement semantics are inferred. Missing fact keys
  use own-property lookup; Information's null sentinel shares the same classifier.
- Dialogs compose the installed shadcn Dialog; its Bits UI foundation supplies
  focus containment, labelled modal semantics, Escape and
  focus restoration. An uncertain operation prevents dismissing its recovery
  surface; an error dialog closes independently above it.
- Input labels expose requiredness with the owner's red asterisk rule and native/
  ARIA required semantics. Footer actions share its horizontal space.
- Editable text, multiline, masked amount and search fields share one trailing
  Clear accessory while their visible draft is nonempty, including whitespace
  and invalid masked writing. It retains typing focus, never submits, and honors
  disabled/read-only controls. Selection/calendar triggers do not receive it;
  clearing Money leaves its currency unchanged. The textarea counter remains in
  its separate footer. Compact clear targets are at least 44px.
  Clearing uses the editor's existing input pipeline. Masked history remains
  managed by the mask; plain text/search use the browser's native delete command
  to preserve undo rather than assigning over its history. This narrowly scoped
  `execCommand` bridge is deprecated but has no equivalent standard undo-preserving
  replacement API (see [MDN](https://developer.mozilla.org/en-US/docs/Web/API/Document/execCommand)).
  A direct-edit fallback keeps clearing available without promising native undo
  where that command is unavailable; cross-browser parity is not certified.
- Touched fields receive accessible, plain-language feedback from the compiled
  validator's immutable issues. Core and standalone web validation share the same
  issue snapshot, not independently copied constraints. Pristine inputs stay quiet;
  correction clears errors, and controller loss retains both writing and feedback.
- Shared FieldError uses the semantic destructive-text token. Contrast is measured on
  actual product drawer fills, in system and explicit light/dark appearance, not only
  on the catalog's specimen cards. The icon/border destructive token is unchanged.
- The active surface receives real controller availability. It remains editable
  during a database or transport outage. Recovery refreshes without replaying a
  command or discarding the session draft.
- Desktop drawers enter laterally; narrow drawers enter vertically. A short
  handle drag follows the pointer and springs back; crossing the dismissal threshold
  closes before pointer release. Right-side drawers have no handle.
  Reduced motion removes entrance/exit animation and makes spring return immediate.
- Touch targets are at least 44px for bank actions and the drawer handle. Keyboard
  dismissal is always available when dismissal is permitted.

This does not claim an installable offline PWA, persistence of drafts after browser
exit, VoiceOver certification, cross-browser parity or native haptics. The local
controller can work without Internet; a loaded web surface tolerates loss of its
controller. Initial page delivery still requires its local web host.

## Kitchen sink and its limits

`?catalog=1` displays every installed entry/state. It reuses the production bank,
including real context, review, drawer and dialog components. Specimen callbacks
are isolated visual exercises, labelled as such; they do not imply domain writes
or healthy connectivity. Notebook, not those callbacks, exercises the real controller.
Search, family counts and jump links derive from that same catalog. Filtering hides
mounted specimens rather than discarding their local edits. Product-backed families
and bench-only controls are explicitly distinguished.

This is all of the current finite product bank, not all possible combinations or all of
Void's legacy pieces. Dates, money, product-bound selectors, uploads, charts, tables and nested
object editors remain unsupported until they have typed semantics, compilation
and behavioral evidence. An imported visual widget is not a new product capability.

The typed control bench is part of that same catalog, not a parallel unversioned
inventory. Options derive radio versus checkbox behavior from cardinality. Money
uses exact decimal minor-unit strings. Its locale-aware decimal mask groups the
visible writing without converting the amount to a JavaScript Number. Changing
currency preserves the numerical amount only when exactly representable at the
destination scale; otherwise it keeps the original currency and reports an error.
It never rounds or performs FX conversion. Owner amount/currency/identity/scale changes reconcile
the visible draft and obsolete validation; acknowledgements preserve the human's
lexical writing and newer incomplete edits without emitting another change.
The shared closed `InputMask` currently installs only `decimal`, with an explicit
locale and scale (0–6). Single-line bank inputs may declare it; multiline inputs
cannot. Money derives scale from its selected currency and defaults locale to
`en-US`; the Money bank specimen explicitly uses `es-AR`. Plain text input events
carry canonical dot-decimal strings; Money events remain exact minor-unit strings.
Empty Money emits null. Impossible characters, malformed paste and excess precision
are rejected atomically, preserving the prior text and selection. Noncancelable edits
and committed IME writing use the same rollback without publishing an invalid value.
Incomplete numeric writing remains editable without emitting an accepted value;
amounts exceeding the wire's 80-character minor-unit limit are rejected. Unsupported locale affix/bidi
patterns fail explicitly. This is not a generic regex mask or domain validation.

Dropdown options can carry an optional typed Face, rendered through the same
passive Avatar primitive in both the selected trigger and option list. Explicit
`flag` region and short `symbol` variants join document/status faces. Currency
codes remain visible and own the accessible name. Money derives currency symbols
from Intl and uses the same plain muted, unboxed symbol in its trigger, anchored
options and sheet options. Currency metadata faces do not override that monetary
presentation. Generic dropdown options retain their authored faces.
A country is never inferred
from a currency. Flag color/glyphs follow the host emoji font. Arbitrary remote
image faces are not installed by this increment.
Portable catalog requirements explicitly declare `input.mask.decimal`,
`selection.faces`, and the installed `face.flag` / `face.symbol` representations
when used. An older adapter cannot silently claim support through its node-kind
list alone. These requirements do not install or certify a native adapter.
Dates are calendar dates with explicit bounds, not timestamps. Their whole-well
input opens a calendar, anchored when there is space and in the shared bottom sheet
otherwise; the grid is not permanently embedded in the form. Selecting a permitted
date commits directly and restores trigger focus. Media sources currently allow only same-origin paths and require
accessible descriptions. Tags use closed semantic tones, never arbitrary colors.
Person avatars use the vendored shadcn/Bits image-loading lifecycle and a visible
secondary-surface circular fallback. Their adjacent full name owns the accessible
identity; the image/initials are decorative, not another focus stop. Long names wrap
without shrinking the face. The renderer preserves all 1–4 permitted fallback
characters, using a compact, rem-scaled role for decorative 3–4-letter monograms;
the full name retains body type. Object/status faces keep their separate inherited
tones. Media demonstrations must not invent a traveler or imply a saved trip:
Landmarks' inspiration contains only a sample photo and its reference facts, while
the canonical bank retains the avatar examples.
These are real local mechanisms, not product input grammar, storage, currency
conversion or upload capabilities. See coverage (SDK file: `docs/BANK-COVERAGE.md`).

## Canonical actions and chrome

Every toolbar action requires a closed icon identifier and accessible label.
Its operation is a closed typed intent, not an overloaded string ID. A journey
named `accept`, `recover`, `back` or `surface.close` remains a journey; it cannot
be mistaken for renderer navigation or confirmation. Form submission matches the
primary journey intent, and transient dismissal checks intent meaning rather than
labels or icons. The same validated dispatcher handles the mounted product.
The top toolbar has leading/trailing slots; the bottom has secondary/primary slots,
not an arbitrary list carrying visual emphasis. The renderer derives primary styling.
Task frames retain a bottom Close or Back,
even alongside a primary CTA. That same action is mounted in the top leading slot
at icon width. The host rejects conflicting navigation instead of silently replacing
it. Locked state disables dismissal without removing it. Utility actions such as
Check result occupy top trailing slots; they do not displace the footer navigation.

The owner's 2026-10-16 decision supersedes anchored-only selection. Select and date
pickers reserve 24rem for a readable panel and 4rem of visible surrounding context;
the shared launch-surface measurement includes available width and root text size.
If that budget does not fit, both compose the same content-sized bottom sheet,
bounded by that panel width rather than stretched across the window. Pickers use
the same Toolbar and Action as task transient surfaces: close precedes the title,
with no header divider. The inset scrolling body preserves focus outlines. A
toolbar without trailing utilities does not reserve a utility rail or stack its
title below navigation. Single-choice options
share the radio mark with radio groups; multiple-option groups retain checkboxes.
Calendar picker cells derive their size from the panel's content box, not viewport
width. Enlarged text preserves a local horizontal day-grid viewport.
The anchored Select retains Bits list-selection semantics; sheet choices compose
the installed roving choice primitive. Activating a permitted option
emits `select.change` immediately; no staged candidate or Confirm action is
required. Merely opening, highlighting or dismissing the list is not a change.
The current value, disabled options, requiredness and optional null remain owned
by the unchanged `SelectNode` grammar and canonical transition.

Currency selection follows the same direct-choice interaction. Its `money.change`
transition carries the chosen code and exact amount; the control refuses scale
changes that would lose precision, without pretending to convert it. Contextual popovers preserve ordered typed
information and `popover.open` state. Outside interaction or Escape dismisses
when permitted; focus returns on dismissal without trapping background use.
The inherited `locked` flag prevents dismissal only, never makes a popup modal
or grants authority. It is not permission to conceal a blocked task in a popover.

Frame revision 6 removes selection content and the old selection frame. The
`selection.confirm` intent is retained only as deprecated bank-wire compatibility;
it has no current frame/selection host and the product dispatcher rejects it.
Revision 5 frames are rejected rather than silently reinterpreted. Rebuild local
surface artifacts; do not migrate or repin the controller or its data.
Problem dialogs also use the same Toolbar/SurfaceFrame owners and closed message
frame, not an object context pretending to be an error. The owner's 2026-10-16
macOS-dialog request supersedes duplicate header/footer dismissal for these alerts:
one secondary Close remains below centered identity and copy. The renderer-private
message presentation is selected by Problem, never product JSON, and rejects any
frame kind other than message. Persistent message frames and diagnostic task drawers
keep their existing presentation. Native shadcn Dialog.Title/Description are the
visible heading and copy; their semantic typography variants prevent registry
default classes competing with the shared type scale. Message width is 20rem,
bounded by 12px viewport insets, with 17/22px title and 13/19px body at default text
scale. These are web design choices inspired by macOS, not measured native parity.
Locked dismissal, Escape, outside interaction, focus containment and restoration
remain owned by the existing modal host; Close is never promoted to primary authority.

Toolbars are borderless. Their actions use the same shared circular icon-face or
capsule label-face treatment as actions elsewhere; placement cannot introduce
a second button variant. Pending, disabled, icon fallback and accessible naming
remain the canonical Action owner's policy. Container rows, field wells and
media/card press targets keep their own semantic container anatomy; they are
not converted into standalone pill buttons. The only approved footer-layout
exception is a genuine step wizard; no such wizard contract is installed, so a
generic journey, product name or label cannot be treated as that exception.

The foundation owns widgets; DESERT owns their finite semantic composition.
Text, selection and money share FieldWellContent and field-well geometry, with
InputGroup for editors and a full-well Select Trigger for selection. Option cardinality
selects RadioGroup or Checkbox with the same FieldLabel row anatomy. Faces compose
Avatar with an object shape; image failure retains the original aspect container.
Action renders ordinary Lucide icons through Button; its visual-only `spin` prop
rotates marked SVG icons without changing color, label, geometry or authority.
Pending selects the loader glyph in the same icon path, preserving the existing
neutral disabled face and accessible name. Spinner inherits its surrounding
foreground; availability and unread collections explicitly retain their status
accent. Rotation shares the existing animation utility and reduced-motion policy.
Known-empty and unread collections share
one Empty composition in Notebook and the catalog. These extensions live in the
SDK, not in products.

Dialogs use shared vendor content components with private frame presentations;
contextual popovers and selectors use their nonmodal vendor foundations without
task chrome. Responsive task-drawer presentation and forced-snap gesture physics
remain custom DESERT extensions. Migrating the gesture mechanism
to the official Drawer/Vaul foundation has not been verified; this increment does
not claim that importing shadcn eliminated every custom widget behavior.

Shared Button owns press feedback: stationary bounds/borders and an inner content
layer with common scale/easing and semantic foreground. Destination
rows use that same mechanism. Keyboard focus is separate from pressed
feedback; reduced motion retains color feedback without compression.
The shared press owner clears feedback on pointer exit, touch cancellation and
keyboard blur, restores it on pointer re-entry, and never synthesizes activation.
Hover and held foreground states are exclusive. Disabled controls do not acquire either.
Long shared titles are visually bounded without shortening their accessible names;
the complete content remains scrollable and the footer remains visible at enlarged
text sizes. Narrow or short viewports cap decorative spacing, not font sizes.
Critical message titles wrap instead of truncating the cause of an error.
Semantic tag variants retain a neutral pane and explicit text plus semantic foreground.
The approved v117 S1 law supersedes the earlier tinted tag/action/navigation fills.
The isolated locked-popover specimen announces and completes its demonstration
lock; this timer belongs only to the catalog and is not an operation timeout or
permission to release an actual pending command.

Recovery records which action is pending. Checking a receipt cannot animate Retry;
a missing receipt is reported inside the active recovery surface. Unknown acceptance
results are described as unknown, not as a proven failed write.

The one Action renderer measures available label space and switches to the declared
icon only when needed. Pending replaces the visible face with a centered spinner,
preserving button geometry and accessible naming. Products cannot supply CSS or
override these decisions. Internal Bits UI adapters forward only overlay semantics,
events and ref attachments; they do not open the product contract to HTML props.

Human review fields derive from exposed object details and consequential effect fields.
This closes review omissions, but is not a transport privacy guarantee: see the
open prepare-response finding (SDK file: `docs/BANK-SECURITY-FINDING.md`). Installation and confirmation
digests are not changed by presentation-only review filtering.

Whole-experience review is separate from component correctness. The nonmodal reading
and feedback increment addresses reproduced composition gaps, but does not establish
consumer readiness. Large-collection paging/previews, authored action consequences,
healthy-state messaging and actual assistive-technology/device review still need work.
Those gaps are not a reason to replace the visual foundation.
Behavioral tests and negative type tests do not constitute visual acceptance.

## Reproduce without touching an older Notebook store

```sh
npm ci
npm run web:check
npm run web:build -- build/my-notebook-preview
npm run notebook:web -- build/my-notebook-preview .local/my-notebook-preview 4273
```

Use Node 24 and the local PostgreSQL prerequisite described in LOCAL-CONTROLLER.md.
Open the private launch URL written to that store's web-launch.json. Subsequent
navigation uses the browser's local cookie. Never publish the invitation.
Use a new build directory. Do not overwrite, migrate or repin an older store to
silence a contract mismatch. The input presentation changes Notebook's digest.

# Complete contract-to-controller source walkthrough

Generated from this bundle's source. Do not edit this snapshot.
Regenerate with npm run authoring:generate; npm run authoring:check detects drift.
Paths below are relative to the SDK root. Read imports/types together; these are
verbatim modules, not standalone snippets or a published package API.

- products/notebook/note.ts
- products/notebook/commands.ts
- products/notebook/journeys.ts
- products/notebook/surfaces.ts
- products/notebook/product.ts
- products/notebook/dependencies.ts
- products/notebook/distributions.ts
- src/interaction/catalog.ts
- src/interaction/grammar.ts
- src/interaction/form.ts
- src/interaction/bank-schema.ts
- src/interaction/bank-node.ts
- src/interaction/bank-events.ts
- src/svelte/BankRenderer.svelte
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
- src/svelte/views/ViewProduct.svelte
- src/svelte/views/Workspace.svelte
- src/svelte/views/workspace-data.ts
- src/svelte/explorer/CatalogWorkspace.svelte
- src/svelte/explorer/CatalogNavigation.svelte
- src/svelte/explorer/CatalogNavigationActions.svelte
- src/svelte/explorer/CatalogToolbar.svelte
- src/svelte/explorer/workspace-navigation.ts
- src/svelte/explorer/workspace-search.ts
- src/svelte/views/ViewContent.svelte
- src/svelte/views/ViewItem.svelte
- src/svelte/views/Panel.svelte
- src/svelte/views/InspectionContent.svelte
- src/svelte/catalog/inspection-fixture.ts
- src/svelte/catalog/inspection-media.ts
- src/svelte/HumanProduct.svelte
- src/svelte/ProductWorkspace.svelte
- src/svelte/Collection.svelte
- src/svelte/collection-retrieval.ts
- src/svelte/SurfaceHost.svelte
- src/svelte/SurfaceFrame.svelte
- src/interaction/surface-frame.ts
- src/interaction/frame-presenters.ts
- src/interaction/fact-presentation.ts
- src/interaction/review-changes.ts
- src/web/client/frame.ts
- src/svelte/FrameBody.svelte
- src/interaction/toolbar.ts
- src/interaction/intent.ts
- src/interaction/face.ts
- src/interaction/selection-option.ts
- src/interaction/transient-frame.ts
- src/interaction/control-nodes.ts
- src/interaction/control-bank.ts
- src/interaction/extended-nodes.ts
- src/interaction/extended-controls.ts
- src/interaction/money.ts
- src/interaction/input-mask.ts
- src/interaction/decimal-mask-locale.ts
- src/interaction/information-content.ts
- src/svelte/pieces/Toolbar.svelte
- src/svelte/pieces/Face.svelte
- src/svelte/pieces/FieldWell.svelte
- src/svelte/pieces/SearchField.svelte
- src/svelte/pieces/MeasuredField.svelte
- src/svelte/pieces/control-measure.css
- src/svelte/pieces/GroupedPanel.svelte
- src/svelte/pieces/ChoiceRow.svelte
- src/svelte/pieces/SelectionField.svelte
- src/svelte/pieces/CollectionState.svelte
- src/svelte/pieces/Action.svelte
- src/svelte/pieces/action-icons.ts
- src/svelte/vendor/components/ui/button/button.svelte
- src/svelte/vendor/components/ui/button/press-feedback.ts
- src/svelte/controls/SelectControl.svelte
- src/svelte/controls/PopoverControl.svelte
- src/svelte/controls/FileControl.svelte
- src/svelte/controls/ControlRenderer.svelte
- src/svelte/controls/OptionsControl.svelte
- src/svelte/controls/MoneyControl.svelte
- src/svelte/controls/DateControl.svelte
- src/svelte/controls/MediaControl.svelte
- src/svelte/pieces/AnchoredSurface.svelte
- src/svelte/Fields.svelte
- src/svelte/pieces/TextInput.svelte
- src/svelte/pieces/MaskedInput.svelte
- src/svelte/pieces/CharacterCounter.svelte
- src/svelte/pieces/ClearInput.svelte
- src/svelte/pieces/input-edit-history.ts
- src/svelte/ContextPanel.svelte
- src/svelte/Facts.svelte
- src/svelte/Review.svelte
- src/svelte/pieces/DestinationRow.svelte
- src/svelte/pieces/Drawer.svelte
- src/svelte/pieces/drawer-motion.svelte.ts
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

## products/notebook/note.ts

Source SHA-256: bb794f0169a5c5144e9bfb2f0ea3b6ea19e9f66e8cdb8890290fa6831800da75

```ts
import { enumeration, objectType, ownershipPolicy, principal, text } from "../../src/index.ts";

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

## products/notebook/commands.ts

Source SHA-256: b814565b55954ac07a12558e1e2f091bafa987e46732b063eb931f1c4e6e72f6

```ts
import { actorId, createCommand, fromInput, literal, updateCommand } from "../../src/index.ts";
import { Note } from "./note.ts";

export const CreateNoteRecord = createCommand("create-note-record", Note, {
  input: ["title", "body"],
  values: {
    title: fromInput("title"),
    body: fromInput("body"),
    owner: actorId(),
    state: literal("active"),
  },
});

export const ArchiveNoteRecord = updateCommand("archive-note-record", Note, {
  input: [],
  when: { state: "active" },
  set: { state: literal("archived") },
});
```

## products/notebook/journeys.ts

Source SHA-256: 3f09b5c57cd6712122fc89b8efa17705e9b6b1c27dfdfe98a6ce706d5d597a6d

```ts
import { mutationJourney, readJourney } from "../../src/index.ts";
import { ArchiveNoteRecord, CreateNoteRecord } from "./commands.ts";
import { Note } from "./note.ts";
import { NotesController } from "./dependencies.ts";

export const CreateNote = mutationJourney("create-note", CreateNoteRecord, {
  controller: NotesController, dependencies: [],
});
export const ReadNote = readJourney("read-note", Note, {
  fields: ["title", "body", "state"],
  collection: ["title", "state"],
  requires: { controller: NotesController, dependencies: [] },
});
export const ArchiveNote = mutationJourney("archive-note", ArchiveNoteRecord, {
  controller: NotesController, dependencies: [],
});
```

## products/notebook/surfaces.ts

Source SHA-256: 7a261d134a8735e27830a4bd51f76ab0129d44a3be5590e3523f36632d6b36a1

```ts
import { agentSurface, humanSurface } from "../../src/index.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";

export const HumanNotebook = humanSurface({
  id: "human",
  journeys: [CreateNote, ReadNote, ArchiveNote],
  entry: ReadNote,
  primaryAction: CreateNote,
  subjectActions: [ArchiveNote],
  inputs: { "note.body": "input.multiline" },
  commit: {
    "create-note": "submit",
    "archive-note": "review",
  },
  language: {
    locale: "en",
    fields: { "note.title": "Title", "note.body": "Content", "note.state": "Status" },
    journeys: { "create-note": "Create note", "read-note": "Read notes", "archive-note": "Archive note" },
  },
  connection: {
    availability: "journey-dependencies",
    draftRetention: "session-memory",
    reconnect: "refresh-without-replay",
  },
});

export const AgentNotebook = agentSurface("agent", [CreateNote, ReadNote, ArchiveNote]);
```

## products/notebook/product.ts

Source SHA-256: aca3d8f9b48b6526e891474d1ad3643d1b311ed37b63b8d02696ecff83314488

```ts
import { product } from "../../src/index.ts";
import { Note, OnlyOwnerCanAccess } from "./note.ts";
import { ArchiveNote, CreateNote, ReadNote } from "./journeys.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";
import { NotesController } from "./dependencies.ts";

export const Notebook = product({
  id: "notebook",
  objects: [Note],
  dependencies: [NotesController],
  policies: [OnlyOwnerCanAccess],
  journeys: [CreateNote, ReadNote, ArchiveNote],
  surfaces: [HumanNotebook, AgentNotebook],
});
```

## products/notebook/dependencies.ts

Source SHA-256: 7a1df50bc7470a0dd7d3e259cd2db87ed41505e08f3eb205af6fd9edbba8d79c

```ts
import { controllerRole } from "../../src/dependencies.ts";
import { Note } from "./note.ts";

export const NotesController = controllerRole({
  id: "notes", objects: [Note], requires: [],
});
```

## products/notebook/distributions.ts

Source SHA-256: 8c7e3f3b9baa48272cfd51bc22b7d1b4cae7177c8a0f8d82d217a58a743edc8b

```ts
import { clientDistribution, controllerDistribution, localBinding, remoteBinding } from "../../src/index.ts";
import { NotesController } from "./dependencies.ts";
import { Notebook } from "./product.ts";
import { AgentNotebook, HumanNotebook } from "./surfaces.ts";

export const NotebookService = controllerDistribution({
  id: "notebook-service", product: Notebook, runtime: "node", storage: "postgresql",
  serves: [HumanNotebook, AgentNotebook], provides: [NotesController],
});

export const NotebookWeb = clientDistribution({
  id: "notebook-web", product: Notebook, surface: HumanNotebook,
  renderer: "svelte-web", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookIOS = clientDistribution({
  id: "notebook-ios", product: Notebook, surface: HumanNotebook,
  renderer: "swiftui-ios", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookCLI = clientDistribution({
  id: "notebook-cli", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [remoteBinding(NotesController, NotebookService)],
});

export const NotebookLocal = clientDistribution({
  id: "notebook-local", product: Notebook, surface: HumanNotebook,
  renderer: "terminal-cli", bindings: [localBinding(NotesController, "notes-local")],
});
```

## src/interaction/catalog.ts

Source SHA-256: 9892a6e7c36fed79838a2eede72419d692e8b2044675cc7c1fd6c285ef393f30

```ts
import { freezeDeep, jsonSnapshot } from "../json.ts";
import { ControlBank } from "./control-bank.ts";
import { CatalogGroups, CatalogFoundations, catalogInspection, type DiscoveryGroup, type FoundationId } from "./catalog-ownership.ts";

function entry<const Id extends string, const Family extends string, const States extends readonly string[]>(
  id: Id, family: Family, states: States, group: DiscoveryGroup, owners: readonly FoundationId[]) {
  return { id, family, states, inspection: catalogInspection(id, states, group, owners,
    ['tests/bank-node.test.ts', 'tests/public-catalog-bank.test.ts']) };
}

export const InteractionCatalog = freezeDeep({
  id: "desert.human-interaction", version: "0.4.1",
  groups: CatalogGroups, foundations: CatalogFoundations,
  entries: [
    entry("input.text", "primitive", ["empty", "value", "invalid", "disabled"], "controls", ["pane", "well"]),
    entry("input.multiline", "primitive", ["empty", "value", "invalid", "disabled"], "controls", ["pane", "well"]),
    entry("fact", "primitive", ["known", "empty", "unknown"], "foundations", ["stack", "status"]),
    entry("action", "primitive", ["ready", "unavailable", "pending"], "foundations", ["pane", "action"]),
    entry("availability", "primitive", ["unknown", "ready", "unavailable"], "foundations", ["status"]),
    entry("collection", "composition", ["empty", "records"], "compositions", ["stack", "pane", "action"]),
    entry("form", "composition", ["incomplete", "ready", "disconnected"], "compositions", ["stack", "well", "action"]),
    entry("context", "composition", ["available", "unavailable"], "compositions", ["stack", "action"]),
    entry("review", "composition", ["prepared", "uncertain"], "compositions", ["stack", "status", "action"]),
    entry("transient", "composition", ["open", "locked"], "compositions", ["pane", "stack", "action"]),
    entry("problem", "composition", ["error", "warning"], "compositions", ["pane", "status", "action"]),
    entry("catalog.card", "composition", ["featured", "item"], "product", ["stack", "action"]),
    entry("catalog.home", "composition", ["populated"], "product", ["stack"]),
    entry("catalog.detail", "composition", ["reading"], "product", ["stack"]),
    ...ControlBank.map(({ id, family, specimens, inspection }) => ({ id, family, states: specimens.map(specimen => specimen.state), inspection })),
  ] as const,
});

export type PrimitiveId = typeof InteractionCatalog.entries[number]["id"];
export type InputPrimitive = Extract<PrimitiveId, `input.${string}`>;
export type RendererBank<T> = { readonly [K in PrimitiveId]: T };

export function requireCatalog(candidate: unknown) {
  if (JSON.stringify(jsonSnapshot(candidate)) !== JSON.stringify(jsonSnapshot(InteractionCatalog))) {
    throw new Error("INTERACTION_CATALOG_MISMATCH");
  }
}
```

## src/interaction/grammar.ts

Source SHA-256: 4d68dc159434d9e9f9bfc48b26160d1fe99629af565a62ef7306908b9530c9d7

```ts
import { Type } from "@sinclair/typebox";
import { InteractionCatalog } from "./catalog.ts";
import type { InputPrimitive } from "./catalog.ts";

export const InputPrimitiveSchema = Type.Union(InteractionCatalog.entries
  .filter((entry): entry is Extract<typeof entry, { id: InputPrimitive }> => entry.id.startsWith("input."))
  .map(entry => Type.Literal(entry.id)));
```

## src/interaction/form.ts

Source SHA-256: 7a0a8cadcdd62bf144185d07aad69e7a29802a22a128a6d41247310794c7eb51

```ts
import type { Mutation } from "../web/types.ts";
import type { InputPrimitive } from "./catalog.ts";

export function deriveForm(journey: Mutation, presentations: Readonly<Record<string, InputPrimitive>>) {
  return journey.inputFields.map(name => {
    const schema = journey.inputSchema.properties[name]!;
    if (schema.type !== "string" || schema.enum) throw new Error("UNSUPPORTED_FORM_PRIMITIVE");
    return { name, primitive: presentations[`${journey.object}.${name}`] ?? "input.text",
      // JSON Schema required means presence; the control's required means nonempty.
      required: journey.inputSchema.required.includes(name) && typeof schema.minLength === "number" && schema.minLength > 0, schema };
  });
}
```

## src/interaction/bank-schema.ts

Source SHA-256: d9b069fa9c6b40a853d616929347301b2f8249a136a788ecbf203074a560366d

```ts
import { Type, type TProperties, type TSchema } from "@sinclair/typebox";
import { ControlNodeSchema } from "./control-nodes.ts";
import { FactsSchema, FormSchema, ContextSchema, ReviewSchema, SurfaceFrameSchema } from "./surface-frame.ts";
import { ToolbarActionSchema, TopToolbarSchema, actionSchema } from "./toolbar.ts";
import { CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema } from "../public-catalog/node-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";
import { InputMaskSchema } from "./input-mask.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const version = Type.Literal("desert.bank-node/1");
const node = <K extends string, P extends TProperties>(kind: K, properties: P) => object({ version, kind: Type.Literal(kind), ...properties });
const control = <K extends string, S extends TSchema>(kind: K, schema: S) => node(kind, { control: schema });
const input = { name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
  disabled: Type.Boolean(), error: Type.Optional(text()), maxLength: FormSchema.properties.fields.items.properties.maxLength };

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
  object: text(), fields: Type.Array(text(), { minItems: 1, uniqueItems: true }), labels: FactsSchema.properties.labels,
  createLabel: text(), records: Type.Array(record), disabled: Type.Boolean(), loaded: Type.Boolean(),
  selectedId: Type.Union([Type.Null(), text()]),
});

/** The complete bank's serializable grammar. Web callbacks and host handles are not values here. */
export const BankNodeSchema = Type.Union([
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
  CatalogFeaturedSchema, CatalogItemSchema, CatalogHomeSchema, CatalogDetailSchema,
]);
```

## src/interaction/bank-node.ts

Source SHA-256: e6d2ac2754132949d3f0cbd0ae6306104ab1cec2b94b559adc2a59d79dcdabf3

```ts
import { type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { BankNodeSchema } from "./bank-schema.ts";
import { controlNode, type ControlNode } from "./control-nodes.ts";
import { surfaceFrame, checkFrameContent } from "./surface-frame.ts";
import { transientFrame } from "./transient-frame.ts";
import type { PrimitiveId } from "./catalog.ts";
import { checkCatalogHome } from "../public-catalog/node-schema.ts";
import { inputMask } from "./input-mask.ts";

export type BankNode = Frozen<Static<typeof BankNodeSchema>>;
export type BankNodeFor<K extends PrimitiveId> = Extract<BankNode, { kind: K }>;
export const BankVersion = "desert.bank-node/1" as const;

/** Validate JSON shape and the same semantic owners used by product frames and controls. */
export function bankNode(value: unknown): BankNode {
  const node: unknown = jsonSnapshot(value);
  if (!Check(BankNodeSchema, node)) throw new Error("INVALID_BANK_NODE");
  if (node.kind === "input.text" && node.mask) inputMask(node.mask);
  if ("control" in node) controlNode(node.control);
  if (node.kind === "catalog.home") checkCatalogHome(node);
  if ("content" in node) checkFrameContent(node.content);
  if (node.kind === "fact") checkFrameContent(node.details);
  if (node.kind === "transient") transientFrame(surfaceFrame(node.frame), node.locked);
  if (node.kind === "action" && ((node.role === "primary" && ["back", "close", "catalog.back"].includes(node.action.intent.kind)) ||
    (node.form && node.action.intent.kind !== "journey"))) throw new Error("INVALID_BANK_ACTION");
  if (node.kind === "collection" && (new Set(node.records.map(record => record.id)).size !== node.records.length ||
    node.records.some(record => Object.keys(record.facts).some(field => !node.fields.includes(field))) ||
    node.fields.some(field => !Object.hasOwn(node.labels, `${node.object}.${field}`)))) throw new Error("INVALID_BANK_COLLECTION");
  return freezeDeep(node);
}

/** Wrap the installed control grammar without widening it into product authoring. */
export function controlBankNode(control: ControlNode): Extract<BankNode, { control: ControlNode }> {
  const node = bankNode({ version: BankVersion, kind: `control.${control.kind}`, control });
  if (!("control" in node)) throw new Error("BANK_CONTROL_REQUIRED");
  return node;
}
```

## src/interaction/bank-events.ts

Source SHA-256: 70909a652b9ee71db921c06f4df5913684730c0ad9e8c434e3852b5034e8fa02

```ts
import { Type, type Static } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { ControlEventSchema } from "./control-nodes.ts";
import { SurfaceIntentSchema } from "./intent.ts";
import { LocalIntentSchema } from "./bank-schema.ts";
import { CatalogEventSchema } from "../public-catalog/events.ts";

const closed = { additionalProperties: false };
const text = () => Type.String({ minLength: 1 });
export const BankEventSchema = Type.Union([
  ...ControlEventSchema.anyOf,
  ...CatalogEventSchema.anyOf,
  Type.Object({ kind: Type.Literal("input.change"), name: text(), value: Type.String() }, closed),
  Type.Object({ kind: Type.Literal("surface.invoke"), intent: SurfaceIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("local.invoke"), intent: LocalIntentSchema }, closed),
  Type.Object({ kind: Type.Literal("collection.select"), id: text() }, closed),
  Type.Object({ kind: Type.Literal("transient.close") }, closed),
  Type.Object({ kind: Type.Literal("transient.closed") }, closed),
  Type.Object({ kind: Type.Literal("problem.close") }, closed),
]);
export type BankEvent = Frozen<Static<typeof BankEventSchema>>;
export function bankEvent(value: unknown): BankEvent {
  const event = jsonSnapshot(value);
  if (!Check(BankEventSchema, event)) throw new Error("INVALID_BANK_EVENT");
  return freezeDeep(event);
}
```

## src/svelte/BankRenderer.svelte

Source SHA-256: 43fb2abdf1ca5b50c22bcd28d22af133fe5c89b6db6e1a8864aa61b2433a3739

```svelte
<script lang="ts">
  import type { ActionElementProps } from "./action-adapter.ts";
  import { bankNode, type BankNode } from "../interaction/bank-node.ts";
  import { bankEvent, type BankEvent } from "../interaction/bank-events.ts";
  import type { ControlEvent } from "../interaction/control-nodes.ts";
  import type { LocalFileHost } from "./controls/file-host.ts";
  import { webRenderers } from "./renderer-registry.ts";

  let { node, onevent = () => {}, host, actionElementProps }: {
    node: BankNode; onevent?: (event: BankEvent) => void; host?: LocalFileHost;
    actionElementProps?: ActionElementProps;
  } = $props();
  let checked = $derived(bankNode(node));
  const emit = (event: BankEvent) => onevent(bankEvent(event));
  const control = (event: ControlEvent) => emit(event);
  function activate() {
    if (checked.kind !== "action" || checked.form || checked.action.state !== "ready") return;
    const intent = checked.action.intent;
    if (intent.kind === "catalog.open" || intent.kind === "catalog.back") emit(intent);
    else if (intent.kind === "catalog" || intent.kind === "search.clear" || intent.kind === "specimen" ||
      intent.kind === "transient.open" || intent.kind === "selection.clear") emit({ kind: "local.invoke", intent });
    else emit({ kind: "surface.invoke", intent });
  }
  function fileHost() { if (!host) throw new Error("LOCAL_FILE_HOST_REQUIRED"); return host; }
</script>

{#if checked.kind === "input.text"}
  {@const Renderer = webRenderers[checked.kind]}
  <Renderer primitive={checked.kind} identity={checked.name} label={checked.label} value={checked.value} required={checked.required}
    disabled={checked.disabled} error={checked.error} mask={checked.mask} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.text" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "input.multiline"}
  {@const Renderer = webRenderers[checked.kind]}
  <Renderer primitive={checked.kind} label={checked.label} value={checked.value} required={checked.required}
    disabled={checked.disabled} error={checked.error} maxLength={checked.maxLength}
    onchange={value => checked.kind === "input.multiline" && emit({ kind: "input.change", name: checked.name, value })} />
{:else if checked.kind === "action"}
  {@const Renderer = webRenderers.action}
  <Renderer label={checked.action.label} icon={checked.action.icon} state={checked.action.state} emphasis={checked.role}
    type={checked.form ? "submit" : "button"} onclick={activate} elementProps={actionElementProps} />
{:else if checked.kind === "availability"}
  {@const Renderer = webRenderers.availability}<Renderer state={checked.state} label={checked.label} />
{:else if checked.kind === "fact"}
  {@const Renderer = webRenderers.fact}<Renderer {...checked.details} />
{:else if checked.kind === "form"}
  {@const Renderer = webRenderers.form}<Renderer fields={checked.content.fields} edit={(name, value) => emit({ kind: "input.change", name, value })} />
{:else if checked.kind === "context"}
  {@const Renderer = webRenderers.context}<Renderer {...checked.content.details} actions={checked.content.actions.map(action => ({
    id: action.destination, label: action.label, available: action.available,
    invoke: () => emit({ kind: "surface.invoke", intent: { kind: "journey", journey: action.destination } }),
  }))} />
{:else if checked.kind === "review"}
  {@const Renderer = webRenderers.review}<Renderer {...checked.content} />
{:else if checked.kind === "collection"}
  {@const Renderer = webRenderers.collection}<Renderer node={checked} select={id => emit({ kind: "collection.select", id })} />
{:else if checked.kind === "transient"}
  {@const Renderer = webRenderers.transient}<Renderer label={checked.label} open={checked.open} locked={checked.locked} frame={checked.frame}
    onclose={() => emit({ kind: "transient.close" })} onclosed={() => emit({ kind: "transient.closed" })}
    invoke={intent => emit({ kind: "surface.invoke", intent })} edit={(name, value) => emit({ kind: "input.change", name, value })} />
{:else if checked.kind === "problem"}
  {@const Renderer = webRenderers.problem}<Renderer open={checked.open} title={checked.title} description={checked.description}
    locked={checked.locked} severity={checked.severity} close={() => emit({ kind: "problem.close" })} />
{:else if checked.kind === "control.select"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.popover"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.files"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} host={fileHost()} />
{:else if checked.kind === "control.options"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.money"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.date"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} onevent={control} />
{:else if checked.kind === "control.tag"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.image"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "control.avatar"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked.control} />
{:else if checked.kind === "catalog.card"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.home"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{:else if checked.kind === "catalog.detail"}
  {@const Renderer = webRenderers[checked.kind]}<Renderer node={checked} onevent={emit} />
{/if}
```

## src/check-surface.ts

Source SHA-256: bb1f277baa4bbb15f77ed63440af57b934daa4110724e535c2143eefcfdbbdf5

```ts
import type { ObjectDefinition } from "./contracts.ts";
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import { requireReference } from "./references.ts";

export function checkSurface(surface: SurfaceDefinition, journeys: Map<string, JourneyDefinition>, objects: Map<string, ObjectDefinition>) {
  const exposed = new Map(surface.journeys.map(id => [id, requireReference(journeys, id, "journey")]));
  if (surface.kind === "agent") return;
  for (const [name] of Object.entries(surface.inputs ?? {})) {
    const match = [...exposed.values()].find(journey => journey.kind === "mutation" &&
      journey.command.input.some(field => `${journey.command.object}.${field}` === name));
    if (!match || match.kind !== "mutation") throw new Error(`Unknown input presentation: ${name}`);
    const field = name.slice(match.command.object.length + 1);
    if (objects.get(match.command.object)!.facts[field]!.kind !== "text") throw new Error(`Input presentation type mismatch: ${name}`);
  }
  for (const journey of exposed.values()) {
    if (journey.kind === "mutation" && !Object.hasOwn(surface.commit, journey.id)) {
      throw new Error(`Missing commit mode: ${journey.id}`);
    }
  }
  for (const id of Object.keys(surface.commit)) {
    if (requireReference(exposed, id, "commit journey").kind !== "mutation") throw new Error("Only mutations have commit modes");
  }
  for (const id of [surface.entry, surface.primaryAction, ...surface.subjectActions]) requireReference(exposed, id, "exposed journey");
  if (exposed.get(surface.entry)?.kind !== "read") throw new Error("Human entry must be a read journey");
  const primary = exposed.get(surface.primaryAction)!;
  if (primary.kind !== "mutation" || primary.command.kind !== "create") throw new Error("Primary action must create");
  for (const id of surface.subjectActions) {
    const action = exposed.get(id)!;
    if (action.kind !== "mutation" || action.command.kind !== "update") throw new Error("Subject action must update");
    const entry = exposed.get(surface.entry)!;
    if (entry.kind === "read" && entry.object !== action.command.object) throw new Error("Subject action object mismatch");
  }
  const requiredFields = new Set<string>();
  for (const journey of exposed.values()) {
    if (!Object.hasOwn(surface.language.journeys, journey.id)) throw new Error(`Missing journey label: ${journey.id}`);
    const objectId = journey.kind === "read" ? journey.object : journey.command.object;
    const object = objects.get(objectId)!;
    const fields = journey.kind === "read" ? [...journey.fields, ...journey.collection]
      : journey.command.kind === "create" ? journey.command.input : Object.keys(journey.command.set);
    for (const name of fields) requiredFields.add(`${object.id}.${name}`);
  }
  for (const name of requiredFields) {
    if (!Object.hasOwn(surface.language.fields, name)) throw new Error(`Missing field label: ${name}`);
  }
  for (const id of Object.keys(surface.language.journeys)) requireReference(exposed, id, "labeled journey");
  for (const name of Object.keys(surface.language.fields)) {
    if (!requiredFields.has(name)) throw new Error(`Unknown field label: ${name}`);
  }
}
```

## src/project-surface.ts

Source SHA-256: 6fdea0f10be242340ed373a39195971af715107fe98f68f2aa537e1bb310c8bc

```ts
import type { ProductDefinition } from "./contracts.ts";
import type { compileProgram } from "./compile-program.ts";
import type { JourneyDefinition, SurfaceDefinition } from "./program-grammar.ts";
import { emitObject } from "./schema.ts";
import { freezeDeep } from "./json.ts";
import { InteractionCatalog } from "./interaction/catalog.ts";

function reviewFields(product: ProductDefinition, program: ReturnType<typeof compileProgram>,
  surface: Extract<SurfaceDefinition, { kind: "human" }>, journey: Extract<JourneyDefinition, { kind: "mutation" }>) {
  const command = journey.command;
  const owner = product.policies?.find(policy => policy.object === command.object)?.field;
  const reads = surface.journeys.map(id => program.journeys.get(id)!)
    .filter(journey => journey.kind === "read" && journey.object === command.object);
  const details = reads.flatMap(journey => journey.kind === "read" ? journey.fields : []);
  const exposed = new Set([...command.input, ...details,
    ...reads.flatMap(journey => journey.kind === "read" ? journey.collection : [])]);
  const effects = Object.keys(command.kind === "create" ? command.values : command.set).filter(name => name !== owner);
  // Review never grants visibility: unsupported consequential private changes fail closed.
  if (surface.commit[journey.id] === "review") {
    for (const name of effects) {
      if (!exposed.has(name)) throw new Error(`UNSUPPORTED_REVIEW_PROJECTION: ${journey.id}.${name}`);
    }
  }
  return [...new Set([...details, ...effects.filter(name => exposed.has(name))])].filter(name => name !== owner);
}

export function projectSurface(product: ProductDefinition, program: ReturnType<typeof compileProgram>, surface: SurfaceDefinition, digest: string) {
  const journeys = surface.journeys.map(id => {
    const journey = program.journeys.get(id)!;
    const dependencies = program.journeyDependencies.get(id)!;
    if (journey.kind === "mutation") return {
      id, kind: "mutation" as const, commandId: journey.command.id, dependencies,
      object: journey.command.object, inputFields: journey.command.input,
      inputSchema: program.commands.get(journey.command.id)!.inputSchema,
      ...(surface.kind === "human" ? { reviewFields: reviewFields(product, program, surface, journey) } : {}),
      ...(journey.command.kind === "update" ? { subject: journey.command.object } : {}),
      confirmation: journey.confirmation, outcome: journey.outcome,
    };
    const object = product.objects.find(object => object.id === journey.object)!;
    const projection = (fields: string[]) => emitObject({
      id: object.id, facts: Object.fromEntries(fields.map(name => [name, object.facts[name]!])),
    });
    return { id, kind: "read" as const, subject: object.id, dependencies,
      fields: journey.fields, collection: journey.collection,
      detailSchema: projection(journey.fields), collectionSchema: projection(journey.collection) };
  });
  return freezeDeep({
    protocol: "desert.interaction/6" as const, id: surface.id, kind: surface.kind,
    productId: product.id, contractDigest: digest, execution: "not-installed" as const, journeys,
    ...(surface.kind === "human" ? {
      catalog: InteractionCatalog, inputs: surface.inputs ?? {},
      navigation: { entry: surface.entry, primaryAction: surface.primaryAction, subjectActions: surface.subjectActions },
      language: surface.language, connection: surface.connection, commit: surface.commit,
    } : {}),
  });
}
```

## src/web/build.ts

Source SHA-256: 3d43f9a00047a303fe47e288117a1cb14ccfd9b4f44402d24a4052ec1ddf1582

```ts
import { Ajv } from "ajv";
import standaloneModule from "ajv/dist/standalone/index.js";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { compile } from "../compile.ts";
import { requireCatalog } from "../interaction/catalog.ts";
import { deriveForm } from "../interaction/form.ts";
import { compileViewProgram } from "../views/program.ts";

export async function buildHumanModule(application: ReturnType<typeof compile>, surfaceId: string, program?: unknown) {
  const surface = application.surface(surfaceId);
  if (surface.kind !== "human") throw new Error("HUMAN_SURFACE_REQUIRED");
  requireCatalog(surface.catalog);
  if (surface.language?.locale !== "en") throw new Error("UNSUPPORTED_RENDERER_LANGUAGE");
  const viewProgram = program === undefined ? null : compileViewProgram(program, surface);
  const entry = surface.journeys.find(journey => journey.id === surface.navigation?.entry);
  if (entry?.kind !== "read") throw new Error("UNSUPPORTED_RENDERER_ENTRY");
  const navigation = new Set([surface.navigation!.entry, surface.navigation!.primaryAction, ...surface.navigation!.subjectActions]);
  for (const journey of surface.journeys) {
    if (!navigation.has(journey.id) || (journey.kind === "mutation" &&
        (journey.object !== entry.subject || (journey.subject && journey.inputFields.length)))) {
      throw new Error("UNSUPPORTED_RENDERER_COMPOSITION");
    }
  }
  const engine = new Ajv({ strict: true, allErrors: true, ownProperties: true,
    coerceTypes: false, removeAdditional: false, useDefaults: false, code: { source: true, esm: true } });
  const exports: Record<string, string> = {};
  const commands = new Map<string, string>();
  for (const journey of surface.journeys) {
    if (journey.kind !== "mutation" || commands.has(journey.commandId)) continue;
    deriveForm(journey, surface.inputs ?? {});
    const name = `validate${commands.size}`;
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

Source SHA-256: 1fa3b0f098ffb0d2a538268465800a1a1b5822f21026b09f3138e8f99ad5e123

```svelte
<script lang="ts">
  import HumanProduct from "@desert/svelte/HumanProduct.svelte";
  import ViewProduct from "@desert/svelte/views/ViewProduct.svelte";
  import { surface, validateInput, viewProgram } from "virtual:desert/surface";
</script>

{#if viewProgram}
  <ViewProduct program={viewProgram} {surface} {validateInput} />
{:else}
  <HumanProduct {surface} {validateInput} />
{/if}
```

## src/svelte/renderer-contracts.ts

Source SHA-256: b8dc0be703191c62aa5d008490edfd3426368542c5a69ab3c9e3317a9db30c67

```ts
import type { Component } from "svelte";
import type { PrimitiveId, InputPrimitive } from "../interaction/catalog.ts";
import type { ControlNode, ControlEvent } from "../interaction/control-nodes.ts";
import type { SurfaceFrame, FrameContent, FactsContent, Destination } from "../interaction/surface-frame.ts";
import type { ToolbarAction, TopToolbar } from "../interaction/toolbar.ts";
import type { SurfaceIntent } from "../interaction/intent.ts";
import type { BankNodeFor } from "../interaction/bank-node.ts";
import type { BankEvent } from "../interaction/bank-events.ts";
import type { LocalFileHost } from "./controls/file-host.ts";
import type { ActionElementProps } from "./action-adapter.ts";
import type { InputMask } from "../interaction/input-mask.ts";

export type ControlKind = ControlNode["kind"];
export type ControlEventFor<K extends ControlKind> = Extract<ControlEvent, { kind: `${K}.${string}` }>;
export type ControlProps<K extends ControlKind> = { node: Extract<ControlNode, { kind: K }> } &
  ([ControlEventFor<K>] extends [never] ? {} : { onevent: (event: ControlEventFor<K>) => void }) &
  (K extends "files" ? { host: LocalFileHost } : {});

type Invoke = (intent: SurfaceIntent) => void;
type Edit = (name: string, value: string) => void;
type FactsProps = Pick<FactsContent, "fields" | "facts" | "object" | "labels" | "multiline">;
type InputProps<P extends InputPrimitive> = {
  primitive: P; label: string; value?: string; required?: boolean; identity?: string; maxLength?: number | undefined;
  invalid?: boolean; error?: string | undefined; disabled?: boolean; onchange: (value: string) => void;
};
type ControlRendererProps = { [K in ControlKind as `control.${K}`]: ControlProps<K> };

/** Private web adapter bindings, never accepted as bank descriptors. BankRenderer alone resolves these. */
export type WebRendererProps = ControlRendererProps & {
  "catalog.card": { node: BankNodeFor<"catalog.card">; onevent: (event: BankEvent) => void };
  "catalog.home": { node: BankNodeFor<"catalog.home">; onevent: (event: BankEvent) => void };
  "catalog.detail": { node: BankNodeFor<"catalog.detail">; onevent: (event: BankEvent) => void };
  "input.text": InputProps<"input.text"> & { mask?: InputMask | undefined };
  "input.multiline": InputProps<"input.multiline">;
  fact: FactsProps;
  action: Pick<ToolbarAction, "label" | "icon"> & {
    state?: ToolbarAction["state"]; emphasis?: "primary" | "secondary";
    onclick?: () => void; type?: "button" | "submit"; elementProps?: ActionElementProps | undefined;
  };
  availability: NonNullable<TopToolbar["availability"]>;
  collection: { node: BankNodeFor<"collection">; select: (id: string) => void };
  form: { fields: Extract<FrameContent, { kind: "form" }>["fields"]; edit: Edit };
  context: FactsProps & { actions: readonly (Pick<Destination, "label" | "available"> & {
    id: Destination["destination"]; invoke: () => void;
  })[] };
  review: Extract<FrameContent, { kind: "review" }>;
  transient: {
    label: string; open: boolean; locked?: boolean; onclose: () => void; onclosed?: () => void;
    frame: SurfaceFrame; invoke: Invoke; edit?: Edit;
  };
  problem: {
    open: boolean; title: TopToolbar["title"]; description: Extract<FrameContent, { kind: "message" }>["text"];
    close: () => void; severity?: "error" | "warning"; locked?: boolean;
  };
};

/** Inventory and props are both checked; a component for another entry is not interchangeable. */
export type WebRendererBank = { readonly [K in PrimitiveId]: Component<WebRendererProps[K]> };
```

## src/svelte/renderer-registry.ts

Source SHA-256: 485a298f113df082edcb280949b9a1ef837d6735893f2632d07488346b93932d

```ts
import type { WebRendererBank } from "./renderer-contracts.ts";
import TextInput from "./pieces/TextInput.svelte";
import Action from "./pieces/Action.svelte";
import Availability from "./pieces/Availability.svelte";
import Drawer from "./pieces/Drawer.svelte";
import Problem from "./pieces/Problem.svelte";
import Facts from "./Facts.svelte";
import Fields from "./Fields.svelte";
import Collection from "./Collection.svelte";
import ContextPanel from "./ContextPanel.svelte";
import Review from "./Review.svelte";
import SelectControl from "./controls/SelectControl.svelte";
import PopoverControl from "./controls/PopoverControl.svelte";
import FileControl from "./controls/FileControl.svelte";
import OptionsControl from "./controls/OptionsControl.svelte";
import MoneyControl from "./controls/MoneyControl.svelte";
import DateControl from "./controls/DateControl.svelte";
import MediaControl from "./controls/MediaControl.svelte";
import CatalogCard from "./explorer/CatalogCard.svelte";
import CatalogHome from "./explorer/CatalogHome.svelte";
import CatalogDetail from "./explorer/CatalogDetail.svelte";

export const webRenderers: WebRendererBank = Object.freeze({
  "input.text": TextInput,
  "input.multiline": TextInput,
  fact: Facts,
  action: Action,
  availability: Availability,
  collection: Collection,
  form: Fields,
  context: ContextPanel,
  review: Review,
  transient: Drawer,
  problem: Problem,
  "control.select": SelectControl,
  "control.popover": PopoverControl,
  "control.files": FileControl,
  "control.options": OptionsControl,
  "control.money": MoneyControl,
  "control.date": DateControl,
  "control.tag": MediaControl,
  "control.image": MediaControl,
  "control.avatar": MediaControl,
  "catalog.card": CatalogCard,
  "catalog.home": CatalogHome,
  "catalog.detail": CatalogDetail,
} satisfies WebRendererBank);
```

## src/views/program-schema.ts

Source SHA-256: 101ceedcc4f735de98c7c599f2b8b4370c7373aad42c8644526f151d75784fb1

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { ActionIconSchema } from "../interaction/toolbar.ts";
import { ViewSchema, ViewLimits } from "./schema.ts";
import { closed, immutable, name, text } from "./definition.ts";

export const ViewProgramVersion = "desert.view-program/1" as const;
export const ViewOutputActionSchema = immutable(Type.Union([
  closed({ kind: Type.Literal("journey"), journey: name }),
  closed({ kind: Type.Literal("select") }),
  closed({ kind: Type.Literal("submit") }),
  closed({ kind: Type.Literal("close") }),
]));
export const ViewOutputBindingSchema = closed({ view: name, output: name, action: ViewOutputActionSchema });
const outputs = Type.Array(ViewOutputBindingSchema, { maxItems: ViewLimits.catalogSize });
export const ViewJourneySchema = immutable(Type.Union([
  closed({ id: name, kind: Type.Literal("presentation"), view: name, outputs }),
  closed({ id: name, kind: Type.Literal("read"), view: name, detailView: name, outputs }),
  closed({ id: name, kind: Type.Literal("create"), view: name, preferredDock: Type.Literal("right"), outputs }),
]));
export const ViewDestinationSchema = closed({ id: name, label: text, icon: ActionIconSchema, entryJourney: name });
export const ViewProgramSchema = closed({
  version: Type.Literal(ViewProgramVersion), productId: name, label: text,
  views: Type.Array(ViewSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  journeys: Type.Array(ViewJourneySchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  destinations: Type.Array(ViewDestinationSchema, { minItems: 1, maxItems: ViewLimits.catalogSize }),
  entry: name, navigation: Type.Array(name, { minItems: 1, maxItems: ViewLimits.catalogSize }),
});
export type ViewProgram = Frozen<Static<typeof ViewProgramSchema>>;
export type ViewJourney = Frozen<Static<typeof ViewJourneySchema>>;
export type ViewDestination = Frozen<Static<typeof ViewDestinationSchema>>;
export type ViewOutputBinding = Frozen<Static<typeof ViewOutputBindingSchema>>;
export type ViewOutputAction = Frozen<Static<typeof ViewOutputActionSchema>>;
```

## src/views/program.ts

Source SHA-256: 12eeb1aadff30b09fd799a315045bf8f354f30025de4f1dad0daa10a471e378a

```ts
import { Check } from "@sinclair/typebox/value";
import { freezeDeep } from "../json.ts";
import type { Surface } from "../web/types.ts";
import { ViewProgramSchema, type ViewProgram } from "./program-schema.ts";
import { viewSnapshot } from "./snapshot.ts";
import { viewCatalog } from "./catalog.ts";
import { journeyViews, validateJourneyExposure, validateJourneyViews } from "./program-views.ts";
import { validateJourneyOutputs } from "./program-outputs.ts";

/** Bind presentation to an already compiled human exposure; this grants no execution authority. */
export function compileViewProgram(definition: unknown, surface: Surface): ViewProgram {
  const input = viewSnapshot(definition);
  if (!Check(ViewProgramSchema, input)) throw new Error("INVALID_VIEW_PROGRAM");
  if (surface.kind !== "human" || surface.protocol !== "desert.interaction/6" || !surface.navigation ||
    !surface.language || !surface.commit || !surface.connection) throw new Error("INVALID_VIEW_PROGRAM_SURFACE");
  const human = { ...surface, navigation: surface.navigation, language: surface.language,
    commit: surface.commit, connection: surface.connection };
  if (input.productId !== surface.productId) throw new Error("VIEW_PROGRAM_PRODUCT_MISMATCH");
  const views = new Map(viewCatalog(input.views).map(item => [item.id, item]));
  const journeys = new Map(input.journeys.map(item => [item.id, item]));
  if (journeys.size !== input.journeys.length) throw new Error("DUPLICATE_VIEW_JOURNEY");
  const destinations = new Map(input.destinations.map(item => [item.id, item]));
  if (destinations.size !== input.destinations.length) throw new Error("DUPLICATE_VIEW_DESTINATION");
  for (const value of views.values()) {
    if (value.leftDock || value.rightDock) throw new Error("UNSUPPORTED_PROGRAM_SIDE_DOCK");
    if (value.content.some(item => item.kind === "header" && item.media)) throw new Error("UNSUPPORTED_PROGRAM_HEADER_MEDIA");
    if (value.content.findIndex(item => item.kind === "header") > 0) throw new Error("INVALID_PROGRAM_HEADER_PLACEMENT");
  }
  const usedViews = new Set<string>();
  // Exposure is checked before output references so forged canonical identities fail at their owner.
  for (const journey of journeys.values()) validateJourneyExposure(journey, human);
  if (input.journeys.filter(item => item.kind === "read").length !== 1 ||
    input.journeys.filter(item => item.kind === "create").length !== 1) {
    throw new Error("INVALID_VIEW_PROGRAM_JOURNEY_COUNT");
  }
  for (const journey of journeys.values()) {
    const owned = journeyViews(journey, views);
    owned.forEach(item => usedViews.add(item.id));
    validateJourneyViews(journey, owned);
    validateJourneyOutputs(journey, owned, new Set(journeys.keys()));
  }
  if (usedViews.size !== views.size) throw new Error("UNUSED_PROGRAM_VIEW");
  for (const destination of destinations.values()) {
    const journey = journeys.get(destination.entryJourney);
    if (!journey) throw new Error("UNKNOWN_DESTINATION_JOURNEY");
    if (journey.kind === "create") throw new Error("INVALID_DESTINATION_JOURNEY");
  }
  for (const journey of journeys.values()) {
    if (journey.kind === "create") continue;
    const entries = input.destinations.filter(item => item.entryJourney === journey.id);
    if (entries.length !== 1) throw new Error("INVALID_JOURNEY_DESTINATION_COUNT");
  }
  if (!destinations.has(input.entry)) throw new Error("UNKNOWN_ENTRY_DESTINATION");
  if (new Set(input.navigation).size !== input.navigation.length) throw new Error("DUPLICATE_NAVIGATION_DESTINATION");
  if (input.navigation.some(id => !destinations.has(id))) throw new Error("UNKNOWN_NAVIGATION_DESTINATION");
  if (!input.navigation.includes(input.entry)) throw new Error("UNLISTED_ENTRY_DESTINATION");
  if (input.navigation.length !== destinations.size) throw new Error("UNLISTED_PROGRAM_DESTINATION");
  const reachable = new Set(input.destinations.map(item => item.entryJourney));
  const pending = [...reachable];
  while (pending.length) {
    for (const output of journeys.get(pending.pop()!)!.outputs) {
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

Source SHA-256: e07312b71a52f057c6457797ac1f3481ae311595a9b461acca3efd23d0ef8059

```ts
import type { View } from "./schema.ts";
import type { BankNode } from "../interaction/bank-node.ts";
import type { TopToolbar, BottomToolbar } from "../interaction/toolbar.ts";
import type { SurfaceFrame } from "../interaction/surface-frame.ts";

/** Private, validated projection. Products cannot provide runtime bindings or render callbacks. */
export type ResolvedView = {
  readonly view: View;
  readonly bindings: Readonly<Record<string, BankNode>>;
  readonly disabledOutputs: readonly string[];
  readonly top?: TopToolbar;
  readonly bottom?: BottomToolbar;
};
export type ResolvedPanel = {
  readonly frame: SurfaceFrame;
  readonly label: string;
  readonly locked: boolean;
};
```

## src/web/client/view-program.ts

Source SHA-256: bf7ab9623d88adb0b5e048096f982250df3e9d99f9b4513d7d83d408f5e470bb

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import type { BankEvent } from "../../interaction/bank-events.ts";
import { bankEvent } from "../../interaction/bank-events.ts";
import { compileViewProgram } from "../../views/program.ts";
import { projectView, projectViewPanel } from "./view-projection.ts";
import { humanProduct } from "./model.ts";

/** Nonvisual interpreter; the installed controller remains the only operation executor. */
export function viewProgramModel(input: unknown, surface: HumanSurface, validate: ValidateInput) {
  const program = compileViewProgram(input, surface);
  const model = humanProduct(surface, validate, { reading: false });
  let destinationId = program.entry;
  let current = model.snapshot();
  let creating = false;
  const listeners = new Set<() => void>();
  const destination = () => program.destinations.find(item => item.id === destinationId)!;
  const journeyFor = (id: string) => program.journeys.find(item => item.id === id)!;
  const definition = (id: string) => program.views.find(item => item.id === id)!;
  const read = program.journeys.find(item => item.kind === "read")!;
  const create = program.journeys.find(item => item.kind === "create")!;
  const notify = () => { for (const listener of listeners) listener(); };
  const unsubscribe = model.subscribe(next => {
    current = next;
    if (creating && next.view === "detail") {
      creating = false;
      destinationId = program.destinations.find(item => item.entryJourney === read.id)!.id;
    }
    if (next.view === "list") creating = false;
    notify();
  });
  function snapshot() {
    const active = journeyFor(destination().entryJourney);
    const main = definition(active.view);
    const panelJourney = current.view === "create" || current.view === "review" || current.view === "recovery"
      ? create : current.view === "detail" && active.kind === "read" ? read : null;
    const panelView = panelJourney?.kind === "read" ? definition(panelJourney.detailView)
      : panelJourney ? definition(panelJourney.view) : null;
    return { program, activeDestination: destinationId,
      resolved: projectView(program, active, main, surface, current, validate),
      panel: panelJourney && panelView ? projectViewPanel(program, panelJourney, panelView, surface, current, validate) : null,
      error: current.error, uncertain: current.uncertain, state: current };
  }
  function navigate(id: string) {
    if (!program.navigation.includes(id)) throw new Error("UNKNOWN_VIEW_DESTINATION");
    if (current.busy || current.uncertain) return;
    model.close();
    if (current.view === "detail") model.back();
    destinationId = id;
    model.setReading(journeyFor(destination().entryJourney).kind === "read");
    notify();
  }
  function startJourney(id: string) {
    const target = journeyFor(id);
    if (!target) throw new Error("UNKNOWN_VIEW_JOURNEY");
    if (target.kind === "create") {
      model.setReading(true);
      model.create();
      creating = current.view === "create";
    } else {
      const next = program.destinations.find(item => item.entryJourney === id);
      if (!next) throw new Error("UNKNOWN_VIEW_DESTINATION");
      navigate(next.id);
    }
  }
  function event(value: BankEvent) {
    const event = bankEvent(value);
    if (event.kind === "input.change") {
      if (current.view === "create" && !current.busy && !current.uncertain) {
        if (!model.primary.inputFields.includes(event.name)) throw new Error("INVALID_VIEW_INPUT");
        model.edit(event.name, event.value);
      }
      return;
    }
    if (event.kind === "problem.close") { model.dismissError(); return; }
    if (event.kind === "transient.closed") return;
    if (event.kind === "transient.close") { model.close(); return; }
    if (event.kind !== "surface.invoke") throw new Error("INVALID_VIEW_EVENT");
    const intent = event.intent;
    if (intent.kind === "close") { model.close(); return; }
    if (intent.kind === "back") { model.back(); return; }
    if (intent.kind === "accept") {
      if (current.view !== "review" && current.view !== "recovery") throw new Error("INVALID_VIEW_EVENT");
      void model.accept(); return;
    }
    if (intent.kind === "recover") {
      if (current.view !== "recovery") throw new Error("INVALID_VIEW_EVENT");
      void model.recover(); return;
    }
    if (intent.kind === "journey") {
      if (current.view !== "create" || intent.journey !== create.id) throw new Error("INVALID_VIEW_EVENT");
      const submit = create.outputs.find(binding => binding.action.kind === "submit")!;
      dispatchOutput(submit.view, submit.output);
      return;
    }
    if (intent.kind !== "view.output") throw new Error("INVALID_VIEW_EVENT");
    dispatchOutput(intent.view, intent.output, intent.recordId);
  }
  function dispatchOutput(view: string, output: string, recordId?: string) {
    const active = journeyFor(destination().entryJourney);
    const owner = view === active.view ? active :
      current.view === "create" && view === create.view ? create :
      current.view === "detail" && active.kind === "read" && read.kind === "read" && view === read.detailView ? read : undefined;
    const binding = owner?.outputs.find(item => item.view === view && item.output === output);
    if (!binding) throw new Error("UNKNOWN_VIEW_OUTPUT");
    if (binding.action.kind !== "select" && recordId !== undefined) throw new Error("INVALID_VIEW_OUTPUT_PAYLOAD");
    if (current.busy || current.uncertain) return;
    if (projectView(program, owner!, definition(view), surface, current, validate).disabledOutputs.includes(output)) return;
    switch (binding.action.kind) {
      case "journey": startJourney(binding.action.journey); break;
      case "select":
        if (!recordId || !current.records.some(record => record.id === recordId)) throw new Error("INVALID_VIEW_RECORD");
        void model.select(recordId); break;
      case "submit": void model.invoke(model.primary); break;
      case "close": model.close(); break;
    }
  }
  return {
    snapshot, event, navigate,
    subscribe(listener: () => void) { listeners.add(listener); listener(); return () => { listeners.delete(listener); }; },
    async start(invitation?: string) {
      model.setReading(journeyFor(destination().entryJourney).kind === "read");
      await model.start(invitation);
    },
    stop() { unsubscribe(); model.stop(); listeners.clear(); },
  };
}
```

## src/web/client/view-projection.ts

Source SHA-256: 6164494829f361e0e276342a3a5edb038281263f0467490da97952d5aad51da6

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import type { HumanState } from "./state.ts";
import type { ViewProgram, ViewJourney } from "../../views/program-schema.ts";
import type { View } from "../../views/schema.ts";
import type { ResolvedView, ResolvedPanel } from "../../views/resolved.ts";
import { viewInputs } from "../../views/ports.ts";
import { presentCollection } from "../../interaction/bank-presenters.ts";
import { bankNode, BankVersion, type BankNode } from "../../interaction/bank-node.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { toolbarAction } from "../../interaction/toolbar.ts";
import { presentFrame } from "./frame.ts";
import { readPresentation } from "./presentation.ts";
import { presentFacts } from "../../interaction/fact-presentation.ts";
import type { FrameContent } from "../../interaction/surface-frame.ts";

function contextContent(surface: HumanSurface, state: HumanState, content: FrameContent): FrameContent {
  if (content.kind !== "context" || !state.detail) return content;
  const read = readPresentation(surface);
  // Authored identity replaces the record title; keep that authorized fact in the body.
  // Subject mutations are not bound by this finite read/create presentation program.
  return { kind: "context", details: presentFacts(surface, read.subject, read.fields, state.detail.facts), actions: [] };
}

export function projectView(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput): ResolvedView {
  const bound: Record<string, BankNode> = {};
  for (const port of viewInputs(definition)) {
    if (port.kind === "collection") bound[port.input] = presentCollection(surface, state.records, {
      loaded: state.loaded, selectedId: state.selectedId,
      disabled: state.busy || state.uncertain || !state.availability.journeys[journey.id]?.dependenciesReady,
    });
    else {
      const frame = presentFrame(surface, { ...state, view: port.kind === "form" ? "create" : "detail" }, validate);
      if (frame.content.kind === "form" || frame.content.kind === "context") {
        bound[port.input] = bankNode({ version: BankVersion, kind: frame.content.kind,
          content: contextContent(surface, state, frame.content) });
      }
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
      return target?.kind !== "presentation" && !state.availability.journeys[targetId]?.dependenciesReady;
    }
    if (binding.action.kind === "submit") {
      const primary = surface.journeys.find(item => item.id === journey.id);
      return primary?.kind !== "mutation" || !state.availability.journeys[journey.id]?.dependenciesReady ||
        !validate(primary.commandId, state.draft);
    }
    if (binding.action.kind === "select") return !state.availability.journeys[journey.id]?.dependenciesReady;
    return false;
  }).map(binding => binding.output);
  const action = (item: NonNullable<View["topDock"]>["actions"][number]) => {
    const binding = journey.outputs.find(binding => binding.view === definition.id && binding.output === item.output);
    const enabled = !item.disabled && !disabledOutputs.includes(item.output);
    if (binding?.action.kind === "close") return toolbarAction({ kind: "close" }, item.label, item.icon, enabled);
    if (binding?.action.kind === "submit" && journey.kind === "create") {
      return toolbarAction({ kind: "journey", journey: journey.id }, item.label, item.icon, enabled);
    }
    return toolbarAction({ kind: "view.output", view: definition.id, output: item.output },
      item.label, item.icon, enabled);
  };
  const header = definition.content.find(item => item.kind === "header");
  const topActions = definition.topDock?.actions.map(action) ?? [];
  const bottomActions = definition.bottomDock?.actions.map(action) ?? [];
  const close = topActions.flatMap(item => item.intent.kind === "close" ? [{ ...item, intent: item.intent }] : [])[0];
  const primary = bottomActions.flatMap(item => item.intent.kind !== "close" ? [{ ...item, intent: item.intent }] : [])[0];
  return {
    view: definition, bindings: bound, disabledOutputs,
    top: { title: header?.title ?? program.destinations.find(item => item.entryJourney === journey.id)?.label ?? program.label,
      ...(header?.subtitle ? { subtitle: header.subtitle } : {}),
      ...(close ? { leading: close } : {}),
      trailing: topActions.flatMap(item => item.intent.kind !== "close" ? [{ ...item, intent: item.intent }] : []) },
    bottom: { ...(close ? { secondary: close } : {}), ...(primary ? { primary } : {}) },
  };
}

/** Panel grammar is checked at admission: one Header and one form/context, never discarded content. */
export function projectViewPanel(program: ViewProgram, journey: ViewJourney, definition: View,
  surface: HumanSurface, state: HumanState, validate: ValidateInput): ResolvedPanel {
  const canonical = presentFrame(surface, state, validate);
  if (state.view === "review" || state.view === "recovery") {
    return { frame: canonical, label: canonical.top.title, locked: state.busy || state.uncertain };
  }
  const resolved = projectView(program, journey, definition, surface, state, validate);
  const primary = resolved.bottom?.primary;
  const bottom = { ...resolved.bottom, ...(primary && canonical.bottom.primary?.state === "pending"
    ? { primary: { ...primary, state: "pending" as const } } : {}) };
  const frame = surfaceFrame({ ...canonical, content: contextContent(surface, state, canonical.content),
    top: resolved.top!, bottom });
  return { frame, label: frame.top.title, locked: state.busy || state.uncertain };
}
```

## src/svelte/views/ViewProduct.svelte

Source SHA-256: d90d82f6c69a7d1237de78c187d4b6ede2594113d39d817753318931eecfe44d

```svelte
<script lang="ts">
  import { onMount, untrack } from "svelte";
  import type { ViewProgram } from "../../views/program-schema.ts";
  import type { HumanSurface, ValidateInput } from "../../web/types.ts";
  import { viewProgramModel } from "../../web/client/view-program.ts";
  import { requireCatalog } from "../../interaction/catalog.ts";
  import Workspace from "./Workspace.svelte";
  import "../theme.css";

  let { program, surface, validateInput }: {
    program: ViewProgram; surface: HumanSurface; validateInput: ValidateInput;
  } = $props();
  const model = untrack(() => {
    requireCatalog(surface.catalog);
    return viewProgramModel(program, surface, validateInput);
  });
  let current = $state.raw(model.snapshot());
  onMount(() => {
    const root = document.documentElement;
    const previousProfile = root.dataset.rendererProfile;
    root.dataset.rendererProfile = "apple-reference";
    const unsubscribe = model.subscribe(() => { current = model.snapshot(); });
    const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
    history.replaceState(null, "", location.pathname + location.search);
    void model.start(invitation ?? undefined);
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (Object.values(current.state.draft).some(Boolean) || current.state.prepared) {
        event.preventDefault(); event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => {
      unsubscribe(); model.stop();
      window.removeEventListener("beforeunload", protectDraft);
      if (previousProfile === undefined) delete root.dataset.rendererProfile;
      else root.dataset.rendererProfile = previousProfile;
    };
  });
</script>

<Workspace program={current.program} activeDestination={current.activeDestination}
  resolved={current.resolved} panel={current.panel} error={current.error} uncertain={current.uncertain}
  {surface} {validateInput} onevent={model.event} onnavigate={model.navigate} />
```

## src/svelte/views/Workspace.svelte

Source SHA-256: 19b73fc1e3533d5f0b4d350d452276294cba7c097a05c7416f71a7f0ffde698b

```svelte
<script lang="ts">
  import { tick, untrack } from "svelte";
  import CatalogWorkspace from "../explorer/CatalogWorkspace.svelte";
  import CatalogSearchResults from "../explorer/CatalogSearchResults.svelte";
  import RetainedPlace from "../explorer/RetainedPlace.svelte";
  import { revealSearchTarget } from "../explorer/catalog-search-focus.ts";
  import type { WorkspaceSearchResult } from "../explorer/workspace-search.ts";
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import Toolbar from "../pieces/Toolbar.svelte";
  import FailureDialog from "../FailureDialog.svelte";
  import ViewContent from "./ViewContent.svelte";
  import Panel from "./Panel.svelte";
  import { viewIdentity, viewSearchResults, viewSearchSelection } from "./workspace-data.ts";
  import type { WorkspaceProps } from "./types.ts";
  let props: WorkspaceProps = $props();
  let searching = $state(false), query = $state("");
  let viewport = $state<HTMLDivElement | null>(null);
  let visited = $state.raw<readonly ResolvedView[]>([]);
  let contentOwners = $state<Record<string, { revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> }>>({});
  let identity = $derived(viewIdentity(props.resolved, props.program.label));
  let results = $derived(viewSearchResults(props.resolved, query));
  $effect(() => {
    const next = props.resolved;
    untrack(() => { visited = [...visited.filter(item => item.view.id !== next.view.id), next]; });
  });
  let scrollDestination: string | undefined;
  $effect(() => {
    const destination = props.activeDestination;
    untrack(() => {
      // Availability snapshots may refresh while the user scrolls. Only a real
      // navigation changes the viewport, never another projection of this view.
      if (destination === scrollDestination) return;
      scrollDestination = destination;
      cancelSearch(); viewport?.scrollTo({ top: 0 });
    });
  });
  let destinations = $derived(props.program.navigation.map(id => {
    const destination = props.program.destinations.find(item => item.id === id);
    if (!destination) throw new Error("UNRESOLVED_VIEW_DESTINATION");
    return destination;
  }));
  function invoke(intent: SurfaceIntent) { props.onevent({ kind: "surface.invoke", intent }); }
  function cancelSearch() { searching = false; query = ""; }
  async function selectSearchResult(result: WorkspaceSearchResult) {
    cancelSearch(); await tick();
    const selection = viewSearchSelection(props.resolved, result.id);
    if (selection) { props.onevent(selection); return; }
    const owner = contentOwners[props.resolved.view.id];
    const target = result.kind === "bank" ? await owner?.revealEntry(result.id)
      : viewport?.querySelector<HTMLElement>(`[data-view-item="${CSS.escape(result.id)}"]`);
    if (target) revealSearchTarget(target, viewport);
  }
</script>

<svelte:head><title>{props.resolved.top?.title ?? props.program.label} · {props.program.label}</title></svelte:head>

<CatalogWorkspace productName={props.program.label} title={identity.title} {identity}
  navigation={destinations} active={props.activeDestination} {query} {searching} bind:viewport
  onquery={value => { query = value; searching = true; }} onsearch={() => searching = true}
  oncancel={cancelSearch} onnavigate={props.onnavigate} topActions={props.resolved.top?.trailing} {invoke}>
  {#snippet searchResults()}
    <CatalogSearchResults title={identity.title} description="Find content in this destination."
      {query} {results} onselect={selectSearchResult} />
  {/snippet}
  {#snippet bottom()}
    {#if props.resolved.bottom?.primary || props.resolved.bottom?.secondary}
      <Toolbar toolbar={{ edge: "bottom", ...props.resolved.bottom }} {invoke} />
    {/if}
  {/snippet}
  {#snippet panels()}
    <Panel panel={props.panel} onevent={props.onevent} />
    <FailureDialog code={props.error} uncertain={props.uncertain}
      close={() => props.onevent({ kind: "problem.close" })} />
  {/snippet}
  {#each visited as resolved (resolved.view.id)}
    <RetainedPlace visible={resolved.view.id === props.resolved.view.id}
      active={resolved.view.id === props.resolved.view.id && !searching}>
      <ViewContent bind:this={contentOwners[resolved.view.id]} {resolved} onevent={props.onevent} />
    </RetainedPlace>
  {/each}
</CatalogWorkspace>
```

## src/svelte/views/workspace-data.ts

Source SHA-256: a11621895146be747dd2f6f38b32cbefe3c34f2a68f4f6aeccd753bea72df4e1

```ts
import type { ResolvedView } from "../../views/resolved.ts";
import type { ViewItem } from "../../views/schema.ts";
import type { BankEvent } from "../../interaction/bank-events.ts";
import type { PlaceIdentity } from "../pieces/place-identity.ts";
import type { WorkspaceSearchResult } from "../explorer/workspace-search.ts";
import { catalogTitle, matchingEntries } from "../catalog/navigation.ts";

/** Data adapter only. Geometry, material, focus and motion remain in CatalogWorkspace. */
export function viewIdentity(resolved: ResolvedView, fallback: string): PlaceIdentity {
  const header = resolved.view.content.find(item => item.kind === "header");
  return header ?? { title: resolved.top?.title ?? fallback, subtitle: resolved.top?.subtitle ?? "" };
}

const contentItems = (resolved: ResolvedView): readonly ViewItem[] => resolved.view.content.flatMap(item =>
  item.kind === "stack" ? item.items : item.kind === "header" || item.kind === "visual-catalog" ? [] : [item]);
const recordKey = (item: string, record: string) => JSON.stringify([item, record]);

export function viewSearchResults(resolved: ResolvedView, query: string): readonly WorkspaceSearchResult[] {
  const terms = query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
  if (!terms.length) return [];
  const results: WorkspaceSearchResult[] = resolved.view.content.some(item => item.kind === "visual-catalog") ? matchingEntries(query).map(entry => ({
    kind: "bank", id: entry.id, title: catalogTitle(entry.id), description: `${entry.id} · ${entry.states.join(", ")}`,
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
    for (const record of node.records) {
      const values = node.fields.map(field => String(record.facts[field] ?? ""));
      if (matches(values)) results.push({ kind: "content", id: recordKey(item.id, record.id),
        title: values[0] || record.id, description: values.slice(1).join(" · ") });
    }
  }
  return results;
}

export function viewSearchSelection(resolved: ResolvedView, id: string): BankEvent | null {
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

## src/svelte/explorer/CatalogWorkspace.svelte

Source SHA-256: 6fc956dcd5a92a8f9680899e23444b35ce3ca8e67001ee4c8a3ac4e95d6286a4

```svelte
<script lang="ts" generics="Destination extends string">
  import { tick, type Snippet } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import CatalogNavigation from "./CatalogNavigation.svelte";
  import CatalogToolbar from "./CatalogToolbar.svelte";
  import CatalogNavigationActions from "./CatalogNavigationActions.svelte";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import PlaceHeading from "../pieces/PlaceHeading.svelte";
  import ToolbarIdentity from "../pieces/ToolbarIdentity.svelte";
  import { observePlaceHeading } from "../pieces/place-heading-motion.ts";
  import type { PlaceIdentity } from "../pieces/place-identity.ts";
  import CatalogEdgeNavigation from "./CatalogEdgeNavigation.svelte";
  import Place from "../pieces/Place.svelte";
  import AdaptiveSurfaceLayout from "../pieces/AdaptiveSurfaceLayout.svelte";
  import type { WorkspaceDestination } from "./workspace-navigation.ts";
  import type { ToolbarAction } from "../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  let { productName, title, navigation, active, query, onquery, onnavigate, children, searchResults, searching,
    onsearch, oncancel, detail = false, onback, identity, searchAvailable = true, topActions = [], invoke,
    panels, bottom, viewport = $bindable(null) }: {
    productName: string; title: string; navigation: readonly WorkspaceDestination<Destination>[]; active: Destination;
    query: string; onquery: (query: string) => void; onnavigate: (id: Destination) => void;
    children: Snippet; searchResults: Snippet; searching: boolean; onsearch: () => void; oncancel: () => void;
    detail?: boolean; onback?: () => void;
    identity: PlaceIdentity;
    searchAvailable?: boolean; topActions?: readonly ToolbarAction[]; invoke?: (intent: SurfaceIntent) => void;
    /** Renderer-private composition; product View data never receives snippets. */
    panels?: Snippet; bottom?: Snippet; viewport?: HTMLDivElement | null;
  } = $props();
  let owner = $state<HTMLDivElement | null>(null);
  let heading = $state<HTMLElement | null>(null);
  let compact = $state<HTMLDivElement | null>(null);
  $effect(() => {
    identity;
    if (viewport && heading && compact) return observePlaceHeading(viewport, heading, compact);
  });
  let searchViewport = $state<HTMLDivElement | null>(null);
  const instanceId = $props.id();
  const resultsId = `${instanceId}-results`;
  let composing = false;
  let contentFocus: HTMLElement | null = null;
  let searchOpener: HTMLElement | null = null;
  let searchPointerActivation: Element | null = null;
  $effect(() => { active; contentFocus = null; });
  function ownsPointerFocus(target: EventTarget | null) {
    // WebKit may focus a tabindex ancestor instead of the pressed button.
    // Keep only that activation alive; unrelated external focus still cancels.
    return target instanceof Node && searchPointerActivation !== null && target.contains(searchPointerActivation);
  }
  function rememberFocus(event: FocusEvent) {
    if (!searching && event.target instanceof HTMLElement && viewport?.contains(event.target)) {
      contentFocus = event.target;
    } else if (searching && !inSearch(event.target) && !ownsPointerFocus(event.target)) {
      void cancel(false);
    }
  }
  function inSearch(target: EventTarget | null): boolean {
    return target instanceof Node && Boolean(searchViewport?.contains(target)
      || owner?.querySelector("[data-catalog-search-actions]")?.contains(target));
  }
  async function cancel(restoreFocus = true) {
    oncancel();
    if (!restoreFocus) return;
    await tick();
    const target = searchOpener?.isConnected && searchOpener.checkVisibility() ? searchOpener
      : contentFocus && viewport?.contains(contentFocus)
      && contentFocus.checkVisibility() && !contentFocus.matches(":disabled,[aria-disabled='true']")
      ? contentFocus : viewport;
    target?.focus({ preventScroll: true });
  }
  function openSearch() {
    searchOpener = owner?.querySelector<HTMLElement>('[data-catalog-search-toggle]') ?? null;
    onsearch();
  }
  function focusOut(event: FocusEvent) {
    // Browsers can expose BODY between focusout and focusin. The announced
    // internal destination is authoritative; otherwise inspect settled focus.
    if (!searching || inSearch(event.relatedTarget)) return;
    requestAnimationFrame(() => {
      if (searching && !inSearch(document.activeElement) && !ownsPointerFocus(document.activeElement)) void cancel(false);
    });
  }
  function pointerDown(event: PointerEvent) {
    searchPointerActivation = null;
    if (!searching || !(event.target instanceof Element)) return;
    // Result activation owns its own close/navigation transaction. Clear and X
    // also belong to search, so pointer focus changes must not swallow them.
    const activation = event.target.closest("[data-catalog-search-actions],[data-search-result]");
    if (activation) { searchPointerActivation = activation; return; }
    const takesFocus = event.target.closest("button,a[href],input,textarea,select,[tabindex]:not([tabindex='-1'])");
    void cancel(!takesFocus);
  }
  function finishPointerActivation() {
    const activation = searchPointerActivation;
    if (!activation) return;
    // Click follows pointerup. Reconcile after it, including cancelled/dragged
    // gestures that never activated a result, without retaining stale ownership.
    requestAnimationFrame(() => {
      if (searchPointerActivation !== activation) return;
      searchPointerActivation = null;
      if (searching && !inSearch(document.activeElement)) void cancel(false);
    });
  }
  function keydown(event: KeyboardEvent) {
    if (!searching || !inSearch(event.target) || event.defaultPrevented || event.key !== "Escape" || event.isComposing || composing || event.keyCode === 229) return;
    event.preventDefault(); event.stopPropagation(); void cancel();
  }
</script>

<!-- Search owns Escape only while focus is in its own surface. Capture keeps a
     concurrently docked task's dialog layer from consuming that local action. -->
<svelte:window onkeydowncapture={keydown} onfocusin={rememberFocus} onfocusout={focusOut} onpointerdown={pointerDown}
  onpointerup={finishPointerActivation} onpointercancel={finishPointerActivation} />

<div data-renderer-profile="apple-reference" data-catalog-workspace data-search-active={searching}>
  <Sidebar.Provider contentMinWidth="45rem" style="--sidebar-width:var(--catalog-sidebar-width)">
    <Sidebar.Root variant="floating" overlayTitle="Navigation" overlayDescription="Choose a destination.">
      <CatalogNavigation {productName} {navigation} {active} {onnavigate} {searching} />
    </Sidebar.Root>
    <AdaptiveSurfaceLayout>
    <Place bind:owner bind:viewport {bottom} role="main" data-catalog-content data-destination={active} tabindex={-1} aria-label={title}
      oncompositionstart={() => composing = true} oncompositionend={() => composing = false}
      viewportAttributes={{ 'data-catalog-scroll': '', tabindex: -1, inert: searching, 'aria-hidden': searching ? 'true' : undefined }}>
      {#snippet top()}
      <ToolbarLayout data-place-toolbar inert={searching} aria-hidden={searching}>
        <CatalogNavigationActions {detail} {onback} {topActions} {invoke} />
        <ToolbarIdentity {identity} bind:element={compact} />
      </ToolbarLayout>
      <CatalogToolbar {title} {query} {onquery} {searching} {resultsId} {searchAvailable} onsearch={openSearch} oncancel={cancel} />
      {/snippet}
      {#snippet content()}<PlaceHeading {identity} bind:element={heading} />{@render children()}{/snippet}
      {#snippet overlay()}
      {#if searching}
        <div bind:this={searchViewport} id={resultsId} data-catalog-search-scroll data-has-query={Boolean(query.trim())}>{@render searchResults()}</div>
      {/if}
      {/snippet}
    </Place>
    {@render panels?.()}
    </AdaptiveSurfaceLayout>
    <div data-catalog-search-material data-active={searching} aria-hidden="true"></div>
    <CatalogEdgeNavigation {searching} {detail} {onback} {viewport} />
  </Sidebar.Provider>
</div>

<style>
  :global([data-catalog-workspace] [data-adaptive-host]) { position:absolute; inset:0; }
</style>
```

## src/svelte/explorer/CatalogNavigation.svelte

Source SHA-256: dc960791e30f129049bc77307470264088bd40d95e723ba8429d35658ae1a0d7

```svelte
<script lang="ts" generics="Destination extends string">
  import { untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Backpack from "@lucide/svelte/icons/backpack";
  import PanelsTopLeft from "@lucide/svelte/icons/panels-top-left";
  import Settings from "@lucide/svelte/icons/settings";
  import { Button } from "../vendor/components/ui/button/index.js";
  import { swipeMotion } from "../pieces/swipe-motion.svelte.js";
  import Place from "../pieces/Place.svelte";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import { actionIcons } from "../pieces/action-icons.ts";
  import { workspaceNavigation, type WorkspaceDestination } from "./workspace-navigation.ts";
  let { productName, navigation, active, onnavigate, searching = false }: {
    productName: string;
    navigation: readonly WorkspaceDestination<Destination>[]; active: Destination;
    onnavigate: (id: Destination) => void; searching?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const motion = swipeMotion({ edge: () => "left", enabled: () => sidebar.expanded,
    commit: () => sidebar.presentation === "overlay" ? sidebar.setOverlayOpen(false) : sidebar.setOpen(false) });
  $effect(() => { sidebar.dismissOffset = motion.offset; });
  $effect(() => { if (sidebar.expanded) untrack(() => motion.reset()); });
  const icons = { ...actionIcons, landmark: Landmark, backpack: Backpack, panels: PanelsTopLeft };
  let groups = $derived(workspaceNavigation(navigation));
  function navigate(id: Destination) { onnavigate(id); if (sidebar.presentation === "overlay") sidebar.setOverlayOpen(false); }
  function startHeaderDrag(event: PointerEvent) {
    if (event.target instanceof Element && event.target.closest('button,a,input,select,textarea')) return;
    motion.down(event);
  }
</script>

<Place data-renderer-profile="apple-reference" data-catalog-navigation
  viewportAttributes={{ 'data-slot': 'sidebar-content' }}>
  {#snippet top()}
  <ToolbarLayout class="sidebar-toolbar" data-slot="sidebar-header" data-navigation-drag role="presentation" onpointerdown={startHeaderDrag} onpointermove={motion.move}
    onpointerup={motion.up} onpointercancel={motion.cancel} onlostpointercapture={motion.lost}>
    <span data-product-name>{productName}</span>
    <Sidebar.Trigger variant="secondary" size="icon" aria-label="Hide navigation" title="Hide navigation" inert={searching} aria-hidden={searching} />
  </ToolbarLayout>
  {/snippet}
  {#snippet content()}
    <nav aria-label="Main navigation">
      {#each groups as group (group.label)}
      <Sidebar.Group aria-label={group.label}>
        <Sidebar.GroupLabel>{group.label}</Sidebar.GroupLabel>
        <Sidebar.GroupContent><Sidebar.Menu>
        {#each group.items as destination (destination.id)}
          {@const Icon = icons[destination.icon]}
          <Sidebar.MenuItem>
            <Sidebar.MenuButton isActive={destination.id === active} aria-current={destination.id === active ? "page" : undefined}
              aria-label={destination.label} onclick={() => navigate(destination.id)}>
              <span data-navigation-icon={destination.appearance} aria-hidden="true"><Icon /></span>
              <span>{destination.label}</span>
            </Sidebar.MenuButton>
          </Sidebar.MenuItem>
        {/each}
      </Sidebar.Menu></Sidebar.GroupContent></Sidebar.Group>
      {/each}
    </nav>
  {/snippet}
  {#snippet bottom()}
  <ToolbarLayout class="sidebar-toolbar" data-slot="sidebar-footer" edge="bottom">
    <Button variant="secondary" size="icon" aria-label="Settings" title="Settings — not available in this preview" disabled>
      <Settings aria-hidden="true" />
    </Button>
  </ToolbarLayout>
  {/snippet}
</Place>
```

## src/svelte/explorer/CatalogNavigationActions.svelte

Source SHA-256: 4f79c5b5b0d110f84747848ba4a817d904ec8232be5d4a27229c177c35bef473

```svelte
<script lang="ts">
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import BankRenderer from "../BankRenderer.svelte";
  import type { ToolbarAction } from "../../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  let { detail = false, onback, topActions = [], invoke }: {
    detail?: boolean; onback?: () => void;
    topActions?: readonly ToolbarAction[]; invoke?: (intent: SurfaceIntent) => void;
  } = $props();
  const sidebar = Sidebar.useSidebar();
</script>

<div data-catalog-navigation-actions>
  {#if !sidebar.expanded}
    <Sidebar.Trigger variant="secondary" size="icon" aria-label="Show navigation" title="Show navigation" />
  {/if}
  {#if detail && onback}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", role: "secondary", action: {
      intent: { kind: "catalog.back" }, label: "Back", icon: "back", state: "ready",
    } }} onevent={event => { if (event.kind === "catalog.back") onback?.(); }} />
  {/if}
  {#each topActions as action}
    <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action, role: "secondary" }}
      onevent={event => { if (event.kind === "surface.invoke") invoke?.(event.intent); }} />
  {/each}
</div>
```

## src/svelte/explorer/CatalogToolbar.svelte

Source SHA-256: 0cb7da1c2091556c30e9c61fe6f524aca1808766cc82a539d584f2b83882f53c

```svelte
<script lang="ts">
  import { tick, untrack } from "svelte";
  import * as Sidebar from "@desert/svelte/vendor/components/ui/sidebar/index.js";
  import * as Field from "@desert/svelte/vendor/components/ui/field/index.js";
  import { Button } from "@desert/svelte/vendor/components/ui/button/index.js";
  import ToolbarLayout from "../pieces/ToolbarLayout.svelte";
  import SearchField from "../pieces/SearchField.svelte";
  import Search from "@lucide/svelte/icons/search";
  import X from "@lucide/svelte/icons/x";
  let { title, query, onquery, searching, resultsId, onsearch, oncancel, searchAvailable = true }: {
    title: string; query: string; onquery: (query: string) => void; searching: boolean;
    resultsId: string; onsearch: () => void; oncancel: () => void; searchAvailable?: boolean;
  } = $props();
  const sidebar = Sidebar.useSidebar();
  const id = $props.id();
  let input = $state<HTMLInputElement | null>(null);
  let toggleButton = $state<HTMLButtonElement | null>(null);
  // Product cancellation may clear its query immediately. Retain only the
  // outgoing field's paint until the next opening; no stale search is executed.
  let displayedQuery = $state(untrack(() => query));
  $effect(() => { if (searching) displayedQuery = query; });
  async function toggle() {
    if (searching) { oncancel(); return; }
    onsearch(); await tick(); input?.focus({ preventScroll: true });
  }
</script>

{#snippet searchActions()}
  <div data-catalog-search-actions data-expanded={searching}>
  <Field.Field data-catalog-search inert={!searching} aria-hidden={!searching}>
    <Field.Label class="sr-only" for={id}>Search {title.toLowerCase()}</Field.Label>
    <SearchField {id} bind:ref={input} value={displayedQuery} onvalue={onquery} placeholder={`Search in ${title}`}
      aria-controls={searching ? resultsId : undefined} tabindex={searching ? undefined : -1} />
  </Field.Field>
  <Button bind:ref={toggleButton} variant="secondary" size="icon" data-catalog-search-toggle data-catalog-search-cancel={searching || undefined}
    aria-label={searching ? "Close search" : "Search"} title={searching ? "Close search" : "Search"}
    aria-expanded={searching} aria-controls={searching ? resultsId : undefined} onclick={toggle}>
    <Search data-search-icon="open" aria-hidden="true" /><X data-search-icon="close" aria-hidden="true" />
  </Button>
  </div>
{/snippet}

<!-- Search stays mounted when its edge changes, preserving composition and focus. -->
{#if searchAvailable}
<ToolbarLayout data-catalog-toolbar
  data-searching={searching} edge={sidebar.presentation === "overlay" ? "bottom" : "top"}>
  {@render searchActions()}
</ToolbarLayout>
{/if}
```

## src/svelte/explorer/workspace-navigation.ts

Source SHA-256: 7ae004adf54089eb39d984b86b6d52e148b70a8ee949ff86ccc26b7efabd901e

```ts
import type { ActionIcon } from "../../interaction/toolbar.ts";

/** Renderer-owned navigation data. No component, CSS or layout escape hatches. */
export type WorkspaceIcon = ActionIcon | "landmark" | "backpack" | "panels";
export interface WorkspaceDestination<Id extends string = string> {
  readonly id: Id;
  readonly label: string;
  readonly shortLabel?: string;
  readonly icon?: WorkspaceIcon;
  readonly group?: string;
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
  const groups: { label: string; items: ResolvedDestination<Id>[] }[] = [
    { label: "Explore", items: [] }, { label: "Developer", items: [] },
  ];
  for (const destination of navigation) {
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

## src/svelte/explorer/workspace-search.ts

Source SHA-256: 5f07832f9e2e5889e1f83e90ae9810d94e73857c419b50041d1a03f0170fdf15

```ts
import type { CatalogSearchResult } from "./catalog-search.ts";

/** Shared search rows. Providers own data and activation, never their appearance. */
export type WorkspaceSearchResult = CatalogSearchResult |
  { readonly kind: "content"; readonly id: string; readonly title: string; readonly description: string };
```

## src/svelte/views/ViewContent.svelte

Source SHA-256: 2569616610c1102ae777f80064a881df28db4a3ad6268279bd1df7c6978ba148

```svelte
<script lang="ts">
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import StackLayout from "../pieces/StackLayout.svelte";
  import InspectionContent from "./InspectionContent.svelte";
  import ViewItem from "./ViewItem.svelte";
  let { resolved, onevent }: {
    resolved: ResolvedView;
    onevent: (event: BankEvent) => void;
  } = $props();
  let bank = $state<{ revealEntry: (id: PrimitiveId) => Promise<HTMLElement | null> } | null>(null);
  export async function revealEntry(id: PrimitiveId) { return await bank?.revealEntry(id) ?? null; }
  let hasCatalog = $derived(resolved.view.content.some(item => item.kind === "visual-catalog"));
</script>

<div class:place-content={!hasCatalog} data-view-content={resolved.view.id}>
  {#each resolved.view.content as item, index (index)}
    {#if item.kind === "header"}
      <!-- The shared workspace owns the heading and its scroll-driven toolbar echo. -->
    {:else if item.kind === "stack"}
      <div data-view-item={item.id}>
      <StackLayout title={item.title} description={item.description}>
        {#each item.items as child, childIndex (childIndex)}<ViewItem item={child} {resolved} {onevent} />{/each}
      </StackLayout>
      </div>
    {:else if item.kind === "visual-catalog"}
      <InspectionContent bind:this={bank} />
    {:else}<ViewItem {item} {resolved} {onevent} />{/if}
  {/each}
</div>
```

## src/svelte/views/ViewItem.svelte

Source SHA-256: 8a18eeaa77690b154969e44344ae5744203b1801ffbee823ccdf2d655ab99d0a

```svelte
<script lang="ts">
  import type { ViewItem } from "../../views/schema.ts";
  import type { ResolvedView } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { controlBankNode } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import Information from "../pieces/Information.svelte";
  import StackItem from "../pieces/StackItem.svelte";
  let { item, resolved, onevent }: {
    item: ViewItem; resolved: ResolvedView; onevent: (event: BankEvent) => void;
  } = $props();
  function dispatch(event: BankEvent) {
    if (item.kind === "collection" && event.kind === "collection.select") {
      if (!resolved.disabledOutputs.includes(item.output)) onevent({ kind: "surface.invoke", intent: {
        kind: "view.output", view: resolved.view.id, output: item.output, recordId: event.id,
      } });
    } else onevent(event);
  }
  function binding() {
    if (!("input" in item)) throw new Error("VIEW_INPUT_REQUIRED");
    const node = resolved.bindings[item.input];
    if (!node || node.kind !== item.kind) throw new Error("INVALID_VIEW_INPUT_BINDING");
    return node;
  }
</script>

{#if item.kind === "text"}
  <div data-stack-item data-stack-placement="content"><Information items={[item]} /></div>
{:else if item.kind === "fact"}
  <Information items={[item]} />
{:else if item.kind === "tag" || item.kind === "image" || item.kind === "avatar"}
  {@const node = controlBankNode(item)}
  <StackItem kind={node.kind}><BankRenderer {node} /></StackItem>
{:else}
  {@const node = binding()}
  <StackItem kind={node.kind}><BankRenderer {node} onevent={dispatch} /></StackItem>
{/if}
```

## src/svelte/views/Panel.svelte

Source SHA-256: 9e7fb9ee171266a67163654e4c6da285a881753bd138a4028dcb73553a1e5610

```svelte
<script lang="ts">
  import { tick, untrack } from "svelte";
  import type { ResolvedPanel } from "../../views/resolved.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  let { panel, onevent }: { panel?: ResolvedPanel | null; onevent: (event: BankEvent) => void } = $props();
  let mounted = $state.raw<ResolvedPanel | null>(null);
  let open = $state(false);
  let revision = 0;
  $effect(() => {
    const next = panel;
    const current = ++revision;
    untrack(() => {
      if (next) {
        const firstMount = mounted === null;
        mounted = next;
        // The shared Drawer must observe closed → open, just like the stable
        // retained bank specimen. Do not mount it already at its final state.
        if (firstMount) void tick().then(() => { if (revision === current) open = true; });
        else open = true;
      }
      else open = false;
    });
  });
  function dispatch(event: BankEvent) {
    if (event.kind === "transient.closed" && !panel) mounted = null;
    onevent(event);
  }
</script>

{#if mounted}
  <BankRenderer node={{ version: BankVersion, kind: "transient", label: mounted.label,
    frame: mounted.frame, locked: mounted.locked, open }} onevent={dispatch} />
{/if}
```

## src/svelte/views/InspectionContent.svelte

Source SHA-256: a87df7e78368b62dc843b29269dcd320f202eebf51dcb5e8aea7bc50059b183d

```svelte
<script lang="ts">
  import { tick } from "svelte";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import type { PrimitiveId } from "../../interaction/catalog.ts";
  import type { PublicBankInput } from "../explorer/PublicCatalogBank-model.ts";
  import PublicCatalogBank from "../explorer/PublicCatalogBank.svelte";
  import RetainedPlace from "../explorer/RetainedPlace.svelte";
  import BankRenderer from "../BankRenderer.svelte";
  import Toolbar from "../pieces/Toolbar.svelte";
  import { inspectionCatalog } from "../catalog/inspection-fixture.ts";

  let { catalog = inspectionCatalog, query = $bindable("") }: {
    catalog?: PublicBankInput; query?: string;
  } = $props();
  let bank: PublicCatalogBank | undefined = $state();
  let selected = $state<string | null>(null);
  let detail = $derived(catalog.details.find(item => item.record === selected));
  let opener: HTMLElement | null = null;
  async function back() {
    selected = null;
    await tick();
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  }
  function interact(event: BankEvent) {
    if (event.kind === "catalog.open") {
      if (!catalog.details.some(item => item.record === event.record)) throw new Error("UNKNOWN_INSPECTION_RECORD");
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      selected = event.record;
    } else if (event.kind === "catalog.back") void back();
    else if (event.kind === "catalog.search") { query = event.query; selected = null; }
  }
  export async function revealEntry(id: PrimitiveId): Promise<HTMLElement | null> {
    selected = null;
    await tick();
    return bank?.revealEntry(id) ?? null;
  }
</script>

<RetainedPlace active={!detail}>
  <PublicCatalogBank bind:this={bank} surface={catalog} oncatalog={interact} bodyOnly bind:query />
</RetainedPlace>
{#if detail}
  <Toolbar toolbar={{ edge: "top", title: detail.title, subtitle: "Local renderer example", leading: {
    intent: { kind: "back" }, icon: "back", label: "Back to visual catalog", state: "ready",
  } }} invoke={() => void back()} />
  <BankRenderer node={detail} onevent={interact} />
{/if}
```

## src/svelte/catalog/inspection-fixture.ts

Source SHA-256: b43e7bd1b23c5bf989edcb7505610804b1607ba87f6a38e9f93b76e7280f1c2f

```ts
import { freezeDeep } from "../../json.ts";
import { BankVersion as version } from "../../interaction/bank-node.ts";
import type { PublicBankInput } from "../explorer/PublicCatalogBank-model.ts";
import { inspectionMedia } from "./inspection-media.ts";

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

## src/svelte/catalog/inspection-media.ts

Source SHA-256: 82b252301725837a1bc4b0d9d392e6fe12fa5496a8cc00d54dbe000cd1840c59

```ts
/** One SDK-authored original, copied to the catalog's logical-media namespace at build time. */
export const inspectionMedia = Object.freeze({
  asset: "desert-bank-notebook.svg", source: "bank-image.svg", alt: "An open notebook with blue pages",
});
```

## src/svelte/HumanProduct.svelte

Source SHA-256: 1e5d07eb24529182eb60051a9281475e6ddefc7d75658a03ec6d5e3951d9c89d

```svelte
<script lang="ts">
  import { onMount, untrack, tick } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import { humanProduct } from "../web/client/model.ts";
  import { readPresentation } from "../web/client/presentation.ts";
  import SurfaceHost from "./SurfaceHost.svelte";
  import ProductWorkspace from "./ProductWorkspace.svelte";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import KitchenSink from "./catalog/KitchenSink.svelte";
  import { requireCatalog } from "../interaction/catalog.ts";
  import FailureDialog from "./FailureDialog.svelte";
  import ToolbarLayout from "./pieces/ToolbarLayout.svelte";
  import AdaptiveSurfaceLayout from './pieces/AdaptiveSurfaceLayout.svelte';
  import "./theme.css";
let { surface, validateInput }: { surface: HumanSurface, validateInput: ValidateInput } = $props();
  const model = untrack(() => humanProduct(surface, validateInput));
  let viewState = $state.raw(model.snapshot());
  let catalog = $state(false);
  let workspace = $state<ReturnType<typeof ProductWorkspace>>();
  untrack(() => requireCatalog(surface.catalog));
  let read = $derived(readPresentation(surface));
  let reason = $derived(viewState.availability.journeys[read.id]?.blockers[0]?.reason);
  let connected = $derived(viewState.availability.journeys[read.id]?.dependenciesReady === true);
  let status = $derived(connected ? "Local controller ready" : reason === "session-required" ? "Local access required" :
    reason === "incompatible" ? "Contract mismatch" : reason === "unknown" ? "Connecting to local controller…" : "Local controller unavailable · draft kept");
  onMount(() => {
    catalog = new URLSearchParams(location.search).get("catalog") === "1";
    const unsubscribe = model.subscribe(value => { viewState = value; });
    const invitation = new URLSearchParams(location.hash.slice(1)).get("access");
    history.replaceState(null, "", location.pathname + location.search);
    void model.start(invitation ?? undefined);
    const protectDraft = (event: BeforeUnloadEvent) => {
      if (Object.values(viewState.draft).some(Boolean) || viewState.prepared) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", protectDraft);
    return () => { unsubscribe(); model.stop(); window.removeEventListener("beforeunload", protectDraft); };
  });
</script>

<svelte:head><title>{surface.productId} · DESERT</title></svelte:head>
{#if catalog}
  <KitchenSink {surface} {validateInput} back={() => { catalog = false; history.replaceState(null, "", "/"); }} />
{:else}
<AdaptiveSurfaceLayout>
<div class="product">
  <ToolbarLayout class="topbar"><div class="brand"><span aria-hidden="true" class="brand-mark">{surface.productId.slice(0,1).toUpperCase()}</span><h1>{surface.productId}</h1></div>
    <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
      intent: { kind: "catalog", open: true }, icon: "catalog", label: "Renderer catalog", state: viewState.busy || viewState.uncertain ? "unavailable" : "ready" } }}
      onevent={() => { if (viewState.busy || viewState.uncertain) return; catalog = true; history.replaceState(null, "", "?catalog=1"); }} /></ToolbarLayout>
  <div class="connection">
    <BankRenderer node={{ version: BankVersion, kind: "availability", state: connected ? "ready" : reason === "unknown" ? "unknown" : "unavailable", label: status }} />
    <span class="saved-feedback" role="status">{viewState.notice}</span>
  </div>
  <ProductWorkspace bind:this={workspace} {surface} state={viewState} {model} {validateInput} {connected} />
</div>
<SurfaceHost {surface} state={viewState} {model} {validateInput} {status}
  afterClose={() => { void tick().then(() => workspace?.settleFocus()); }}
  connection={connected ? "ready" : reason === "unknown" ? "unknown" : "unavailable"} />
<FailureDialog code={viewState.error} uncertain={viewState.uncertain} close={model.dismissError} />
</AdaptiveSurfaceLayout>
{/if}
```

## src/svelte/ProductWorkspace.svelte

Source SHA-256: 7fa4ed899f62ef196bab7ee3c74764fb9cfadaeb764c36459dffc68a0ea3727a

```svelte
<script lang="ts">
  import { tick } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import type { HumanState } from "../web/client/state.ts";
  import type { humanProduct } from "../web/client/model.ts";
  import { readPresentation, mutationPresentation } from "../web/client/presentation.ts";
  import { presentFrame } from "../web/client/frame.ts";
  import { toolbarAction } from "../interaction/toolbar.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { surfaceFrame } from "../interaction/surface-frame.ts";
  import { presentCollection } from "../interaction/bank-presenters.ts";
  import SurfaceFrame from "./SurfaceFrame.svelte";
  let { surface, state: current, model, validateInput, connected }: {
    surface: HumanSurface; state: HumanState; model: ReturnType<typeof humanProduct>;
    validateInput: ValidateInput; connected: boolean;
  } = $props();
  let read = $derived(readPresentation(surface));
  let selected = $derived(current.selectedId !== null && (current.view === "detail" ||
    (current.view === "create" && current.creationOrigin === "detail") ||
    ((current.view === "review" || current.view === "recovery") &&
      (current.mutationId !== model.primary.id || current.creationOrigin === "detail"))));
  let frame = $derived(presentFrame(surface, { ...current, view: "detail" }, validateInput));
  let pane = $state<HTMLDivElement>();
  let collection = $state<HTMLElement>();
  let opener: HTMLElement | null = null;
  let journeyOpener: HTMLElement | null = null;
  export function settleFocus() {
    if (current.view === "detail" && pane) {
      if (journeyOpener && pane.contains(journeyOpener) && !journeyOpener.matches(":disabled")) journeyOpener.focus({ preventScroll: true });
      else pane.querySelector<HTMLElement>("[data-surface-frame]")?.focus({ preventScroll: true });
    }
    journeyOpener = null;
  }
  async function select(id: string) {
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    await model.select(id);
    await tick();
    if (current.view === "detail" && current.selectedId === id) pane?.querySelector<HTMLElement>("[data-surface-frame]")?.focus();
  }
  function invoke(intent: SurfaceIntent) {
    if (intent.kind === "back") {
      model.back();
      void tick().then(() => {
        if (opener?.isConnected && opener.getClientRects().length && !opener.matches(":disabled")) opener.focus();
        else collection?.querySelector<HTMLInputElement>("[data-collection-search] input")?.focus();
      });
    } else if (intent.kind === "journey" && current.selectedId) {
      journeyOpener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      void model.invoke(mutationPresentation(surface, intent.journey), current.selectedId);
    }
  }
</script>
<main class="reading-layout" data-selected={selected}>
  <section bind:this={collection} data-collection-pane aria-label={surface.language.journeys[read.id]}>
    <div class="collection-heading"><h2>{surface.language.journeys[read.id]}</h2>
      {#if current.loaded}<span class="type-support text-muted-foreground">{current.records.length}</span>{/if}</div>
    <div class="collection-heading"><BankRenderer node={{ version: BankVersion, kind: "action", role: "primary",
      action: toolbarAction({ kind: "journey", journey: model.primary.id }, surface.language.journeys[model.primary.id]!, "create",
        !!current.availability.journeys[model.primary.id]?.dependenciesReady && !current.busy && !current.uncertain) }} onevent={model.create} /></div>
    <BankRenderer node={presentCollection(surface, current.records, { loaded: current.loaded,
      selectedId: selected ? current.selectedId : null, disabled: !connected || current.busy || current.uncertain })}
      onevent={event => { if (event.kind === "collection.select") void select(event.id); }} />
  </section>
  {#if selected}
    <div class="reading-pane" bind:this={pane}>
      <SurfaceFrame frame={surfaceFrame({ ...frame, top: { ...frame.top, leading: toolbarAction({ kind: "back" }, "Back", "back", !current.busy) } })} {invoke} />
    </div>
  {/if}
</main>
```

## src/svelte/Collection.svelte

Source SHA-256: bf267ec0de572a64d4713615801cd72c71da71c33cdad589eba8ddbdfa21eb3f

```svelte
<script lang="ts">
  import type { BankNodeFor } from "../interaction/bank-node.ts";
  import { presentFact, presentTitle } from "../interaction/fact-presentation.ts";
  import GroupedPanel from "./pieces/GroupedPanel.svelte";
  import * as Field from "./vendor/components/ui/field/index.js";
  import * as Empty from "./vendor/components/ui/empty/index.js";
  import { Button } from "./vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import CollectionState from "./pieces/CollectionState.svelte";
  import SearchField from "./pieces/SearchField.svelte";
  import { retrieveCollection } from "./collection-retrieval.ts";
  let { node, select }: { node: BankNodeFor<"collection">; select: (id: string) => void } = $props();
  let { records, disabled, loaded, selectedId } = $derived(node);
  let query = $state("");
  const searchId = $props.id();
  let visibleRecords = $derived(retrieveCollection(records, node.fields, query));
  let fieldLabels = $derived(node.fields.map(field => node.labels[`${node.object}.${field}`] ?? field));
</script>
<Field.FieldGroup data-collection-search class="mb-4">
  <Field.Field>
    <Field.Label class="sr-only" for={searchId}>Search loaded records</Field.Label>
    <SearchField id={searchId} bind:value={query} placeholder="Search loaded records"
      disabled={!loaded || records.length === 0} aria-describedby={`${searchId}-help`} />
    <Field.Description id={`${searchId}-help`}>Only loaded collection values are searched: {fieldLabels.join(", ")}.</Field.Description>
  </Field.Field>
</Field.FieldGroup>
<p class="mb-4 type-caption text-muted-foreground">Sorted by {fieldLabels[0]} · ascending</p>
{#if loaded && records.length > 0 && query.trim().length > 0}
  <p class="mb-4 type-caption text-muted-foreground" role="status" aria-live="polite">{visibleRecords.length} of {records.length} loaded records</p>
{/if}
{#if visibleRecords.length}<GroupedPanel>
<ul class="records" data-composition="collection" data-grouped-rows>
  {#each visibleRecords as record (record.id)}
    <li data-grouped-row>
      <Button variant="row" data-grouped-action class="record-button flex-col items-stretch justify-center gap-1.5 px-4 py-3 aria-[current=true]:bg-muted" onclick={() => select(record.id)} {disabled} aria-current={record.id === selectedId ? "true" : undefined}>
        <span data-record-heading><strong>{presentTitle(record.facts[node.fields[0]!])}</strong><ChevronRight data-icon="inline-end" data-control-chevron aria-hidden="true" /></span>
        {#if node.fields.length > 1}
          <span data-record-metadata>{#each node.fields.slice(1) as field}<span>{node.labels[`${node.object}.${field}`]} · {presentFact(record.facts[field])}</span>{/each}</span>
        {/if}
      </Button>
    </li>
  {/each}
</ul>
</GroupedPanel>{/if}
{#if !records.length}
  <CollectionState {loaded} createLabel={node.createLabel} />
{:else if !visibleRecords.length}
  <Empty.Root role="group" aria-label="Collection search results">
    <Empty.Header>
      <Empty.Title role="heading" aria-level={2}>No matching records.</Empty.Title>
      <Empty.Description>Try another search or clear it to show all loaded records.</Empty.Description>
    </Empty.Header>
  </Empty.Root>
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

## src/svelte/SurfaceHost.svelte

Source SHA-256: e772eac46b1dd400f681b88abf881b8bbd59f06ba4114c479b9cd96151d22e8a

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import type { HumanSurface, ValidateInput } from "../web/types.ts";
  import type { HumanState } from "../web/client/state.ts";
  import type { humanProduct } from "../web/client/model.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import { surfaceFrame } from "../interaction/surface-frame.ts";
  import type { BankEvent } from "../interaction/bank-events.ts";
  import { presentFrame } from "../web/client/frame.ts";
  import { mutationPresentation } from "../web/client/presentation.ts";
  import { dispatchSurfaceIntent, type SurfaceIntent } from "../interaction/intent.ts";
let { surface, state: current, model, validateInput, status, connection, afterClose }: {
    surface: HumanSurface; state: HumanState; model: ReturnType<typeof humanProduct>; validateInput: ValidateInput;
    status: string; connection: "ready" | "unknown" | "unavailable";
    afterClose?: () => void;
  } = $props();
  const identity = (value: HumanState) => value.view === "list" || value.view === "detail" ? null : value.view === "create" ||
    (value.mutationId === model.primary.id && (value.view === "review" || value.view === "recovery"))
      ? `journey:${model.primary.id}` : `journey:${value.mutationId}:${value.selectedId}`;
  let mounted = $state.raw<HumanState | null>(null);
  let key = $state<string | null>(null);
  let open = $state(false);
  $effect(() => {
    const next = identity(current);
    untrack(() => {
      if (key === next) { if (key) mounted = current; }
      else if (key) open = false;
      else if (next) { key = next; mounted = current; open = true; }
    });
  });
  function closed() {
    key = identity(current);
    // Presence completion can flush a child's derived frame before its branch
    // is destroyed. Keep that departing snapshot valid through teardown.
    if (key) mounted = current;
    open = !!key;
    if (!key) afterClose?.();
  }
  function invoke(intent: SurfaceIntent) {
    dispatchSurfaceIntent(intent, {
      back: model.back, close: model.close,
      recover: () => { void model.recover(); }, accept: () => { void model.accept(); },
      journey: id => { void model.invoke(mutationPresentation(surface, id), mounted?.view === "detail" ? mounted.selectedId! : undefined); },
    });
  }
  function dispatch(event: BankEvent) {
    if (event.kind === "surface.invoke") invoke(event.intent);
    else if (event.kind === "input.change") model.edit(event.name, event.value);
    else if (event.kind === "transient.close") model.close();
    else if (event.kind === "transient.closed") closed();
  }
</script>
{#if mounted && key}
  {#key key}
    {@const frame = presentFrame(surface, mounted, validateInput)}
    <BankRenderer node={{ version: BankVersion, kind: "transient", label: mounted.view === "detail" ? surface.language.journeys[surface.navigation.entry]! :
      surface.language.journeys[mounted.mutationId && mounted.view !== "create" ? mounted.mutationId : model.primary.id]!,
      open, locked: current.busy || current.uncertain,
      frame: surfaceFrame({ ...frame, top: { ...frame.top, availability: { state: connection, label: status } } }) }} onevent={dispatch} />
  {/key}
{/if}
```

## src/svelte/SurfaceFrame.svelte

Source SHA-256: b73c3d92482bcda8389213d07ba27f03347426e879876d7917f4b5d93df06b5c

```svelte
<script lang="ts">
  import { surfaceFrame, type SurfaceFrame } from "../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import FrameBody from "./FrameBody.svelte";
  import Toolbar from "./pieces/Toolbar.svelte";
  import ScrollEdges from "./pieces/ScrollEdges.svelte";
  import { provideSurfaceHost } from "./pieces/surface-host.svelte.ts";
let { frame, invoke, edit = () => {}, presentation = "standard" }: { frame: SurfaceFrame;
    presentation?: "standard" | "message" | "transient";
    invoke: (intent: SurfaceIntent) => void; edit?: ((name: string, value: string) => void) | undefined } = $props();
  let host = $state<HTMLElement | null>(null);
  let viewport = $state<HTMLDivElement | null>(null);
  provideSurfaceHost(() => host);
  let checked = $derived.by(() => {
    const value = surfaceFrame(frame);
    // A modal message may consolidate dismissal, never suppress task navigation.
    if (presentation === "message" && value.kind !== "message") throw new Error("INVALID_MESSAGE_PRESENTATION");
    return value;
  });
  function submit(event: SubmitEvent) {
    event.preventDefault();
    if (checked.content.kind !== "form") return;
    const action = checked.bottom.primary;
    if (action?.state === "ready") invoke(action.intent);
  }
</script>
{#snippet slots()}
  <Toolbar toolbar={{ edge: "top", ...checked.top }} {invoke} {presentation} />
  <div bind:this={viewport} class="surface-content min-h-0 flex-1 overflow-auto" data-surface-slot="content">
    <FrameBody content={checked.content} {invoke} {edit} messageDialog={presentation === "message"} />
  </div>
  {#if checked.bottom.primary || (checked.bottom.secondary && presentation !== "transient")}
    <Toolbar toolbar={{ edge: "bottom", ...checked.bottom }} {invoke} {presentation} submit={checked.content.kind === "form" ? checked.content.submit : undefined} />
  {/if}
  <ScrollEdges {viewport} owner={host} />
{/snippet}
<section bind:this={host} class="flex min-h-0 min-w-0 flex-1 flex-col" data-scroll-owner data-surface-host data-surface-frame={checked.version} data-frame-presentation={presentation} tabindex="-1"
  aria-label={checked.kind === "context" ? "Object context" : checked.kind === "journey" ? "Journey" : undefined}>
  {#if checked.content.kind === "form"}
    <form class="flex min-h-0 flex-1 flex-col" novalidate onsubmit={submit}>{@render slots()}</form>
  {:else}{@render slots()}{/if}
</section>
```

## src/interaction/surface-frame.ts

Source SHA-256: 8d2c274c09ab2759d265a6d5d9d8edca6cfbd69c6ec612c684aa69be074adb55

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { TopToolbarSchema, BottomToolbarSchema, ToolbarActionSchema, NavigationActionSchema,
  UtilityActionSchema, actionSchema } from "./toolbar.ts";
import { InformationSchema } from "./information-content.ts";
import { CloseIntentSchema, RecoverIntentSchema, intentKey, submitsJourney } from "./intent.ts";
export { ToolbarActionSchema, type ToolbarAction } from "./toolbar.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const DestinationSchema = object({ destination: text(), label: text(), available: Type.Boolean() });
export const FactsSchema = object({
  kind: Type.Literal("facts"), object: text(), fields: Type.Array(text()),
  facts: Type.Record(Type.String(), Type.Union([Type.String(), Type.Number()])),
  labels: Type.Record(Type.String(), Type.String()),
  multiline: Type.Optional(Type.Array(text(), { uniqueItems: true })),
});
export const FormSchema = object({
  kind: Type.Literal("form"), submit: text(),
  fields: Type.Array(object({ name: text(), label: text(), value: Type.String(), required: Type.Boolean(),
    error: Type.Optional(text()), maxLength: Type.Optional(Type.Integer({ minimum: 0 })),
    primitive: Type.Union([Type.Literal("input.text"), Type.Literal("input.multiline")]),
  })),
});
export const ContextSchema = object({ kind: Type.Literal("context"), details: FactsSchema, actions: Type.Array(DestinationSchema) });
export const ReviewSchema = object({ kind: Type.Literal("review"), details: FactsSchema, recovery: Type.Optional(text()) });
const MessageSchema = object({ kind: Type.Literal("message"), text: text() });
export const UtilitiesContentSchema = object({ kind: Type.Literal("utilities"), actions: Type.Array(UtilityActionSchema, { minItems: 1 }) });
const GeneralContentSchema = Type.Union([FactsSchema, FormSchema, ContextSchema, ReviewSchema, MessageSchema, InformationSchema]);
export const FrameContentSchema = Type.Union([GeneralContentSchema, UtilitiesContentSchema]);
export const SurfaceFrameVersion = "desert.surface-frame/6" as const;
const common = { version: Type.Literal(SurfaceFrameVersion), top: TopToolbarSchema };
const DismissActionSchema = actionSchema(CloseIntentSchema);
const MessageTopSchema = object({ ...TopToolbarSchema.properties, trailing: Type.Optional(Type.Array(Type.Never())) });
const ContextTopSchema = object({ ...TopToolbarSchema.properties,
  trailing: Type.Optional(Type.Array(actionSchema(RecoverIntentSchema))),
});
const DismissBottomSchema = object({ secondary: Type.Optional(DismissActionSchema), primary: Type.Optional(Type.Never()) });
export const SurfaceFrameSchema = Type.Union([
  object({ ...common, kind: Type.Literal("context"), top: ContextTopSchema,
    content: Type.Union([FactsSchema, ContextSchema, MessageSchema]),
    bottom: object({ secondary: Type.Optional(NavigationActionSchema), primary: Type.Optional(Type.Never()) }),
  }),
  object({ ...common, kind: Type.Literal("message"), top: MessageTopSchema, content: MessageSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("utilities"), top: MessageTopSchema, content: UtilitiesContentSchema, bottom: DismissBottomSchema }),
  object({ ...common, kind: Type.Literal("journey"), content: GeneralContentSchema, bottom: BottomToolbarSchema }),
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
  if (details && (new Set(details.fields).size !== details.fields.length ||
    details.multiline?.some(field => !details.fields.includes(field)))) throw new Error("INVALID_SURFACE_FRAME_FIELDS");
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
  const topIds = [snapshot.top.leading, ...(snapshot.top.trailing ?? [])]
    .filter(action => action !== undefined).map(action => intentKey(action.intent));
  if (new Set(ids).size !== ids.length || new Set(topIds).size !== topIds.length ||
    (snapshot.content.kind === "form" && !submitsJourney(snapshot.bottom.primary?.intent, snapshot.content.submit))) {
    throw new Error("INVALID_SURFACE_FRAME_ACTIONS");
  }
  return freezeDeep(snapshot);
}
```

## src/interaction/frame-presenters.ts

Source SHA-256: 0b1e9856cafd7ac1c87ea66e82da5be891c0cf5e7b54f88fde0a8a1f2d234ddc

```ts
import type { HumanSurface, Mutation } from "../web/types.ts";
import { deriveForm } from "./form.ts";
import { surfaceFrame, type SurfaceFrame } from "./surface-frame.ts";
import { toolbarAction, type BottomToolbar } from "./toolbar.ts";
import { presentFacts } from "./fact-presentation.ts";
import { reviewChanges } from "./review-changes.ts";
export { toolbarAction } from "./toolbar.ts";

export function formFrame(surface: HumanSurface, journey: Mutation, draft: Readonly<Record<string, string>>,
  bottom: BottomToolbar, errors: Readonly<Record<string, string>> = {}): SurfaceFrame {
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: surface.language.journeys[journey.id]! },
    content: { kind: "form", submit: journey.id, fields: deriveForm(journey, surface.inputs ?? {}).map(field => ({
      name: field.name, primitive: field.primitive, required: field.required,
      label: surface.language.fields[`${journey.object}.${field.name}`]!, value: draft[field.name] ?? "",
      ...(field.schema.maxLength !== undefined ? { maxLength: field.schema.maxLength } : {}),
      ...(Object.hasOwn(errors, field.name) ? { error: errors[field.name] } : {}),
    })) }, bottom,
  });
}

export function reviewFrame(surface: HumanSurface, mutation: Mutation, facts: Readonly<Record<string, string | number>>,
  uncertain: boolean, busy: boolean, ready: boolean,
  feedback: { pendingAction?: "invoke" | "accept" | "recover" | null, receiptMissing?: boolean,
    previous?: Readonly<Record<string, string | number>> } = {}): SurfaceFrame {
  const label = surface.language.journeys[mutation.id]!;
  const pending = feedback.pendingAction === undefined ? (busy ? "accept" : null) : feedback.pendingAction;
  const changes = reviewChanges(surface, mutation, facts, feedback.previous);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "journey",
    top: { title: uncertain ? "Check result" : `Review · ${label}`,
      subtitle: uncertain ? "Recover the result of this operation." : changes.summary,
      ...(uncertain ? { trailing: [{ ...toolbarAction({ kind: "recover" }, "Check result", "recover", ready && !busy),
        ...(busy && pending === "recover" ? { state: "pending" as const } : {}) }] } : {}) },
    content: { kind: "review", details: presentFacts(surface, mutation.object, changes.fields, facts),
      ...(uncertain ? { recovery: feedback.receiptMissing
        ? "No saved result was found for this confirmation. Check again or retry this same confirmation."
        : "The result needs confirmation. Recovery checks this operation; it does not create another one." } : {}) },
    bottom: { ...(!uncertain ? { secondary: toolbarAction({ kind: "back" }, "Back", "back", !busy) } : {}),
      primary: { ...toolbarAction({ kind: "accept" }, uncertain ? "Retry same confirmation" : label, uncertain ? "retry" : "confirm", ready),
        state: busy && pending === "accept" ? "pending" : !busy && ready ? "ready" : "unavailable" } },
  });
}
```

## src/interaction/fact-presentation.ts

Source SHA-256: 9b5602e379112eeceb98510b6596f4186b80118d4630276fe4ac33bdfcbea119

```ts
import type { HumanSurface } from "../web/types.ts";
import type { FactsContent } from "./surface-frame.ts";

type FactValue = string | number | null | undefined;
const blank = (value: FactValue) => typeof value === "string" && value.trim().length === 0;
/** Bridge absent fact keys and information's null sentinel only at presentation. */
export const factState = (value: FactValue) => value == null ? "unknown" : blank(value) ? "empty" : "known";
/** Presentation fallbacks never normalize, validate or rewrite the stored value. */
export const presentFact = (value: FactValue) => {
  const state = factState(value);
  return state === "unknown" ? "Unknown" : state === "empty" ? "Empty" : String(value);
};
export const presentTitle = (value: string | number | undefined) => value === undefined ? "Unknown" : blank(value) ? "Untitled" : String(value);

/** The field's declared multiline need owns both editing and reading, without name heuristics. */
export function presentFacts(surface: HumanSurface, object: string, fields: readonly string[],
  facts: Readonly<Record<string, string | number>>): FactsContent {
  return { kind: "facts", object, fields, labels: surface.language.fields,
    facts: Object.fromEntries(fields.filter(field => Object.hasOwn(facts, field)).map(field => [field, facts[field]!])),
    multiline: fields.filter(field => surface.inputs?.[`${object}.${field}`] === "input.multiline"),
  };
}
```

## src/interaction/review-changes.ts

Source SHA-256: e74571c0aa53ebc21b158f13130c7160ff6900ac43328a3a865f257f5beb449c

```ts
import type { HumanSurface, Mutation } from "../web/types.ts";
import { presentFact } from "./fact-presentation.ts";

type Facts = Readonly<Record<string, string | number>>;
/** Compare only exposed facts with an exact-version baseline supplied by the presenter. */
export function reviewChanges(surface: HumanSurface, mutation: Mutation, facts: Facts, previous?: Facts) {
  if (!mutation.reviewFields) throw new Error("UNSUPPORTED_REVIEW_PROJECTION");
  const changed = mutation.reviewFields.filter(field => previous && Object.hasOwn(previous, field) &&
    Object.hasOwn(facts, field) && previous[field] !== facts[field]);
  let summary = "Review the resulting record before confirming.";
  if (changed.length) {
    const field = changed[0]!;
    const concise = `${surface.language.fields[`${mutation.object}.${field}`]}: ${presentFact(previous![field])} → ${presentFact(facts[field])}`;
    summary = changed.length === 1 && concise.length <= 64 && !concise.includes("\n") ? concise :
      `${changed.length} ${changed.length === 1 ? "field will change. Review the updated value" : "fields will change. Review the updated values"} first.`;
  }
  return { summary, fields: [...changed, ...mutation.reviewFields.filter(field => !changed.includes(field))] };
}
```

## src/web/client/frame.ts

Source SHA-256: 55b9a7f6ccd6a932941643aabfcb31e2185ec236709c8ef0003472e83e6a55e2

```ts
import type { HumanSurface, ValidateInput } from "../types.ts";
import type { HumanState } from "./state.ts";
import { readPresentation, mutationPresentation } from "./presentation.ts";
import { formFrame, reviewFrame, toolbarAction } from "../../interaction/frame-presenters.ts";
import { surfaceFrame } from "../../interaction/surface-frame.ts";
import { fieldFeedback } from "./field-feedback.ts";
import { presentFacts, presentTitle } from "../../interaction/fact-presentation.ts";

export function presentFrame(surface: HumanSurface, state: HumanState, validate: ValidateInput) {
  const ready = (id: string) => state.availability.journeys[id]?.dependenciesReady === true;
  if (state.view === "create") {
    const primary = mutationPresentation(surface, surface.navigation.primaryAction);
    const label = surface.commit[primary.id] === "review" ? "Review" : surface.language.journeys[primary.id]!;
    const validation = validate.inspect?.(primary.commandId, state.draft) ??
      { valid: validate(primary.commandId, state.draft), issues: [] };
    return formFrame(surface, primary, state.draft, { secondary: toolbarAction({ kind: "back" }, "Back", "back", !state.busy), primary: {
      ...toolbarAction({ kind: "journey", journey: primary.id }, label, surface.commit[primary.id] === "review" ? "review" : "save", ready(primary.id) && validation.valid),
      ...(state.busy ? { state: "pending" as const } : {}),
    }}, fieldFeedback(validation, state.touchedFields));
  }
  if ((state.view === "review" || state.view === "recovery") && state.prepared && state.mutationId) {
    const mutation = mutationPresentation(surface, state.mutationId);
    const previous = state.detail?.id === state.prepared.object.id && state.detail.version === state.prepared.object.expectedVersion &&
      readPresentation(surface).subject === mutation.object ? state.detail.facts : undefined;
    return reviewFrame(surface, mutation, state.prepared.facts, state.uncertain, state.busy, ready(mutation.id),
      { pendingAction: state.pendingAction, receiptMissing: state.receiptMissing, ...(previous ? { previous } : {}) });
  }
  const read = readPresentation(surface);
  return surfaceFrame({ version: "desert.surface-frame/6", kind: "context",
    top: { title: state.detail ? presentTitle(state.detail.facts[read.collection[0]!]) : surface.language.journeys[read.id]! },
    content: state.detail ? { kind: "context", details: presentFacts(surface, read.subject,
      read.fields.filter(field => field !== read.collection[0]), state.detail.facts),
      actions: surface.navigation.subjectActions.map(id => ({ destination: id, label: surface.language.journeys[id]!,
        available: !state.busy && ready(id) && state.offers[id]?.eligible === true })) }
      : { kind: "message", text: ready(read.id) ? "Loading…" : "Waiting for the local controller." },
    bottom: {},
  });
}
```

## src/svelte/FrameBody.svelte

Source SHA-256: c24a55e8875bfa30dc359f9ca38ac53d7ddec1c25d5c3dcab0bc23b249f9b3b4

```svelte
<script lang="ts">
  import type { FrameContent } from "../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../interaction/intent.ts";
  import type { BankEvent } from "../interaction/bank-events.ts";
  import { BankVersion } from "../interaction/bank-node.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import Information from "./pieces/Information.svelte";
  import MessageBody from "./pieces/MessageBody.svelte";
  let { content, invoke, edit, messageDialog = false }: { content: FrameContent; messageDialog?: boolean;
    invoke: (intent: SurfaceIntent) => void; edit: (name: string, value: string) => void;
  } = $props();
  function dispatch(event: BankEvent) {
    if (event.kind === "input.change") edit(event.name, event.value);
    else if (event.kind === "surface.invoke") invoke(event.intent);
  }
</script>
{#if content.kind === "form"}
  <BankRenderer node={{ version: BankVersion, kind: "form", content }} onevent={dispatch} />
{:else if content.kind === "context"}
  <BankRenderer node={{ version: BankVersion, kind: "context", content }} onevent={dispatch} />
{:else if content.kind === "facts"}
  <BankRenderer node={{ version: BankVersion, kind: "fact", details: content }} />
{:else if content.kind === "review"}
  <BankRenderer node={{ version: BankVersion, kind: "review", content }} />
{:else if content.kind === "information"}
  <Information items={content.items} />
{:else if content.kind === "utilities"}
  <div class="flex min-w-0 flex-col gap-3" data-utility-actions>
    {#each content.actions as action}
      <BankRenderer node={{ version: BankVersion, kind: "action", action, role: "secondary" }} onevent={dispatch} />
    {/each}
  </div>
{:else}
  <MessageBody {content} {messageDialog} />
{/if}
```

## src/interaction/toolbar.ts

Source SHA-256: ecb44379e190bfd27f61432ba376c0e1a6fcfe1ce89046e8f03aeb5d0742eb1c

```ts
import { Type, type Static, type TProperties, type TSchema } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { SurfaceIntentSchema, ProductSurfaceIntentSchema, CloseIntentSchema, BackIntentSchema,
  JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema,
  NavigationToggleIntentSchema, type SurfaceIntent } from "./intent.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
export const ActionIconSchema = Type.Union([
  Type.Literal("back"), Type.Literal("close"), Type.Literal("save"), Type.Literal("review"),
  Type.Literal("recover"), Type.Literal("retry"), Type.Literal("create"), Type.Literal("archive"),
  Type.Literal("catalog"), Type.Literal("open"), Type.Literal("confirm"), Type.Literal("search"), Type.Literal("more"),
  Type.Literal("navigation"),
]);
export const actionSchema = <T extends TSchema>(intent: T) => object({
  intent, label: text(), icon: ActionIconSchema,
  state: Type.Union([Type.Literal("ready"), Type.Literal("unavailable"), Type.Literal("pending")]),
});
export const ToolbarActionSchema = actionSchema(SurfaceIntentSchema);
export const NavigationActionSchema = actionSchema(Type.Union([CloseIntentSchema, BackIntentSchema, NavigationToggleIntentSchema]));
export const UtilityActionSchema = actionSchema(Type.Union([JourneyIntentSchema, AcceptIntentSchema, RecoverIntentSchema, ViewOutputIntentSchema]));
export const TopToolbarSchema = object({
  title: text(), subtitle: Type.Optional(text()),
  face: Type.Optional(FaceSchema),
  leading: Type.Optional(NavigationActionSchema), trailing: Type.Optional(Type.Array(UtilityActionSchema)),
  availability: Type.Optional(object({
    state: Type.Union([Type.Literal("ready"), Type.Literal("unknown"), Type.Literal("unavailable")]), label: text(),
  })),
});
export const BottomToolbarSchema = object({
  secondary: Type.Optional(actionSchema(ProductSurfaceIntentSchema)), primary: Type.Optional(UtilityActionSchema),
});
export type ActionIcon = Static<typeof ActionIconSchema>;
export type ToolbarAction = Frozen<Static<typeof ToolbarActionSchema>>;
export type TopToolbar = Frozen<Static<typeof TopToolbarSchema>>;
export type BottomToolbar = Frozen<Static<typeof BottomToolbarSchema>>;
export type Toolbar = ({ readonly edge: "top" } & TopToolbar) |
  { readonly edge: "bottom"; readonly secondary?: ToolbarAction; readonly primary?: ToolbarAction };

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

Source SHA-256: b1a6f4cd31857311155aefeb9b5cb7afea5ddef47d45840f5cee5127096abc7d

```ts
import { Type, type Static } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";

export const FaceSchema = Type.Union([
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

Source SHA-256: ee8d888fb4744201e7361a5bd90adbfe7a7eef8e16991cc1186555657e4dd3e6

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import { Check } from "@sinclair/typebox/value";
import { freezeDeep, jsonSnapshot, type Frozen } from "../json.ts";
import { InformationItemSchema } from "./information-content.ts";
import { ExtendedNodeSchemas, ExtendedEventSchemas } from "./extended-nodes.ts";
import { checkExtendedControl, changeExtendedControl } from "./extended-controls.ts";
import { SelectionOptionSchema } from "./selection-option.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
export const SelectNodeSchema = object({ ...base, kind: Type.Literal("select"), required: Type.Boolean(),
  value: Type.Union([Type.Null(), text()]), options: Type.Array(SelectionOptionSchema, { minItems: 1 }) });
export const PopoverNodeSchema = object({ ...base, kind: Type.Literal("popover"), open: Type.Boolean(), title: text(),
  locked: Type.Optional(Type.Boolean()), content: Type.Array(InformationItemSchema, { minItems: 1 }) });
export const FileMetadataSchema = object({ id: text(), name: text(), size: integer(),
  mediaType: Type.String(), lastModified: integer() });
export const FileNodeSchema = object({ ...base, kind: Type.Literal("files"),
  limits: object({ maxCount: integer(1), maxFileBytes: integer(1), maxTotalBytes: integer(1),
    accept: Type.Array(Type.String({ pattern: "^[a-z0-9!#$&^_.+-]+/([a-z0-9!#$&^_.+-]+|\\*)$" }), { uniqueItems: true }) }),
  files: Type.Array(FileMetadataSchema) });
export const ControlNodeSchema = Type.Union([SelectNodeSchema, PopoverNodeSchema, FileNodeSchema, ...ExtendedNodeSchemas]);
export type ControlNode = Frozen<Static<typeof ControlNodeSchema>>;
export type SelectNode = Extract<ControlNode, { kind: "select" }>;
export type PopoverNode = Extract<ControlNode, { kind: "popover" }>;
export type FileNode = Extract<ControlNode, { kind: "files" }>;
export type FileMetadata = Frozen<Static<typeof FileMetadataSchema>>;
export type FileRejection = { readonly file: FileMetadata; readonly reason: "media-type" | "file-size" | "total-size" | "count" };

export const ControlEventSchema = Type.Union([
  object({ kind: Type.Literal("select.change"), control: text(), value: Type.Union([text(), Type.Null()]) }),
  object({ kind: Type.Literal("popover.open"), control: text(), open: Type.Boolean() }),
  object({ kind: Type.Literal("files.choose"), control: text(), files: Type.Array(FileMetadataSchema) }),
  object({ kind: Type.Literal("files.remove"), control: text(), file: text() }),
  ...ExtendedEventSchemas,
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
  if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files") checkExtendedControl(node);
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
  } else if (node.kind !== "select" && node.kind !== "popover" && node.kind !== "files" &&
    (event.kind === "options.change" || event.kind === "money.change" || event.kind === "date.change")) {
    next = changeExtendedControl(node, event);
  } else throw new Error("INVALID_CONTROL_EVENT");
  return freezeDeep({ node: controlNode(next), rejected });
}
```

## src/interaction/control-bank.ts

Source SHA-256: 63bbd15fb89d5fe17d656c783fd8117722a5cdc42e417de2e7a92e7615b413bb

```ts
import { controlNode, type ControlNode } from "./control-nodes.ts";
import { freezeDeep } from "../json.ts";
import { controlInspection } from "./catalog-ownership.ts";

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

export const ControlBank = freezeDeep(([
  { id: "control.select", family: "control", specimens: [
    sample("available", { ...base, kind: "select", id: "choice", label: "Single choice", required: false, value: null, options: choices }),
    sample("disabled", { ...base, kind: "select", id: "disabled-choice", label: "Disabled choice", disabled: true,
      required: false, value: "retained", options: [{ value: "retained", label: "Retained selection", disabled: false }] }),
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
  { id: "control.options", family: "control", specimens: [
    sample("one", { ...options, id: "one-choice", label: "Choose one option", maxSelected: 1 }),
    sample("many", { ...options, id: "many-choices", label: "Choose up to two options", maxSelected: 2 }),
    sample("disabled", { ...options, id: "disabled-options", label: "Retained choice", maxSelected: 1,
      disabled: true, selected: ['first'] }),
    sample("constrained", { ...options, id: "constrained-options", label: "Keep one or two options", maxSelected: 2,
      selected: ['first', 'second'], options: [...choices, { value: 'third', label: 'Third option', disabled: false }] }),
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
] as const).map(entry => ({ ...entry, inspection: controlInspection(entry.id.slice(8), entry.specimens.map(specimen => specimen.state)) })));
```

## src/interaction/extended-nodes.ts

Source SHA-256: 47bcee965373271cffe5e96a08cf0b0a8f1fb06651049423effae0bb30701b91

```ts
import { Type, type Static, type TProperties } from "@sinclair/typebox";
import type { Frozen } from "../json.ts";
import { FaceSchema } from "./face.ts";
import { InputMaskSchema } from "./input-mask.ts";
import { MoneyMinorUnitsLimit } from "./money.ts";

const object = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });
const text = () => Type.String({ minLength: 1 });
const integer = (minimum = 0) => Type.Integer({ minimum, maximum: Number.MAX_SAFE_INTEGER });
const base = { version: Type.Literal("desert.control/1"), id: text(), label: text(), disabled: Type.Boolean() };
const option = object({ value: text(), label: text(), disabled: Type.Boolean(), description: Type.Optional(text()) });
const day = Type.String({ pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" });
const minor = Type.String({ pattern: "^-?(0|[1-9][0-9]*)$", maxLength: MoneyMinorUnitsLimit });
const source = Type.Union([Type.Null(), Type.String({ pattern: "^/(?!/)[^\\\\\\s]*$" }),
  object({ asset: Type.String({ pattern: "^[a-zA-Z0-9][a-zA-Z0-9._-]*$" }) })]);

export const OptionsNodeSchema = object({ ...base, kind: Type.Literal("options"),
  minSelected: integer(), maxSelected: integer(1), selected: Type.Array(text(), { uniqueItems: true }),
  options: Type.Array(option, { minItems: 1 }) });
export const MoneyNodeSchema = object({ ...base, kind: Type.Literal("money"), required: Type.Boolean(),
  locale: Type.Optional(InputMaskSchema.properties.locale),
  currencies: Type.Array(object({ code: Type.String({ pattern: "^[A-Z]{3}$" }), scale: Type.Integer({ minimum: 0, maximum: 6 }),
    face: Type.Optional(FaceSchema) }), { minItems: 1 }),
  currency: text(), minorUnits: Type.Union([Type.Null(), minor]) });
export const DateNodeSchema = object({ ...base, kind: Type.Literal("date"), required: Type.Boolean(),
  value: Type.Union([Type.Null(), day]), minimum: Type.Optional(day), maximum: Type.Optional(day) });
export const TagNodeSchema = object({ ...base, kind: Type.Literal("tag"),
  tone: Type.Union([Type.Literal("neutral"), Type.Literal("accent"), Type.Literal("success"), Type.Literal("warning"), Type.Literal("destructive")]) });
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

Source SHA-256: dcd5dc4a7439ca437e9ef5dd39f7214356dd8ff6f7b78347f38f231791e0926a

```ts
import type { ExtendedNode, ExtendedEvent, OptionsNode } from "./extended-nodes.ts";
import { inputMask } from "./input-mask.ts";

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

## src/svelte/pieces/Toolbar.svelte

Source SHA-256: 56e57b1d662a6ca80fd932839a3e6198312878d37ff6c4ede1043336e805f37d

```svelte
<script lang="ts">
  import type { Toolbar } from "../../interaction/toolbar.ts";
  import { intentKey, submitsJourney, type SurfaceIntent } from "../../interaction/intent.ts";
  import type { BankEvent } from "../../interaction/bank-events.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import AnchoredSurface from "./AnchoredSurface.svelte";
  import ToolbarLayout from "./ToolbarLayout.svelte";
  import { cn } from "../vendor/utils.js";
  import { Title } from "../vendor/components/ui/dialog/index.js";
  import type { Snippet } from "svelte";
let { toolbar, invoke, submit, presentation = "standard", controls }: { toolbar: Toolbar;
    controls?: Snippet;
    invoke: (intent: SurfaceIntent) => void; submit?: string | undefined; presentation?: "standard" | "message" | "transient" } = $props();
  let row = $state<HTMLDivElement | null>(null), leading = $state<HTMLDivElement | null>(null);
  let utilities = $state<HTMLDivElement | null>(null);
  let customControls = $state<HTMLDivElement | null>(null);
  let capacity = $state(1), open = $state(false), heldCount = $state<number | null>(null), stacked = $state(false);
  let trailing = $derived(toolbar.edge === "top" ? toolbar.trailing ?? [] : []);
  let visibleCount = $derived(heldCount ?? (trailing.length <= capacity ? trailing.length : Math.max(0, capacity - 1)));
  let overflow = $derived(trailing.slice(visibleCount));
  const event = (value: BankEvent) => { if (value.kind === "surface.invoke") invoke(value.intent); };
  function change(next: boolean) { heldCount = next ? visibleCount : null; open = next; }
  $effect(() => {
    trailing.length;
    if (!row) return;
    const container = row, rail = utilities, navigationRail = leading, controlRail = customControls;
    const measure = () => {
      const navigation = navigationRail?.getBoundingClientRect().width ?? 0;
      const slot = rail?.firstElementChild?.getBoundingClientRect().width ?? (navigation || 44);
      const gap = parseFloat(getComputedStyle(container).columnGap) || 0;
      const railGap = rail ? parseFloat(getComputedStyle(rail).columnGap) || 0 : 0;
      const titleSize = parseFloat(getComputedStyle(container.querySelector('h2, [role="heading"]') ?? container).fontSize);
      // Heading and utilities share the remaining rail; surplus utilities stay reachable in one typed surface.
      const remaining = container.clientWidth - navigation - gap * (navigation ? 2 : 1);
      stacked = controlRail
        ? remaining - controlRail.getBoundingClientRect().width - gap < titleSize * 4
        : trailing.length > 0 && remaining < Math.max(slot * 2, titleSize * 10);
      const budget = Math.max(slot, stacked ? container.clientWidth - navigation - gap : remaining / 2);
      capacity = Math.max(1, Math.floor((budget + railGap) / (slot + railGap)));
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (rail) observer.observe(rail);
    if (navigationRail) observer.observe(navigationRail);
    if (controlRail) observer.observe(controlRail);
    measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
{#if toolbar.edge === "top"}
  <ToolbarLayout class="workspace-header" data-surface-slot="top" face={toolbar.face} bind:row {stacked}>
    {#snippet children()}
      {#if toolbar.leading && presentation !== "message"}
        <div bind:this={leading} class="toolbar-action" data-toolbar-navigation>
          <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.leading, role: "secondary" }} onevent={event} />
        </div>
      {/if}
      <div class={cn("toolbar-heading flex min-w-0 flex-1 items-center gap-3", stacked && "order-last basis-full")}>
        <div class="min-w-0 flex-1">
          {#if presentation === "message"}<Title presentation="message" class="toolbar-title">{toolbar.title}</Title>
          {:else}<h2 class="toolbar-title type-title" title={toolbar.title}>{toolbar.title}</h2>{/if}
          {#if toolbar.subtitle}<p class="toolbar-subtitle type-support" title={toolbar.subtitle}>{toolbar.subtitle}</p>{/if}
        </div>
      </div>
      {#if controls}<div bind:this={customControls} class="ml-auto flex shrink-0 items-center gap-2" data-toolbar-controls>{@render controls()}</div>{/if}
      {#if trailing.length}
        <div bind:this={utilities} class="ml-auto flex min-w-0 shrink-0 gap-3" data-toolbar-utilities>
          {#each trailing.slice(0, visibleCount) as action (intentKey(action.intent))}
            <div class="toolbar-action">
              <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action, role: "secondary" }} onevent={event} />
            </div>
          {/each}
          {#if overflow.length}
            <div class="toolbar-action" data-toolbar-overflow>
              <AnchoredSurface label="More actions" title="More actions" content={{kind:"utilities",actions:overflow}}
                icon="more" {open} onchange={change}
                invoke={intent => { change(false); invoke(intent); }} />
            </div>
          {/if}
        </div>
      {/if}
    {/snippet}
    {#snippet support()}
      {#if toolbar.availability}<div class="toolbar-availability" title={toolbar.availability.label}>
        <BankRenderer node={{ version: "desert.bank-node/1", kind: "availability", ...toolbar.availability }} />
      </div>{/if}
    {/snippet}
  </ToolbarLayout>
{:else}
  <ToolbarLayout edge="bottom" class="bank-footer drawer-dismiss shrink-0" data-surface-slot="bottom">
    {#if toolbar.secondary}
      <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.secondary, role: "secondary" }} onevent={event} />
    {/if}
    {#if toolbar.primary}
      <BankRenderer node={{ version: "desert.bank-node/1", kind: "action", action: toolbar.primary, role: "primary",
        form: submitsJourney(toolbar.primary.intent, submit) }} onevent={event} />
    {/if}
  </ToolbarLayout>
{/if}
```

## src/svelte/pieces/Face.svelte

Source SHA-256: a53880aaa0a2d4153142cbe79042f4008437c70c18526ffddb6c184f211df604

```svelte
<script lang="ts">
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import FileText from "@lucide/svelte/icons/file-text";
  import type { Face } from "../../interaction/face.ts";
  import * as Avatar from "../vendor/components/ui/avatar/index.js";
  let { face, compact = false }: { face: Face; compact?: boolean } = $props();
  let glyph = $derived(face.kind === "symbol" ? face.text : face.kind === "flag"
    ? Array.from(face.region, letter => String.fromCodePoint(0x1f1e6 + letter.charCodeAt(0) - 65)).join("") : "");
</script>
<Avatar.Root shape="object" class="bank-face size-[var(--face-size,2rem)]" data-piece="face" data-face-kind={face.kind}
  data-compact={compact || undefined} data-tone={face.kind === "status" ? face.severity : "neutral"} aria-hidden="true">
  <Avatar.Fallback>{#if face.kind === "status"}<CircleAlert />{:else if face.kind === "document"}<FileText />{:else}<span data-face-glyph>{glyph}</span>{/if}</Avatar.Fallback>
</Avatar.Root>
```

## src/svelte/pieces/FieldWell.svelte

Source SHA-256: 945d8588258303e34c978891b41d341658d6c8bc767cbee2d0c9ad575cce1138

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import FieldWellContent from "./FieldWellContent.svelte";
  import { cn } from "../vendor/utils.js";
  let { id, label, filled, required = false, prefix, accessory, footer, children }: {
    id: string; label: string; filled: boolean; required?: boolean;
    prefix?: Snippet; accessory?: Snippet; footer?: Snippet | undefined; children: Snippet;
  } = $props();
  function focusEditor(event: MouseEvent) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    if (event.target.closest('input, textarea, button, select, a, label, [contenteditable]')) return;
    const editor = document.getElementById(id);
    if ((editor instanceof HTMLInputElement || editor instanceof HTMLTextAreaElement) && !editor.disabled) {
      editor.focus({ preventScroll: true });
    }
  }
</script>
<Group.Root onclick={focusEditor} class={cn("field-well overflow-hidden p-0", footer && "flex-col items-stretch")} data-floating-field data-field-focus="within" data-compound-field={!!prefix} data-filled={filled}>
  <div data-field-row class="flex w-full min-w-0 items-center">
    <FieldWellContent {id} {label} {required} {children} />
    {#if prefix}<Group.Addon align="inline-start" class="field-prefix">{@render prefix()}</Group.Addon>{/if}
    {@render accessory?.()}
  </div>
  {@render footer?.()}
</Group.Root>
```

## src/svelte/pieces/SearchField.svelte

Source SHA-256: 847cc1446b1ac011a729dff81997032c423dab7420ff28f6409342e9efd6cc41

```svelte
<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";
  import * as InputGroup from "../vendor/components/ui/input-group/index.js";
  import Search from "@lucide/svelte/icons/search";
  import ClearInput from "./ClearInput.svelte";

  const generatedId = $props.id();
  let { id = generatedId, value = $bindable(""), ref = $bindable(null), onvalue, disabled = false, readonly = false, ...props }: {
    value?: string; ref?: HTMLInputElement | null; onvalue?: (value: string) => void;
  } & Omit<HTMLInputAttributes, "value" | "type" | "files" | "oninput" | "children"> = $props();
  let fieldId = $derived(id ?? generatedId);

  function update(next: string) { value = next; onvalue?.(next); }
</script>

<InputGroup.Root data-search-field data-disabled={disabled} aria-disabled={disabled || undefined}
  onclick={event => {
    if (!(event.target as Element).closest("button,input")) ref?.focus({ preventScroll: true });
  }}>
  <InputGroup.Input {...props} id={fieldId} bind:ref type="search" {value} {disabled} {readonly}
    autocomplete="off" oninput={event => update(event.currentTarget.value)} />
  <InputGroup.Addon align="inline-start"><Search data-search-icon="leading" aria-hidden="true" /></InputGroup.Addon>
  <ClearInput control={fieldId} {value} label="Clear search" disabled={!!(disabled || readonly)} />
</InputGroup.Root>
```

## src/svelte/pieces/MeasuredField.svelte

Source SHA-256: bb5eb2e2f65677c4001272059b6e78132e21ae662a46110d7ba1ce77e88d579b

```svelte
<script lang="ts">
  import type { ComponentProps } from 'svelte';
  import * as Field from '../vendor/components/ui/field/index.js';
  // The outer box measures available space; the complete accessible field
  // (including validation/support) owns its preferred measure inside it.
  let { measure, children, ...attributes }: ComponentProps<typeof Field.Field> & {
    measure: 'writing' | 'choice' | 'date' | 'amount';
  } = $props();
</script>

<div data-control-measure={measure}>
  <Field.Field {...attributes}>{@render children?.()}</Field.Field>
</div>
```

## src/svelte/pieces/control-measure.css

Source SHA-256: d84a698ed4e2a0ac55dfff442cb0f905666a565dc0e83086605c5d7ef727e91a

```ts
/* Family measures stay stable while editing. A 3rem residual strip is absorbed
   into the field. Queries measure the containing slot, never the device. */
[data-control-measure] { container:control-measure / inline-size; width:100%; min-width:0; align-self:stretch; }
[data-control-measure="writing"] { --control-preferred:32rem; }
[data-control-measure="choice"] { --control-preferred:26rem; }
[data-control-measure="date"] { --control-preferred:20rem; }
[data-control-measure="amount"] { --control-preferred:22rem; }
[data-control-measure] > [data-slot="field"] { width:100%; min-width:0; max-width:var(--control-preferred); margin-inline:0; }
/* Each cutoff is the preferred measure above plus the same 3rem allowance.
   No width transition: resizing must not chase the pointer or reflow text late. */
@container control-measure (max-width:35rem) {
  [data-control-measure="writing"] > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:29rem) {
  [data-control-measure="choice"] > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:23rem) {
  [data-control-measure="date"] > [data-slot="field"] { max-width:none; }
}
@container control-measure (max-width:25rem) {
  [data-control-measure="amount"] > [data-slot="field"] { max-width:none; }
}
```

## src/svelte/pieces/GroupedPanel.svelte

Source SHA-256: 975476dab101dc1f06d9f45ab19b1fe7f9b3e8b0dbdd7b34974d839c4ac813d1

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Card from "../vendor/components/ui/card/index.js";
  let { children }: { children: Snippet } = $props();
</script>

<!-- One shared pane for sibling rows; Stack only supplies hierarchy. -->
<Card.Root class="grouped-panel" data-grouped-panel>{@render children()}</Card.Root>
```

## src/svelte/pieces/ChoiceRow.svelte

Source SHA-256: a65a3a320e791fdfa02a92d874d5db16d5a5fc0bb7becfd7b918fcf379f106e4

```svelte
<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import ChoiceItem from "./ChoiceItem.svelte";
  import { pressFeedback } from "../vendor/components/ui/button/press-feedback.js";
  let { id, labelId, descriptionId, label, description, disabled, children }: {
    id: string; labelId: string; descriptionId?: string; label: string;
    description?: string | undefined; disabled: boolean; children: Snippet;
  } = $props();
  let row = $state<HTMLLabelElement | null>(null);
  $effect(() => { if (row) return pressFeedback(row); });
</script>

<Field.FieldLabel bind:ref={row} for={id} class="tm-control" aria-disabled={disabled} data-grouped-row data-choice-row data-material="interior">
  <ChoiceItem {label} {labelId} {description} {descriptionId}>
    {@render children()}
  </ChoiceItem>
</Field.FieldLabel>
```

## src/svelte/pieces/SelectionField.svelte

Source SHA-256: 52078971fe7e8d978a263313a0ffd52d9da85d421c87c271b0929aac6ec200e4

```svelte
<script lang="ts">
  import { tick, untrack, type Snippet } from "svelte";
  import { dismissWhenInactive } from './surface-activity.svelte.ts';
  import * as Popover from "../vendor/components/ui/popover/index.js";
  import { Button } from "../vendor/components/ui/button/index.js";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import FieldWellContent from "./FieldWellContent.svelte";
  import Face from "./Face.svelte";
  import PickerSheet from "./PickerSheet.svelte";
  import SelectionList from "./SelectionList.svelte";
  import { surfaceFocus, revealSurfaceFocus } from "./surface-focus.svelte.ts";
  import { PickerPresentation } from "./picker-presentation.svelte.ts";
  import type { SelectionOption } from "../../interaction/selection-option.ts";
  let { id, selection, label, triggerLabel = label, value, options, disabled = false, required = false,
    fieldControl = false, selectedContent, optionLeading, onchange }: {
    id?: string; selection: string; label: string; triggerLabel?: string; value: string | null;
    options: readonly (SelectionOption & { readonly description?: string })[];
    disabled?: boolean; required?: boolean; fieldControl?: boolean; onchange: (value: string) => void;
    selectedContent?: Snippet<[SelectionOption | undefined]>;
    optionLeading?: Snippet<[SelectionOption]>;
  } = $props();
  const generatedId = $props.id();
  const picker = new PickerPresentation();
  let triggerId = $derived(id ?? generatedId);
  let selectedOption = $derived(options.find(option => option.value === value));
  let valueLabel = $derived(selectedOption?.label ?? "Not selected");
  let open = $state(false);
  let activeValue = $state<string | null>(null);
  let list = $state<HTMLDivElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  const boundary = () => list?.closest<HTMLElement>('[data-picker-sheet],[data-slot="popover-content"]') ?? null;
  const initialFocus = surfaceFocus(boundary);
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
  <span class="flex min-w-0 items-center gap-2">
    {#if selectedOption?.face}<Face face={selectedOption.face} compact />{/if}
    <span class="min-w-0 truncate">{valueLabel}</span>
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
    <Button {...props} {disabled} variant={fieldControl ? 'well' : 'field'} size={fieldControl ? 'well' : 'default'}
      data-slot="select-trigger" data-floating-field={fieldControl || undefined} data-filled={fieldControl || undefined}
      class={`w-full justify-between gap-3 ${fieldControl ? 'field-well overflow-hidden' : ''}`}
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
          <ChevronDown data-icon="inline-end" data-control-chevron aria-hidden="true" />
        </span>
      </FieldWellContent>
    {:else}
      {@render selectedValue()}
      <ChevronDown data-icon="inline-end" data-control-chevron aria-hidden="true" />
    {/if}
    </Button>
    {/snippet}
  </Popover.Trigger>
  {#if picker.current === "sheet"}
    <PickerSheet bind:open {label} {triggerId} onOpenAutoFocus={focus}>
      {@render choices()}
    </PickerSheet>
  {:else}
    <Popover.Content role="presentation" onOpenAutoFocus={focus} onCloseAutoFocus={restore}
      style="padding:.25rem;gap:0;width:max-content;min-width:min(var(--bits-popover-anchor-width),calc(100dvw - 24px))"
      onFocusOutside={event => { if (!(event.target instanceof HTMLElement) || event.target.id !== triggerId) open = false; }}>
      {@render choices()}
    </Popover.Content>
  {/if}
</Popover.Root>
{#if required}<span id={`${triggerId}-requirement`} class="sr-only">Required</span>{/if}
```

## src/svelte/pieces/CollectionState.svelte

Source SHA-256: 406a2dc2d1e6bc370c44a125c2dd9e65b4d553133c958bd7f63384be3c103fe5

```svelte
<script lang="ts">
  import * as Empty from "../vendor/components/ui/empty/index.js";
  import { Spinner } from "../vendor/components/ui/spinner/index.js";
  import FileText from "@lucide/svelte/icons/file-text";
  let { loaded, createLabel }: { loaded: boolean; createLabel: string } = $props();
</script>
<Empty.Root role="group" aria-label="Collection state" data-collection-state={loaded ? "empty" : "unread"}>
  <Empty.Header>
    <Empty.Media variant="icon">{#if loaded}<FileText aria-hidden="true" />{:else}<Spinner aria-hidden="true" />{/if}</Empty.Media>
    <Empty.Title role="heading" aria-level={2}>{loaded ? "Nothing here yet." : "Waiting for your records."}</Empty.Title>
    <Empty.Description>{loaded ? `Use “${createLabel}” to get started.` :
      "Nothing has been loaded yet. This does not mean the collection is empty."}</Empty.Description>
  </Empty.Header>
</Empty.Root>
```

## src/svelte/pieces/Action.svelte

Source SHA-256: 468f019f68e5ff18c8c053329c8c6d872532117a69eaf437cfe4b8b07e45d2eb

```svelte
<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import Loader2 from "@lucide/svelte/icons/loader-2";
  import { cn } from "../vendor/utils.js";
  import type { ToolbarAction } from "../../interaction/toolbar.ts";
  import { actionIcons } from "./action-icons.ts";
  import type { ActionElementProps } from "../action-adapter.ts";
  let { label, icon, state: status = "ready", emphasis = "secondary", onclick, type = "button", elementProps }: {
    label: string; icon: keyof typeof actionIcons; state?: ToolbarAction["state"];
    emphasis?: "primary" | "secondary"; onclick?: () => void; type?: "button" | "submit";
    elementProps?: ActionElementProps | undefined;
  } = $props();
  function buttonEvent<E extends Event>(event: E): event is E & { currentTarget: EventTarget & HTMLButtonElement } {
    return event.currentTarget instanceof HTMLButtonElement;
  }
  function forward<E extends Event>(handler: ((event: E & { currentTarget: EventTarget & HTMLButtonElement }) => void) | null | undefined) {
    return (event: E) => { if (status === "ready" && buttonEvent(event)) handler?.(event); };
  }
  // Only overlay semantics/events and Svelte ref attachments cross this internal adapter.
  let overlay = $derived.by(() => {
    const props = elementProps ?? {};
    return { id: props.id, "aria-expanded": props["aria-expanded"], "aria-controls": props["aria-controls"],
      "aria-haspopup": props["aria-haspopup"], "data-state": props["data-state"], onkeydown: forward<KeyboardEvent>(props.onkeydown),
      onpointerdown: forward<PointerEvent>(props.onpointerdown), onpointerenter: forward<PointerEvent>(props.onpointerenter),
      onpointerleave: forward<PointerEvent>(props.onpointerleave),
      ...Object.fromEntries(Object.getOwnPropertySymbols(props).map(key => [key, props[key]])) };
  });
  let button = $state<HTMLButtonElement | null>(null);
  let caption = $state<HTMLSpanElement | null>(null);
  let compact = $state(false);
  let Icon = $derived(status === "pending" ? Loader2 : actionIcons[icon]);
  let face = $derived(status === "pending" ? "pending" : compact ? "icon" : "label");
  $effect(() => {
    label;
    if (!button || !caption) return;
    const element = button, text = caption;
    const measure = () => { compact = text.scrollWidth > text.clientWidth + 1; };
    const observer = new ResizeObserver(measure);
    observer.observe(element); observer.observe(text); measure();
    document.fonts.addEventListener("loadingdone", measure);
    return () => { observer.disconnect(); document.fonts.removeEventListener("loadingdone", measure); };
  });
</script>
<Button {...overlay} bind:ref={button} variant={status === "pending" ? "secondary" : emphasis === "primary" ? "default" : "secondary"}
  size="default" spin={status === "pending"} {type} onclick={event => { if (status !== "ready") return;
    if (buttonEvent(event)) elementProps?.onclick?.(event); if (!event.defaultPrevented) onclick?.(); }} class="relative w-fit min-w-0 max-w-[min(100%,22rem)] self-start justify-self-start overflow-hidden"
  disabled={status !== "ready"} aria-busy={status === "pending"} aria-label={label} title={compact ? label : undefined}
  data-primitive="action" data-button-face={face} data-emphasis={emphasis}>
  <span bind:this={caption} data-button-label aria-hidden="true" class={cn("min-w-0 truncate", face !== "label" && "invisible")}>{label}</span>
    <span class={cn("absolute inset-0 flex items-center justify-center", face === "label" && "invisible")}
      aria-hidden="true" data-button-glyph data-button-face={face}>
      <Icon data-icon="inline-start" aria-hidden="true" />
    </span>
</Button>
```

## src/svelte/pieces/action-icons.ts

Source SHA-256: d907548fbfcb0eef467b5535eeb7980cf730247566c7218e4a7fadae53a19736

```ts
import ArrowLeft from "@lucide/svelte/icons/arrow-left";
import X from "@lucide/svelte/icons/x";
import Save from "@lucide/svelte/icons/save";
import Eye from "@lucide/svelte/icons/eye";
import Search from "@lucide/svelte/icons/search";
import RotateCw from "@lucide/svelte/icons/rotate-cw";
import Plus from "@lucide/svelte/icons/plus";
import Archive from "@lucide/svelte/icons/archive";
import LayoutGrid from "@lucide/svelte/icons/layout-grid";
import ArrowRight from "@lucide/svelte/icons/arrow-right";
import Check from "@lucide/svelte/icons/check";
import Ellipsis from "@lucide/svelte/icons/ellipsis";
import PanelLeft from "@lucide/svelte/icons/panel-left";
import type { ActionIcon } from "../../interaction/toolbar.ts";

export const actionIcons = {
  back: ArrowLeft, close: X, save: Save, review: Eye, recover: Search, retry: RotateCw,
  create: Plus, archive: Archive, catalog: LayoutGrid, open: ArrowRight, confirm: Check, search: Search, more: Ellipsis, navigation: PanelLeft,
} satisfies Record<ActionIcon, typeof X>;
```

## src/svelte/vendor/components/ui/button/button.svelte

Source SHA-256: aa8d18cedb88aa2039ed2b0c0a4b839eea50dbe7fbb58edf5b5d9255e6c7992c

```svelte
<script lang="ts" module>
	import { type VariantProps, tv } from "tailwind-variants";
	import { cn, type WithElementRef } from "@desert/svelte/vendor/utils.js";
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from "svelte/elements";

	/** The public buttonVariants contract. */
	export const buttonVariants = tv({
        base: "tm-control inline-flex shrink-0 items-center justify-center whitespace-nowrap gap-2 rounded-full type-control outline-none disabled:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variants: {
            spin: { true: "[&_svg[data-icon]]:animate-spin" },
            variant: {
                default: "text-primary-text font-semibold",
                outline: "text-foreground",
                secondary: "text-secondary-foreground",
                ghost: "bg-transparent text-foreground",
                grip: "bg-transparent text-muted-foreground rounded-lg",
                destructive: "text-destructive",
                link: "bg-transparent text-primary-text underline-offset-4 hover:underline",
                row: "bg-transparent text-foreground border-0 rounded-none justify-start whitespace-normal h-auto text-left font-normal w-full",
                field: "bg-transparent text-foreground border-0 rounded-none justify-start w-full font-normal",
                well: "text-foreground rounded-[var(--radius)] justify-start text-left whitespace-normal w-full font-normal",
            },
            size: {
                default: "min-h-11 px-4 py-2", xs: "min-h-6 px-2", sm: "min-h-9 px-3",
                lg: "min-h-11 px-5", icon: "size-10", "icon-xs": "size-6", "icon-sm": "size-9", "icon-lg": "size-11",
                row: "px-4 py-3", field: "min-h-10 px-3", well: "p-0",
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
		};
</script>

<script lang="ts">
	import { pressFeedbackProps } from "./press-feedback.js";
	let {
		class: className,
		variant = "default",
		size = "default",
		spin = false,
		ref = $bindable(null),
		href = undefined,
		type = "button",
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-material={['ghost','grip','link','row','field'].includes(variant) ? 'interior' : 'pane'}
		class={cn(buttonVariants({ variant, size, spin }), "tm-control", className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? "link" : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		<span data-button-content>{@render children?.()}</span>
	</a>
{:else}
	<button
		{...pressFeedbackProps}
		bind:this={ref}
		data-slot="button"
		data-material={['ghost','grip','link','row','field'].includes(variant) ? 'interior' : 'pane'}
		class={cn(buttonVariants({ variant, size, spin }), "tm-control", className)}
		{type}
		{disabled}
		{...restProps}
	>
		<span data-button-content>{@render children?.()}</span>
	</button>
{/if}
```

## src/svelte/vendor/components/ui/button/press-feedback.ts

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

## src/svelte/controls/SelectControl.svelte

Source SHA-256: 742a71eb4de73fae36d848a3058f5328969167e2695aa8caa572b51711f66487

```svelte
<script lang="ts">
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import SelectionField from "../pieces/SelectionField.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import { selectNode, applyControlEvent } from "../../interaction/control-nodes.ts";
  import type { ControlProps, ControlEventFor } from "../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"select"> = $props();
  let checked = $derived(selectNode(node));
  const id = $props.id();
  function change(value: string | null) {
    const event: ControlEventFor<"select"> = { kind: "select.change", control: checked.id, value };
    applyControlEvent(checked, event);
    onevent(event);
  }
</script>
<MeasuredField measure="choice" data-disabled={checked.disabled} data-control="select">
  <SelectionField {id} selection={checked.id} label={checked.label} value={checked.value} options={checked.options}
    disabled={checked.disabled} required={checked.required} fieldControl onchange={change} />
  {#if !checked.required}<BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
    icon: "close", label: "Clear selection", state: checked.disabled || checked.value === null ? "unavailable" : "ready",
    intent: { kind: "selection.clear" },
  } }} onevent={event => { if (event.kind === "local.invoke" && event.intent.kind === "selection.clear") change(null); }} />{/if}
</MeasuredField>
```

## src/svelte/controls/PopoverControl.svelte

Source SHA-256: 25053edaa3ce2f51e11e2cce907c24beb95e1dd7e4280a6f9704f76aee1dad2e

```svelte
<script lang="ts">
  import AnchoredSurface from "../pieces/AnchoredSurface.svelte";
  import { popoverNode, applyControlEvent } from "../../interaction/control-nodes.ts";
  import type { ControlProps, ControlEventFor } from "../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"popover"> = $props();
  let checked = $derived(popoverNode(node));
  function change(open: boolean) {
    const event: ControlEventFor<"popover"> = { kind: "popover.open", control: checked.id, open };
    applyControlEvent(checked, event);
    onevent(event);
  }
</script>
<AnchoredSurface label={checked.label} open={checked.open} disabled={checked.disabled} locked={checked.locked}
  title={checked.title} content={{ kind: "information", items: checked.content }} onchange={change} />
```

## src/svelte/controls/FileControl.svelte

Source SHA-256: 626eacda98060e2955aea130e1a2c5ce23ca213443e0b45831e0cceef6462995

```svelte
<script lang="ts">
  import * as Field from "../vendor/components/ui/field/index.js";
  import Action from "../pieces/Action.svelte";
  import { Input } from "../vendor/components/ui/input/index.js";
  import { fileNode, type FileRejection } from "../../interaction/control-nodes.ts";
  import type { ControlProps } from "../renderer-contracts.ts";
  import { fileSize } from "../pieces/file-size.ts";
  import { currentStackTitle } from "../pieces/stack-context.ts";
  let { node, host, onevent }: ControlProps<"files"> = $props();
  let checked = $derived(fileNode(node));
  let rejected = $state<readonly FileRejection[]>([]);
  const id = $props.id();
  const stackTitle = currentStackTitle();
  let picker = $state<HTMLInputElement | null>(null);
  const reasons = { "media-type": "File type is not accepted", "file-size": "File is too large",
    "total-size": "Total size limit exceeded", count: "File count limit reached" };
  function choose(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const selection = host.choose(checked, Array.from(input.files ?? []));
    rejected = selection.result.rejected;
    onevent(selection.event);
    input.value = "";
  }
</script>
<Field.Field data-control="files" data-disabled={checked.disabled} data-invalid={rejected.length > 0}>
  <Field.FieldLabel for={id} class={stackTitle() === checked.label ? "sr-only" : undefined}>{checked.label}</Field.FieldLabel>
  <Input bind:ref={picker} {id} type="file" hidden tabindex={-1} multiple={checked.limits.maxCount > 1} accept={checked.limits.accept.join(",")}
    disabled={checked.disabled} onchange={choose} aria-describedby={`${id}-limits`} aria-invalid={rejected.length > 0} />
  <Action icon="open" label="Choose files" state={checked.disabled ? "unavailable" : "ready"} onclick={() => picker?.click()} />
  <Field.FieldDescription id={`${id}-limits`}>
    Up to {checked.limits.maxCount} files · {fileSize(checked.limits.maxFileBytes)} each · {fileSize(checked.limits.maxTotalBytes)} total.
    Nothing is uploaded.
  </Field.FieldDescription>
  {#if checked.files.length}
    <ul class="flex flex-col gap-2" aria-label="Selected local files">
      {#each checked.files as file (file.id)}
        <li class="flex flex-wrap items-center justify-between gap-2">
          <span class="min-w-0 break-all">{file.name} · {fileSize(file.size)}</span>
          <Action icon="close" label={`Remove ${file.name}`} state={checked.disabled ? "unavailable" : "ready"}
            onclick={() => onevent(host.remove(checked, file.id))} />
        </li>
      {/each}
    </ul>
  {:else}<Field.FieldDescription>No local files selected.</Field.FieldDescription>{/if}
  <div role="status" aria-live="polite">
    {#each rejected as item (item.file.id)}<p class="text-destructive">{item.file.name}: {reasons[item.reason]}.</p>{/each}
  </div>
</Field.Field>
```

## src/svelte/controls/ControlRenderer.svelte

Source SHA-256: 16a39d9d943d0cd0dd9f064444026fe29e866db438e3ce7bcc6bd087713b090e

```svelte
<script lang="ts">
  import type { ControlNode, ControlEvent } from "../../interaction/control-nodes.ts";
  import { controlBankNode } from "../../interaction/bank-node.ts";
  import BankRenderer from "../BankRenderer.svelte";
  import type { LocalFileHost } from "./file-host.ts";
  let { node, onevent, host }: { node: ControlNode; onevent: (event: ControlEvent) => void; host: LocalFileHost } = $props();
</script>
<BankRenderer node={controlBankNode(node)} {host} onevent={event => { if ("control" in event) onevent(event); }} />
```

## src/svelte/controls/OptionsControl.svelte

Source SHA-256: 045df8f13e98ca99022c0723d330bffbb464a422cca3f11e9c10bc2b898cb47e

```svelte
<script lang="ts">
  import * as Field from "../vendor/components/ui/field/index.js";
  import * as RadioGroup from "../vendor/components/ui/radio-group/index.js";
  import { Checkbox } from "../vendor/components/ui/checkbox/index.js";
  import GroupedPanel from "../pieces/GroupedPanel.svelte";
  import ChoiceRow from "../pieces/ChoiceRow.svelte";
  import ChoiceList from "../pieces/ChoiceList.svelte";
  import type { ControlProps } from "../renderer-contracts.ts";
  import { permitsOptionsSelection } from "../../interaction/extended-controls.ts";
  import { currentStackTitle } from "../pieces/stack-context.ts";
  let { node, onevent }: ControlProps<"options"> = $props();
  const prefix = $props.id();
  const stackTitle = currentStackTitle();
  const change = (selected: readonly string[]) => {
    if (permitsOptionsSelection(node, selected)) onevent({ kind: "options.change", control: node.id, selected });
  };
  const nextSelection = (value: string) => node.maxSelected === 1 ? [value] :
    node.selected.includes(value) ? node.selected.filter(item => item !== value) : [...node.selected, value];
  const disabled = (value: string, unavailable: boolean) => unavailable || !permitsOptionsSelection(node, nextSelection(value));
</script>
{#snippet choices()}
    {#each node.options as option (option.value)}
      <ChoiceRow id={`${prefix}-${option.value}`} labelId={`${prefix}-${option.value}-label`}
        descriptionId={`${prefix}-${option.value}-description`} label={option.label} description={option.description}
        disabled={disabled(option.value, option.disabled)}>
          {#if node.maxSelected === 1}
            <RadioGroup.Item id={`${prefix}-${option.value}`} value={option.value} disabled={disabled(option.value, option.disabled)}
              aria-labelledby={`${prefix}-${option.value}-label`} aria-describedby={option.description ? `${prefix}-${option.value}-description` : undefined} />
          {:else}
            <Checkbox id={`${prefix}-${option.value}`} bind:checked={() => node.selected.includes(option.value),
              checked => change(checked ? [...node.selected, option.value] : node.selected.filter(value => value !== option.value))}
              disabled={disabled(option.value, option.disabled)} aria-labelledby={`${prefix}-${option.value}-label`}
              aria-describedby={option.description ? `${prefix}-${option.value}-description` : undefined} />
          {/if}
      </ChoiceRow>
    {/each}
{/snippet}
<Field.FieldSet data-control="options" data-cardinality={node.maxSelected === 1 ? "one" : "many"}>
  <Field.FieldLegend variant="label" class={stackTitle() === node.label ? "sr-only" : "options-title"}>{node.label}{#if node.minSelected > 0}<span class="required" aria-hidden="true">*</span>{/if}</Field.FieldLegend>
  <GroupedPanel><ChoiceList>{#if node.maxSelected === 1}
    <RadioGroup.Root bind:value={() => node.selected[0] ?? "", value => change(value ? [value] : [])}
      disabled={node.disabled} required={node.minSelected > 0} aria-label={node.label} data-grouped-rows>{@render choices()}</RadioGroup.Root>
  {:else}<Field.FieldGroup data-grouped-rows>{@render choices()}</Field.FieldGroup>{/if}</ChoiceList></GroupedPanel>
</Field.FieldSet>
```

## src/svelte/controls/MoneyControl.svelte

Source SHA-256: 5a0c1e6629270e5e97782c89be9a51e4449d30136dc99c0748108ef6595f1599

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import MaskedInput from "../pieces/MaskedInput.svelte";
  import SelectionField from "../pieces/SelectionField.svelte";
  import type { ControlProps } from "../renderer-contracts.ts";
  import { displayAmount, parseAmount } from "../../interaction/money.ts";
  import { formatMaskedValue, type InputMask } from "../../interaction/input-mask.ts";
  import FieldWell from "../pieces/FieldWell.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import ClearInput from "../pieces/ClearInput.svelte";
  let { node, onevent }: ControlProps<"money"> = $props();
  const id = $props.id();
  let scale = $derived(node.currencies.find(currency => currency.code === node.currency)!.scale);
  let mask: InputMask = $derived({ kind: "decimal", locale: node.locale ?? "en-US", scale });
  const symbol = (currency: string) => new Intl.NumberFormat(mask.locale, {
    style: "currency", currency, currencyDisplay: "narrowSymbol",
  }).formatToParts(0).find(part => part.type === "currency")!.value;
  let options = $derived(node.currencies.map(item => ({ value: item.code, label: item.code, disabled: false })));
  let draft = $state(untrack(() => displayAmount(node.minorUnits, scale)));
  let display = $state("");
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
    onevent({ kind: "money.change", control: node.id, currency, minorUnits });
  }
  function edit(value: string, valid: boolean, complete: boolean) {
    draft = value; draftValid = valid && complete;
    if (!draftValid) { error = `Enter an amount with up to ${scale} decimal places using ${mask.locale} formatting.`; return; }
    try { const minorUnits = parseAmount(value, scale); error = "";
      publish(node.currency, minorUnits);
    } catch (cause) { error = cause instanceof Error && cause.message === "MONEY_AMOUNT_TOO_LARGE"
      ? "This amount exceeds the supported size." : `Enter an amount with up to ${scale} decimal places.`; }
  }
  function currency(value: string) {
    if (value === node.currency) return;
    const nextScale = node.currencies.find(item => item.code === value)!.scale;
    try {
      if (!draftValid || draft && !/^-?\d+(\.\d+)?$/.test(draft)) throw new Error("INVALID_MONEY_AMOUNT");
      // Removing insignificant fractional zeros permits exact scale changes, never rounding or FX conversion.
      const exact = draft.includes(".") ? draft.replace(/0+$/, "").replace(/\.$/, "") : draft;
      const minorUnits = parseAmount(exact, nextScale);
      error = ""; publish(value, minorUnits);
    } catch { error = `Enter an amount representable in ${value} with up to ${nextScale} decimal places before changing currency.`; }
  }
</script>
{#snippet currencySymbol(currency: string)}
  <Group.Text data-currency-symbol aria-hidden="true">{symbol(currency)}</Group.Text>
{/snippet}
<MeasuredField measure="amount" data-control="money" data-invalid={!!error} data-disabled={node.disabled}>
  <FieldWell {id} label={node.label} required={node.required} filled={true}>
    {#snippet accessory()}<ClearInput control={id} value={display} label={`Clear ${node.label}`} disabled={node.disabled} />{/snippet}
    {#snippet prefix()}
      <SelectionField selection={`${node.id}-currency`} label={`${node.label} currency`} triggerLabel={`${node.currency} · ${node.label} currency`}
        value={node.currency} {options}
        onchange={currency} disabled={node.disabled || node.currencies.length === 1}>
        {#snippet optionLeading(option)}{@render currencySymbol(option.value)}{/snippet}
        {#snippet selectedContent(selected)}
          <span class="flex items-center gap-2">
            {@render currencySymbol(selected?.value ?? node.currency)}
            <span>{selected?.label ?? node.currency}</span>
          </span>
        {/snippet}
      </SelectionField>
    {/snippet}
    <MaskedInput {id} {mask} bind:display identity={`${node.id}/${node.currency}`} value={draft} placeholder={formatMaskedValue(displayAmount("0", scale), mask)}
      disabled={node.disabled} required={node.required} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}
      onvalue={edit} />
  </FieldWell>
  {#if error}<Field.FieldDescription id={`${id}-error`} role="status">{error}</Field.FieldDescription>{/if}
</MeasuredField>
```

## src/svelte/controls/DateControl.svelte

Source SHA-256: a226c75886c9f92c3291061526e8d7fd02716e7a70606e7c7563fa57efa4eae3

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import { dismissWhenInactive } from '../pieces/surface-activity.svelte.ts';
  import { parseDate, today, DateFormatter, getLocalTimeZone, type DateValue } from "@internationalized/date";
  import * as Popover from "../vendor/components/ui/popover/index.js";
  import { Button } from "../vendor/components/ui/button/index.js";
  import DateCalendar from "../pieces/DateCalendar.svelte";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import FieldWellContent from "../pieces/FieldWellContent.svelte";
  import MeasuredField from "../pieces/MeasuredField.svelte";
  import PickerSheet from "../pieces/PickerSheet.svelte";
  import { PickerPresentation } from "../pieces/picker-presentation.svelte.ts";
  import type { ControlProps } from "../renderer-contracts.ts";
  let { node, onevent }: ControlProps<"date"> = $props();
  // Six week rows plus month controls, field and collision margins must fit.
  const id = $props.id(), picker = new PickerPresentation({ panelRem: 20, minimumBlockRem: 28 });
  const format = new DateFormatter("en-US", { dateStyle: "medium" });
  let open = $state(false);
  let anchoredContent = $state<HTMLElement | null>(null);
  let focusBoundary: HTMLElement | null = null;
  $effect(() => { if (anchoredContent) focusBoundary = anchoredContent; });
  function restoreFocus(event: Event) {
    event.preventDefault();
    const active = document.activeElement, trigger = document.getElementById(id);
    if (!open && (!active || active === document.body || focusBoundary?.contains(active))
      && !node.disabled && trigger?.checkVisibility() && !trigger.closest('[hidden],[inert]'))
      trigger.focus({ preventScroll: true });
  }
  dismissWhenInactive(() => { open = false; });
  let observed = untrack(() => node.id);
  let observedValue = untrack(() => node.value);
  let visibleDate = $state<DateValue>(untrack(() => node.value ? parseDate(node.value) : today(getLocalTimeZone())));
  let date = $derived(node.value ? parseDate(node.value) : undefined);
  let label = $derived(date ? format.format(date.toDate(getLocalTimeZone())) : "No date selected");
  $effect(() => {
    const next = node.id, disabled = node.disabled, value = node.value, isOpen = open;
    untrack(() => {
      if (disabled || next !== observed) open = false;
      // Presentation may remount the calendar, but it does not start a new
      // browsing task. Closing or an owner replacement resets its cursor.
      if (!isOpen || next !== observed || value !== observedValue)
        visibleDate = value ? parseDate(value) : today(getLocalTimeZone());
      observed = next; observedValue = value;
    });
  });
  function change(value: DateValue | undefined) {
    if (!value || node.disabled) return;
    if (value.toString() !== node.value) onevent({ kind: "date.change", control: node.id, value: value.toString() });
    open = false;
  }
  function clear() {
    if (node.disabled || node.required) return;
    onevent({ kind: "date.change", control: node.id, value: null });
    open = false;
  }
</script>
{#snippet trigger(props: Record<string, unknown>)}
  <Button {...props} {id} variant="well" size="well" class="field-well w-full overflow-hidden"
    data-floating-field data-filled data-date-trigger disabled={node.disabled}
    aria-label={`${node.label} · ${label}`} aria-describedby={node.required ? `${id}-requirement` : undefined}
    aria-haspopup="dialog" aria-expanded={open}>
    <FieldWellContent label={node.label} required={node.required}>
      <span data-field-value class="flex min-w-0 items-center justify-between gap-3">
        <span>{label}</span><CalendarIcon data-icon="inline-end" aria-hidden="true" />
      </span>
    </FieldWellContent>
  </Button>
{/snippet}
{#snippet calendar()}
  <DateCalendar value={date} bind:visibleDate label={node.label} minimum={node.minimum} maximum={node.maximum} presentation={picker.current}
    disabled={node.disabled} onchange={change} onclear={node.required ? undefined : clear}
    onclose={picker.current === "sheet" ? () => { open = false; } : undefined} />
{/snippet}
<MeasuredField measure="date" data-control="date" data-disabled={node.disabled}>
  {#if picker.current === "sheet"}
    {@render trigger({ onclick: () => { open = true; } })}
    <PickerSheet bind:open label={node.label} triggerId={id} contentToolbar>{@render calendar()}</PickerSheet>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger {id} disabled={node.disabled}>
        {#snippet child({ props })}{@render trigger(props)}{/snippet}
      </Popover.Trigger>
      <Popover.Content bind:ref={anchoredContent} onCloseAutoFocus={restoreFocus}
        role="dialog" aria-label={node.label} aria-modal="false" class="p-3" style="width:20rem;overflow:hidden">
        {@render calendar()}
      </Popover.Content>
    </Popover.Root>
  {/if}
  {#if node.required}<span id={`${id}-requirement`} class="sr-only">Required</span>{/if}
</MeasuredField>
```

## src/svelte/controls/MediaControl.svelte

Source SHA-256: e4a019228338c4dfe7de68f6b1a38c5394b8e42470294cffac5c32132af91e9c

```svelte
<script lang="ts">
  import * as Avatar from "../vendor/components/ui/avatar/index.js";
  import { Badge } from "../vendor/components/ui/badge/index.js";
  import { cn } from "../vendor/utils.js";
  import ImageOff from "@lucide/svelte/icons/image-off";
  import type { AvatarNode, ImageNode, TagNode } from "../../interaction/extended-nodes.ts";
  import PhotoCollection from '../pieces/media/PhotoCollection.svelte';
  import Image from '../pieces/media/Image.svelte';
  let { node }: { node: AvatarNode | ImageNode | TagNode } = $props();
  let source = $derived(node.kind === "tag" ? null : typeof node.source === "object" && node.source !== null
    ? `/media/${encodeURIComponent(node.source.asset)}` : node.source);
  const aspects = { square: "aspect-square", landscape: "aspect-video", portrait: "aspect-[3/4]" };
</script>
{#if node.kind === "tag"}
  <Badge variant={node.tone === "neutral" ? "secondary" : node.tone} data-control="tag" data-tone={node.tone}>{node.label}</Badge>
{:else if node.kind === "avatar"}
  <div class="flex min-w-0 items-center gap-3" data-control="avatar">
    <Avatar.Root size="lg" aria-hidden="true">
      {#if source}<Image {source} alt="" edge={160} fallback={node.fallback} />
      {:else}<Avatar.Fallback initials={node.fallback} />{/if}
    </Avatar.Root><span class="min-w-0 [overflow-wrap:anywhere]">{node.label}</span>
  </div>
{:else}
  <figure data-control="image" class="flex min-w-0 flex-col gap-2">
    <div class={cn("relative w-full overflow-hidden rounded-xl", aspects[node.aspect])} data-aspect={node.aspect}>
      {#if source}
        <div class="absolute inset-0">{#key source}<PhotoCollection photos={[{source,alt:node.alt}]} title={node.label} />{/key}</div>
      {:else}<div class="absolute inset-0 flex items-center justify-center gap-3 rounded-xl border" role="img" aria-label={node.alt}>
        <ImageOff aria-hidden="true" /><span>Image unavailable</span></div>{/if}
    </div>
    <figcaption>{node.label}</figcaption>
  </figure>
{/if}
```

## src/svelte/pieces/AnchoredSurface.svelte

Source SHA-256: 2621884e794675c290d76ecbc03e4e73fa171bd44b11cc79565001cafb75f76c

```svelte
<script lang="ts">
  import * as Popover from "../vendor/components/ui/popover/index.js";
  import { dismissWhenInactive } from './surface-activity.svelte.ts';
  import { anchoredTabExit } from './anchored-tab-exit.ts';
  import FrameBody from "../FrameBody.svelte";
  import BankRenderer from "../BankRenderer.svelte";
  import { BankVersion } from "../../interaction/bank-node.ts";
  import type { FrameContent } from "../../interaction/surface-frame.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  import type { ActionIcon } from "../../interaction/toolbar.ts";
  let { label, title, content, open, disabled = false, locked = false, onchange, invoke = () => {}, icon = "open" }: {
    label: string; title: string; content: Extract<FrameContent, { kind: "information" | "utilities" }>;
    open: boolean; disabled?: boolean; locked?: boolean | undefined; onchange: (open: boolean) => void;
    invoke?: (intent: SurfaceIntent) => void; icon?: ActionIcon;
  } = $props();
  const change = (next: boolean) => { if (!disabled && (next || !locked)) onchange(next); };
  dismissWhenInactive(() => onchange(false));
  const guard = (event: Event) => { if (locked) event.preventDefault(); };
  let outside = false;
  let panel = $state<HTMLElement | null>(null);
  const interactOutside = (event: Event) => { guard(event); outside = !event.defaultPrevented; };
  const focusOutside = (event?: Event) => {
    event?.preventDefault();
    // DismissibleLayer can report the opener's earlier focus event after the
    // surface has mounted. Judge the settled destination, not that stale event.
    queueMicrotask(() => {
      if (panel?.contains(document.activeElement)) return;
      if (open && !locked) { outside = true; change(false); }
    });
  };
  const closeFocus = (event: Event) => {
    // A nonmodal outside interaction keeps the target's focus; Escape returns to the trigger.
    if (outside) event.preventDefault();
    outside = false;
  };
</script>
<Popover.Root {open} onOpenChange={change}>
  <Popover.Trigger {disabled}>
    {#snippet child({ props })}
      <BankRenderer node={{ version: BankVersion, kind: "action", role: "secondary", action: {
        icon, label, state: disabled ? "unavailable" : "ready", intent: { kind: "transient.open" },
      } }} actionElementProps={props} />
    {/snippet}
  </Popover.Trigger>
  <Popover.Content bind:ref={panel} role="dialog" aria-label={title} aria-modal="false" trapFocus={false} preventScroll={false}
    onkeydowncapture={event => {
      if (panel && !locked) anchoredTabExit(event, panel, () => { outside = true; change(false); });
    }}
    onEscapeKeydown={guard} onInteractOutside={interactOutside} onCloseAutoFocus={closeFocus} onFocusOutside={focusOutside}
    data-presentation="anchored">
    <FrameBody {content} {invoke} edit={() => {}} />
  </Popover.Content>
</Popover.Root>
```

## src/svelte/Fields.svelte

Source SHA-256: 9aa81c9211fdf43e1ffb39e6c9b31ef739088c4d3f1507b3f2e8c640b514c4bc

```svelte
<script lang="ts">
  import * as Field from "./vendor/components/ui/field/index.js";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import type { FrameContent } from "../interaction/surface-frame.ts";
let { fields, edit }: {
    fields: Extract<FrameContent, { kind: "form" }>["fields"];
    edit: (name: string, value: string) => void;
  } = $props();
</script>

<Field.FieldGroup data-composition="form">
  {#each fields as field (field.name)}
    <BankRenderer node={{ version: BankVersion, kind: field.primitive, name: field.name, label: field.label,
      value: field.value, required: field.required, disabled: false, ...(field.error ? { error: field.error } : {}),
      ...(field.maxLength !== undefined ? { maxLength: field.maxLength } : {}) }}
      onevent={event => { if (event.kind === "input.change") edit(event.name, event.value); }} />
  {/each}
</Field.FieldGroup>
```

## src/svelte/pieces/TextInput.svelte

Source SHA-256: 9596ec14aa24d49b950b912cbefb18fb01f5b215ea4495d23bb3601175589df4

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import * as Field from "../vendor/components/ui/field/index.js";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import type { InputMask } from "../../interaction/input-mask.ts";
  import FieldWell from "./FieldWell.svelte";
  import MeasuredField from "./MeasuredField.svelte";
  import MaskedInput from "./MaskedInput.svelte";
  import CharacterCounter from "./CharacterCounter.svelte";
  import ClearInput from "./ClearInput.svelte";
  import { observeEditorCapacity } from "./editor-capacity.ts";
  let { primitive, label, value = "", required = false, invalid = false, error, disabled = false,
    identity = "", mask, maxLength, onchange }: {
    label: string; value?: string; required?: boolean; identity?: string; maxLength?: number | undefined;
    invalid?: boolean; error?: string | undefined; disabled?: boolean; onchange: (value: string) => void;
  } & ({ primitive: "input.text"; mask?: InputMask | undefined } | { primitive: "input.multiline"; mask?: never }) = $props();
  const id = $props.id();
  let writing = $derived(value);
  let editor = $state<HTMLTextAreaElement | null>(null);
  $effect(() => { if (editor) return observeEditorCapacity(editor); });
  let display = $state(""), draftError = $state("");
  const context = () => `${identity}/${primitive}/${mask?.kind ?? ""}/${mask?.locale ?? ""}/${mask?.scale ?? ""}`;
  let observed = untrack(() => ({ value, context: context() }));
  let pending: string[] = [];
  $effect(() => {
    const next = { value, context: context() };
    untrack(() => {
      const acknowledgement = pending.indexOf(next.value);
      if (next.context !== observed.context || next.value !== observed.value && acknowledgement < 0) {
        draftError = ""; pending = [];
      } else if (acknowledgement >= 0) pending.splice(0, acknowledgement + 1);
      observed = next;
    });
  });
  let message = $derived(error || draftError);
  let invalidField = $derived(invalid || !!message);
  function editMasked(next: string, valid: boolean, complete: boolean) {
    if (disabled) return;
    draftError = valid && complete ? "" : valid ? "Enter a complete number." :
      `Enter a number with up to ${mask!.scale} decimal places using this field's format.`;
    if (valid && complete) { pending.push(next); onchange(next); }
  }
</script>
{#snippet counter()}<CharacterCounter id={`${id}-counter`} value={writing} {maxLength} />{/snippet}
<MeasuredField measure="writing" data-invalid={invalidField} data-disabled={disabled} data-primitive={primitive}>
  <FieldWell {id} {label} {required} footer={primitive === "input.multiline" ? counter : undefined}
    filled={(mask ? display : writing).length > 0}>
    {#snippet accessory()}<ClearInput control={id} value={mask ? display : writing} label={`Clear ${label}`} {disabled} />{/snippet}
    {#if primitive === "input.multiline"}
      <Group.Textarea {id} bind:ref={editor} bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalidField} aria-label={label} rows={4} placeholder=" "
        aria-describedby={`${id}-counter${message ? ` ${id}-error` : ''}`} onblur={event => onchange(event.currentTarget.value)}
        class="focus-visible:outline-none"
        oninput={event => onchange(event.currentTarget.value)} />
    {:else if mask}
      <MaskedInput {id} {value} {mask} {identity} bind:display {required} {disabled}
        aria-required={required} aria-invalid={invalidField} aria-label={label} placeholder=" "
        aria-describedby={message ? `${id}-error` : undefined} class="focus-visible:outline-none" onvalue={editMasked} />
    {:else}
      <Group.Input {id} bind:value={writing} {required} {disabled} aria-required={required} aria-invalid={invalidField} aria-label={label} placeholder=" "
        aria-describedby={message ? `${id}-error` : undefined} onblur={event => onchange(event.currentTarget.value)}
        class="focus-visible:outline-none"
        oninput={event => onchange(event.currentTarget.value)} />
    {/if}
  </FieldWell>
  {#if message}<Field.FieldError id={`${id}-error`} role="status">{message}</Field.FieldError>{/if}
</MeasuredField>
```

## src/svelte/pieces/MaskedInput.svelte

Source SHA-256: 03356f0b57c4d9c313b92ab402686c410abb5996970a6d2e9d5f5554eed31b8d

```svelte
<script lang="ts">
  import { untrack } from "svelte";
  import type { HTMLInputAttributes } from "svelte/elements";
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import { formatMaskedValue, readMaskedValue, maskSeparators, type InputMask } from "../../interaction/input-mask.ts";
  import { historyKey, inputEditHistory, inputSnapshot, type InputSnapshot } from "./input-edit-history.ts";
  let { value, mask, identity = "", display = $bindable(""), onvalue, onblur, onkeydown, onpointerdown, ...props }: Omit<HTMLInputAttributes,
    "value" | "type" | "files" | "oninput" | "onbeforeinput" | "oncompositionstart" | "oncompositionend" | "onchange"> & {
    value: string; mask: InputMask; identity?: string; display?: string;
    onvalue: (value: string, valid: boolean, complete: boolean) => void;
  } = $props();
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
    onkeydown?.(event); if (event.defaultPrevented || composing || event.isComposing) return;
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
<Group.Input {...props} type="text" inputmode="decimal" value={display} data-input-mask={mask.kind}
  onbeforeinput={before}
  onkeydown={keydown}
  onpointerdown={event => { history.boundary(); onpointerdown?.(event); }}
  oncompositionstart={event => { composing = true; pending = { state: inputSnapshot(event.currentTarget), kind: "composition" }; }}
  oncompositionend={event => { composing = false; edit(event.currentTarget, true); compositionInput = true; }}
  oninput={event => {
    if (composing || event instanceof InputEvent && event.isComposing) { display = event.currentTarget.value; return; }
    if (compositionInput && event.currentTarget.value === display) { compositionInput = false; pending = undefined; return; }
    compositionInput = false;
    edit(event.currentTarget, !allowDisplacedGrouping); allowDisplacedGrouping = false;
  }}
  onblur={event => { history.boundary(); onblur?.(event); }} />
```

## src/svelte/pieces/CharacterCounter.svelte

Source SHA-256: e8de6debfc5b6ef0a8021b6f7854c1a61e9ca9b486f5cd27ae2d8dde5623c117

```svelte
<script lang="ts">
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import { cn } from "../vendor/utils.js";
  let { id, value, maxLength }: { id: string; value: string; maxLength?: number | undefined } = $props();
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

## src/svelte/pieces/ClearInput.svelte

Source SHA-256: 68a2c3645b28ff57dbdf29fb9e1f2aa04970dc1d60b47dd856a512c2839528d1

```svelte
<script lang="ts">
  import * as Group from "../vendor/components/ui/input-group/index.js";
  import CircleX from "@lucide/svelte/icons/circle-x";
  let { control, value, label, disabled = false }: {
    control: string; value: string; label: string; disabled?: boolean;
  } = $props();

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
      aria-controls={control} {disabled} onclick={clear}><CircleX aria-hidden="true" /></Group.Button>
  </Group.Addon>
{/if}
```

## src/svelte/pieces/input-edit-history.ts

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

## src/svelte/ContextPanel.svelte

Source SHA-256: d51d2913ea8065caf85d4ca46797017f93bd7d6849fc742a20794f49e66c7a1f

```svelte
<script lang="ts">
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  import DestinationRow from "./pieces/DestinationRow.svelte";
  import GroupedPanel from "./pieces/GroupedPanel.svelte";
  import type { WebRendererProps } from "./renderer-contracts.ts";
  let { fields, facts, object, labels, multiline = [], actions }: WebRendererProps["context"] = $props();
  let prose = $derived(fields.filter(field => multiline.includes(field)));
  let metadata = $derived(fields.filter(field => !multiline.includes(field)));
</script>
<div data-composition="context">
    {#if prose.length}<BankRenderer node={{ version: BankVersion, kind: "fact", details: { kind: "facts", fields: prose, facts, object, labels, multiline } }} />{/if}
    {#if metadata.length}
      <BankRenderer node={{ version: BankVersion, kind: "fact", details: { kind: "facts", fields: metadata, facts, object, labels } }} />
    {/if}
    {#if actions.length}<section class="context-actions" aria-label="Actions">
      <h3>Actions</h3>
      <GroupedPanel><div data-grouped-rows>
        {#each actions as action (action.id)}
          <DestinationRow destination={action.id} label={action.label} open={action.invoke} available={action.available} />
        {/each}
      </div></GroupedPanel>
    </section>{/if}
</div>
```

## src/svelte/Facts.svelte

Source SHA-256: 5c766a15b2bd27f5e4748ff64b30738ee6264be8574e6403cccd7763e641f795

```svelte
<script lang="ts">
  import FactValue from "./pieces/FactValue.svelte";
  import type { FactsContent } from "../interaction/surface-frame.ts";
  let { fields, facts, object, labels, multiline = [] }: Omit<FactsContent, "kind"> = $props();
</script>

<dl class="bank-stack" data-material={fields.length > 0 && fields.every(field => multiline.includes(field)) ? 'interior' : 'pane'} data-prose-only={fields.length > 0 && fields.every(field => multiline.includes(field))}>
  {#each fields as field}
    <div class="fact-row" data-primitive="fact" data-multiline={multiline.includes(field)}><dt class="fact-label type-support">{labels[`${object}.${field}`]}</dt>
      <dd class="fact-value" data-reading={multiline.includes(field) ? "multiline" : "scalar"}><FactValue value={Object.hasOwn(facts, field) ? facts[field] : undefined} /></dd></div>
  {/each}
</dl>
```

## src/svelte/Review.svelte

Source SHA-256: 74b7a56c8022381d8b605c07f1afe2b748afbf2bb07694c4d1778b1716575b29

```svelte
<script lang="ts">
  import type { FrameContent } from "../interaction/surface-frame.ts";
  import BankRenderer from "./BankRenderer.svelte";
  import { BankVersion } from "../interaction/bank-node.ts";
  let { details, recovery }: Extract<FrameContent, { kind: "review" }> = $props();
</script>
<div data-composition="review"><BankRenderer node={{ version: BankVersion, kind: "fact", details }} /></div>
{#if recovery}<p class="mt-4 text-muted-foreground" role="status">{recovery}</p>{/if}
```

## src/svelte/pieces/DestinationRow.svelte

Source SHA-256: 26085952bead7db8adbe02dfdb0ef1f05befb054cd4b4a63a55fc9ab15253886

```svelte
<script lang="ts">
  import { Button } from "../vendor/components/ui/button/index.js";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
let { destination, label, available, open }: {
    destination: string; label: string; available: boolean; open: () => void;
  } = $props();
</script>
<Button variant="row" size="row" class="destination-row" type="button"
  data-piece="destination-row" data-destination={destination} data-grouped-row
  disabled={!available} onclick={open}>
  <span class="destination-title">{label}</span>
  <ChevronRight data-icon="inline-end" data-control-chevron data-destination-chevron aria-hidden="true" />
</Button>
```

## src/svelte/pieces/Drawer.svelte

Source SHA-256: 5a5e7fcdb483ef87b67ad45f284e8b89cdef437e565310705c2565e504117567

```svelte
<script lang="ts">
  import { tick } from 'svelte';
  import * as Dialog from "../vendor/components/ui/dialog/index.js";
  import DrawerGrip from "./DrawerGrip.svelte";
  import { prefersReducedMotion } from "svelte/motion";
  import { drawerMotion } from "./drawer-motion.svelte.ts";
  import { useSurfaceHost } from "./surface-host.svelte.ts";
  import SurfaceFrame from "../SurfaceFrame.svelte";
  import type { SurfaceFrame as Frame } from "../../interaction/surface-frame.ts";
  import { transientFrame } from "../../interaction/transient-frame.ts";
  import type { SurfaceIntent } from "../../interaction/intent.ts";
  import { surfaceFocus } from "./surface-focus.svelte.ts";
  import { adaptiveSurfaceLayout } from './adaptive-surface-layout.ts';
  import { adaptiveModality } from './adaptive-modality.svelte.ts';
let { label, open, locked = false, onclose, onclosed, frame, invoke, edit }: {
    label: string; open: boolean; locked?: boolean; onclose: () => void;
    onclosed?: () => void; frame: Frame; invoke: (intent: SurfaceIntent) => void;
    edit?: (name: string, value: string) => void;
  } = $props();
  let composition = $derived(transientFrame(frame, locked));
  let content = $state<HTMLElement | null>(null);
  let opener: HTMLElement | null = null;
  let wasOpen = false;
  $effect.pre(() => {
    if (open && !wasOpen) opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    wasOpen = open;
  });
  const close = () => {
    const navigation = composition.bottom.secondary;
    if (locked || navigation?.state !== "ready") return;
    if (navigation.intent.kind === "close") onclose();
    else invoke(navigation.intent);
  };
  const host = useSurfaceHost();
  const owner = Symbol('adaptive-pane');
  const layout = $derived(adaptiveSurfaceLayout(host.availableInline, host.textSize, host.canDock(owner)));
  const docked = $derived(layout.docked);
  const modal = $derived(open && !docked);
  $effect(() => { host.reserve(owner, open && docked ? layout.reservation : 0); });
  $effect(() => () => host.reserve(owner, 0));
  adaptiveModality(() => content, () => modal);
  const motion = drawerMotion(close, () => locked || docked, () => layout.edge);
  const dragHeader = (event: PointerEvent) => {
    const target = event.target as HTMLElement;
    if (docked || layout.edge === 'bottom' || !target.closest(".workspace-header") || target.closest(
      "button,a,input,textarea,select,[contenteditable],.toolbar-title,.toolbar-subtitle")) return;
    motion.down(event);
  };
  const enter = surfaceFocus(() => content);
  const focus = (event: Event) => {
    enter(event);
  };
  const restore = (event: Event) => {
    event.preventDefault();
    const target = opener, active = document.activeElement;
    const ownsFocus = !active || active === document.body || content?.contains(active);
    if (ownsFocus) void tick().then(() => {
      if (target?.isConnected && !target.closest('[inert],[hidden]')) target.focus({ preventScroll: true });
    });
  };
</script>
<Dialog.Root {open} dismissOnInactive={false} onOpenChange={next => { if (!next) close(); }}
  onOpenChangeComplete={next => { if (!next) { motion.reset(); onclosed?.(); } }}>
    <Dialog.Content bind:ref={content} presentation="panel" showCloseButton={false} data-composition="transient"
      adaptiveModal={!docked} trapFocus={false} preventScroll={modal}
      data-adaptive-surface data-presentation={docked ? 'docked' : 'transient'} data-locked={locked || undefined}
      overlayStyle={motion.overlayStyle}
      data-reduced-motion={prefersReducedMotion.current} data-edge={motion.edge}
      style={`--panel-width:${layout.paneWidth}px;--adaptive-left:${host.bounds.left}px;--adaptive-top:${host.bounds.top}px;--adaptive-right:${host.bounds.right}px;--adaptive-bottom:${host.bounds.bottom}px;transform:${motion.transform}`} data-dragging={motion.dragging || undefined}
      onpointerdown={dragHeader} onpointermove={motion.move} onpointerup={motion.up}
      onpointercancel={motion.cancel} onlostpointercapture={motion.lost}
      onOpenAutoFocus={focus} onCloseAutoFocus={restore}
      onEscapeKeydown={event => { if (locked || (docked && !content?.contains(document.activeElement))) event.preventDefault(); }}
      onInteractOutside={event => { if (locked || docked) event.preventDefault(); }}>
      <Dialog.Title class="sr-only">{label}</Dialog.Title>
      <Dialog.Description class="sr-only">Close to return. Unsaved writing stays in this session.</Dialog.Description>
      {#if motion.edge === "bottom" && !docked}<DrawerGrip {motion} {locked} />{/if}
      <SurfaceFrame frame={composition} {edit} presentation="transient" invoke={intent => intent.kind === "close" ? close() : invoke(intent)} />
    </Dialog.Content>
</Dialog.Root>

<style>
  :global(.drawer[data-adaptive-surface]) {
    top:calc(var(--adaptive-top) + max(var(--surface-inset),env(safe-area-inset-top,0px)));
    right:calc(var(--adaptive-right) + max(var(--surface-inset),env(safe-area-inset-right,0px)));
    bottom:calc(var(--adaptive-bottom) + max(var(--surface-inset),env(safe-area-inset-bottom,0px)));
  }
  :global(.drawer[data-adaptive-surface][data-edge="bottom"]) {
    left:calc(var(--adaptive-left) + max(var(--surface-inset),env(safe-area-inset-left,0px)));
  }
  :global(.drawer[data-adaptive-surface][data-presentation="docked"] .workspace-header) { cursor:auto; }
</style>
```

## src/svelte/pieces/drawer-motion.svelte.ts

Source SHA-256: 9f0106f6693c5479d864ae100c75098c02aa2754849691c236413d43205f7297

```ts
import { untrack } from "svelte";
import { swipeMotion } from "./swipe-motion.svelte.ts";

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
      if (locked()) return;
      const target = event.currentTarget as HTMLElement;
      target.closest(".drawer")?.getAnimations().forEach(animation => animation.finish());
      motion.down(event);
    },
    move: motion.move, up: motion.up, click: motion.click, cancel: motion.cancel, lost: motion.lost, reset: motion.reset,
  };
}
```

## src/validation-result.ts

Source SHA-256: 5d570948b6810035555e97db589d83769b4a39f72a4c804460ef8a170dcfaff5

```ts
import type { ErrorObject } from "ajv";
import { freezeDeep, jsonSnapshot } from "./json.ts";

export type ValidationIssue = {
  readonly keyword: string;
  readonly instancePath: string;
  readonly schemaPath?: string;
  readonly params?: Readonly<Record<string, unknown>>;
};
export type ValidationResult = { readonly valid: boolean; readonly issues: readonly ValidationIssue[] };
type Validator = { (value: unknown): boolean; errors?: readonly ErrorObject[] | null };

/** Snapshot validator diagnostics before its next call; never derive another set of constraints. */
export function inspectValidation(validate: Validator, value: unknown): ValidationResult {
  let input;
  try { input = jsonSnapshot(value); }
  catch { return freezeDeep({ valid: false, issues: [{ keyword: "json_value", instancePath: "" }] }); }
  const valid = validate(input);
  const issues = (validate.errors ?? []).map(error => ({ keyword: error.keyword,
    instancePath: error.instancePath, schemaPath: error.schemaPath, params: structuredClone(error.params) }));
  return freezeDeep({ valid, issues });
}
```

## src/web/client/field-feedback.ts

Source SHA-256: 95db0fa98b98139b62f0d0069bdcf71bc8f7427e89fd2d44bcd68dab7936c8fc

```ts
import type { ValidationIssue, ValidationResult } from "../../validation-result.ts";

function message(issue: ValidationIssue): string {
  const limit = issue.params?.limit;
  if (issue.keyword === "required" || (issue.keyword === "minLength" && limit === 1)) return "Enter a value.";
  if (issue.keyword === "minLength" && typeof limit === "number") return `Enter at least ${limit} characters.`;
  if (issue.keyword === "maxLength" && typeof limit === "number") return `Use no more than ${limit} ${limit === 1 ? "character" : "characters"}.`;
  return "Check this value.";
}

/** Presentation only: paths and keyword parameters are supplied by canonical validation. */
export function fieldFeedback(result: ValidationResult, touched: readonly string[]): Readonly<Record<string, string>> {
  if (result.valid) return {};
  const errors: Record<string, string> = {};
  for (const issue of result.issues) {
    const path = issue.instancePath.split("/");
    const name = issue.keyword === "required" && issue.instancePath === "" ? issue.params?.missingProperty
      : path.length === 2 ? path[1]!.replace(/~1/g, "/").replace(/~0/g, "~") : undefined;
    if (typeof name === "string" && touched.includes(name) && !Object.hasOwn(errors, name)) {
      Object.defineProperty(errors, name, { value: message(issue), enumerable: true });
    }
  }
  return errors;
}
```

## src/web/client/model.ts

Source SHA-256: b6a9d6624fc970ac5f54ad42b128242569d0a7b94750f6f4a0ca2233bbb6035c

```ts
import type { HumanSurface, Mutation, ValidateInput, Offer } from "../types.ts";
import { humanState } from "./state.ts";
import { webTransport } from "./transport.ts";
import { observeWebConnection } from "./connection.ts";
import { mutationFlow } from "./mutations.ts";

export function humanProduct(surface: HumanSurface, validate: ValidateInput, options: { reading?: boolean } = {}) {
  const store = humanState(surface);
  const transport = webTransport(surface.contractDigest);
  let readEpoch = 0;
  let stopped = false;
  let reading = options.reading ?? true;
  let stopConnection: (() => void) | undefined;
  const primary = surface.journeys.find(journey => journey.id === surface.navigation.primaryAction) as Mutation;
  const ready = (id: string) => store.get().availability.journeys[id]?.dependenciesReady === true;

  async function refresh() {
    const epoch = ++readEpoch;
    if (!reading || !ready(surface.navigation.entry)) return;
    const selectedId = store.get().selectedId;
    try {
      const run = await transport.call("begin", { journeyId: surface.navigation.entry });
      const records = await transport.call("read", { runId: run.id });
      if (epoch !== readEpoch) return;
      store.update({ records, loaded: true });
      if (selectedId) {
        const detailRun = await transport.call("begin", { journeyId: surface.navigation.entry, subject: selectedId });
        const [detail] = await transport.call("read", { runId: detailRun.id });
        const offers: Record<string, Offer> = {};
        for (const journeyId of surface.navigation.subjectActions) {
          if (ready(journeyId)) offers[journeyId] = await transport.call("offer", { journeyId, subject: selectedId });
        }
        if (epoch === readEpoch) store.update({ detail: detail ?? null, offers });
      }
    } catch { /* Retain the last view; the independent observer reports dependency failures. */ }
  }
  const mutations = mutationFlow(surface, store, transport, validate, refresh);
  return {
    snapshot: store.get, subscribe: store.subscribe, ...mutations,
    async start(invitation?: string) {
      if (stopped) return;
      if (invitation) {
        try { await transport.connect(invitation); }
        catch { store.update({ error: "BROWSER_SESSION_REQUIRED" }); }
      }
      if (stopped) return;
      stopConnection = observeWebConnection(surface, transport, snapshot => {
        const wasReady = ready(surface.navigation.entry);
        store.update({ availability: snapshot });
        const isReady = ready(surface.navigation.entry);
        if (!isReady) readEpoch++;
        if (!wasReady && isReady) void refresh();
      });
    },
    stop() { stopped = true; readEpoch++; stopConnection?.(); },
    setReading(enabled: boolean) {
      if (reading === enabled) return;
      reading = enabled;
      readEpoch++;
      if (enabled) void refresh();
    },
    create() {
      if (store.get().busy || store.get().uncertain || !ready(primary.id)) return;
      const current = store.get();
      const draft = Object.fromEntries(primary.inputFields.map(name => [name, current.draft[name] ?? ""]));
      store.update({ view: "create", creationOrigin: current.view === "detail" ? "detail" : "list",
        draft, prepared: null, notice: "", error: null });
    },
    edit(field: string, value: string) {
      if (!primary.inputFields.includes(field)) return;
      const current = store.get();
      // A departing control can blur after completion; it no longer owns the draft.
      if (current.view !== "create" && current.view !== "list") return;
      store.update({ draft: { ...current.draft, [field]: value },
        draftRevision: current.draftRevision + (current.draft[field] === value ? 0 : 1),
        touchedFields: current.touchedFields.includes(field) ? current.touchedFields : [...current.touchedFields, field] });
    },
    async select(id: string) {
      if (store.get().busy || store.get().uncertain || !ready(surface.navigation.entry)) return;
      store.update({ view: "detail", selectedId: id, detail: null, offers: {}, prepared: null, notice: "" });
      await refresh();
    },
    back() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      const view = current.view === "review" ? (current.mutationId === primary.id ? "create" : "detail")
        : current.view === "create" ? current.creationOrigin : "list";
      store.update({ view, prepared: null, notice: "" });
    },
    dismissError() { store.update({ error: null }); },
    close() {
      if (store.get().busy || store.get().uncertain) return;
      const current = store.get();
      store.update({ view: current.view === "create" ? current.creationOrigin : "list", prepared: null, notice: "" });
    },
    primary,
  };
}
```

## src/web/client/mutations.ts

Source SHA-256: 39feb004ca4374bd86acffa87771c5d5bbc32e33670d95ef368370e3bfdf78f3

```ts
import type { HumanSurface, Mutation, ValidateInput, Receipt } from "../types.ts";
import type { HumanStore } from "./state.ts";
import { TransportError, type Transport } from "./transport.ts";

export function mutationFlow(surface: HumanSurface, store: HumanStore, transport: Transport,
  validate: ValidateInput, refresh: () => Promise<void>) {
  function ready(id: string) { return store.get().availability.journeys[id]?.dependenciesReady === true; }
  function failure(error: unknown) { store.update({ error: error instanceof TransportError ? error.code : "OPERATION_FAILED" }); }
  async function completed(receipt: Receipt) {
    const current = store.get();
    if (!current.prepared || receipt.id !== current.prepared.id || receipt.object.id !== current.prepared.object.id) {
      throw new TransportError("INVALID_RESPONSE");
    }
    const wasCreate = current.mutationId === surface.navigation.primaryAction;
    store.update({ prepared: null, uncertain: false, receiptMissing: false, view: "detail", selectedId: receipt.object.id,
      detail: null, offers: {},
      notice: "Saved", ...(wasCreate && current.preparedRevision === current.draftRevision ? { draft: {}, touchedFields: [] } : {}) });
    await refresh();
  }
  async function invoke(journey: Mutation, subject?: string) {
    const current = store.get();
    const input = subject ? {} : { ...current.draft };
    if (current.busy || current.uncertain || !ready(journey.id) || !validate(journey.commandId, input)) return;
    store.update({ busy: true, pendingAction: "invoke", receiptMissing: false, error: null, notice: "" });
    try {
      const run = await transport.call("begin", { journeyId: journey.id, ...(subject ? { subject } : {}) });
      const prepared = await transport.call("prepare", { runId: run.id, input });
      if (prepared.runId !== run.id || prepared.journeyId !== journey.id) throw new TransportError("INVALID_RESPONSE");
      if (!subject && current.draftRevision !== store.get().draftRevision) return;
      store.update({ prepared, mutationId: journey.id, preparedRevision: current.draftRevision });
      if (surface.commit[journey.id] === "review") store.update({ view: "review" });
      else if (surface.commit[journey.id] === "submit") await acceptPrepared();
      else throw new TransportError("INVALID_COMMIT_MODE");
    } catch (error) { failure(error); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  async function acceptPrepared() {
    const current = store.get();
    if (!current.prepared || !current.mutationId) throw new TransportError("INVALID_OPERATION");
    try {
      if (!ready(current.mutationId)) throw new TransportError("CONTROLLER_UNAVAILABLE");
      store.update({ pendingAction: "accept", receiptMissing: false });
      const receipt = await transport.call("accept", { intentId: current.prepared.id,
        confirmationDigest: current.prepared.confirmationDigest });
      await completed(receipt);
    } catch (error) {
      const code = error instanceof TransportError ? error.code : "OPERATION_FAILED";
      const uncertain = current.uncertain || ["CONNECTION_LOST", "COMMIT_UNCERTAIN", "CONTROLLER_UNAVAILABLE", "INVALID_RESPONSE"].includes(code);
      store.update({ uncertain, ...(uncertain ? { view: "recovery" } : {}) });
      failure(error);
    }
  }
  async function accept() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    if (current.view !== "review" && current.view !== "recovery") return;
    store.update({ busy: true, pendingAction: "accept", receiptMissing: false, error: null, notice: "" });
    try { await acceptPrepared(); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  async function recover() {
    const current = store.get();
    if (current.busy || !current.prepared || !current.mutationId || !ready(current.mutationId)) return;
    store.update({ busy: true, pendingAction: "recover", receiptMissing: false, error: null, notice: "" });
    try {
      const receipt = await transport.call("receipt", { intentId: current.prepared.id });
      if (receipt) await completed(receipt);
      else store.update({ receiptMissing: true });
    } catch (error) { failure(error); }
    finally { store.update({ busy: false, pendingAction: null }); }
  }
  return { invoke, accept, recover };
}
```

## src/web/client/transport.ts

Source SHA-256: 369d3f15d3b805fad99bd1ee92887391e637f525a773d262c822e7c2e834d382

```ts
import type { ApiMethods, Evidence } from "../types.ts";

export class TransportError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; }
}

export function webTransport(digest: string) {
  async function request(path: string, body?: unknown): Promise<unknown> {
    try {
      const response = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST",
        headers: { "Content-Type": "application/json", "X-Desert-Contract": digest },
        credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(path === "availability" ? 1200 : 20000),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      const result = await response.json();
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
    async call<K extends keyof ApiMethods>(method: K, input: ApiMethods[K]["input"]): Promise<ApiMethods[K]["output"]> {
      return await request(method, input) as ApiMethods[K]["output"];
    },
  };
}
export type Transport = ReturnType<typeof webTransport>;
```

## src/web/gateway.ts

Source SHA-256: 5f5509536eb450568c4f901780ae9eb5b30f929c3eb75b3d682bb777265faf0c

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import type { LocalSession } from "../local.ts";
import { localBrowserAccess } from "./access.ts";
import { dispatch } from "./dispatch.ts";

async function readBody(request: IncomingMessage) {
  if (request.headers["content-type"] !== "application/json") throw new Error("INVALID_REQUEST");
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 65536) throw new Error("REQUEST_TOO_LARGE");
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new Error("INVALID_REQUEST"); }
}

export function localWebGateway(session: LocalSession, digest: string) {
  const access = localBrowserAccess();
  const availability = session.watchAvailability();
  const exposedErrors = new Set(["INVALID_REQUEST", "REQUEST_TOO_LARGE", "UNKNOWN_OPERATION", "UNAUTHENTICATED",
    "BROWSER_SESSION_REQUIRED", "INSTALLATION_MISMATCH", "CONTRACT_MISMATCH", "PRECONDITION_FAILED", "VERSION_CONFLICT",
    "NOT_FOUND", "RUN_EXPIRED", "INVALID_INPUT", "CONFIRMATION_MISMATCH", "INTENT_CONFLICT", "INVALID_RUN_STATE",
    "JOURNEY_NOT_EXPOSED", "JOURNEY_NOT_INSTALLED"]);
  return {
    invitation: access.invitation,
    close: availability.dispose,
    async handle(request: IncomingMessage, response: ServerResponse, origin: string) {
      response.setHeader("Content-Type", "application/json");
      response.setHeader("Cache-Control", "no-store");
      function send(status: number, value: unknown) { response.writeHead(status); response.end(JSON.stringify(value)); }
      try {
        if (request.headers.host !== new URL(origin).host ||
          (request.headers["sec-fetch-site"] && !["same-origin", "none"].includes(String(request.headers["sec-fetch-site"])))) {
          return send(403, { error: "ORIGIN_REJECTED" });
        }
        if (request.method === "POST" && request.headers.origin !== origin) return send(403, { error: "ORIGIN_REJECTED" });
        const operation = new URL(request.url!, origin).pathname.slice("/api/".length);
        if (operation === "connect" && request.method === "POST") {
          const input = await readBody(request);
          response.setHeader("Set-Cookie", access.connect(input?.invitation));
          return send(200, { contractDigest: digest });
        }
        if (!access.authenticated(request.headers.cookie)) return send(401, { error: "BROWSER_SESSION_REQUIRED" });
        if (request.headers["x-desert-contract"] !== digest) return send(409, { error: "CONTRACT_MISMATCH" });
        if (operation === "availability" && request.method === "GET") return send(200, availability.evidence());
        if (request.method !== "POST") return send(405, { error: "METHOD_NOT_ALLOWED" });
        return send(200, await dispatch(session, operation, await readBody(request)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const code = message.startsWith("COMMIT_UNCERTAIN") ? "COMMIT_UNCERTAIN" :
          exposedErrors.has(message) ? message : "CONTROLLER_UNAVAILABLE";
        send(code === "CONTROLLER_UNAVAILABLE" ? 503 : 409, { error: code });
      }
    },
  };
}
```

## src/web/dispatch.ts

Source SHA-256: c4d79d1a2fea0da070b1757863af4ef5ceaa79918bc44b616a5f0f962449dc55

```ts
import type { LocalSession } from "../local.ts";
import { createSchemaValidator } from "../validation.ts";
import { Requests, type Method, type RequestInput } from "./protocol.ts";

const validators = Object.fromEntries(Object.entries(Requests).map(([method, schema]) =>
  [method, createSchemaValidator(schema)]));

export function dispatch(session: LocalSession, method: string, value: unknown) {
  if (!Object.hasOwn(Requests, method)) throw new Error("UNKNOWN_OPERATION");
  if (!validators[method]!(value)) throw new Error("INVALID_REQUEST");
  const handlers: { [K in Method]: (input: RequestInput<K>) => ReturnType<LocalSession[K]> } = {
    begin: input => session.begin(input.journeyId, input.subject),
    prepare: input => session.prepare(input.runId, input.input),
    read: input => session.read(input.runId),
    accept: input => session.accept(input.intentId, input.confirmationDigest),
    receipt: input => session.receipt(input.intentId),
    offer: input => session.offer(input.journeyId, input.subject),
  };
  return handlers[method as Method](value as never);
}
```

## src/local/session.ts

Source SHA-256: 14aad4401461750325fa0125842eac4cfdee72f072c2069e4c8af9d50e30fe11

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

export function localSession(database: Database, program: LocalProgram, token: string, surface: string, lifetime: number) {
  database.assertOpen();
  program.application.surface(surface);
  const transact = <T>(operation: (client: PoolClient, actor: string) => Promise<T>) =>
    database.transaction(async client => {
      await requireInstallation(client, { product: program.application.id, digest: program.application.digest, role: program.role });
      const result = await operation(client, await authenticate(client, token));
      await authenticate(client, token);
      return result;
    });
  const session = Object.freeze({
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
    async prepare(runId: string, input: unknown) {
      const snapshot = jsonSnapshot(input);
      return transact((client, actor) => prepareMutation(client, program, actor, surface, runId, snapshot));
    },
    accept(intentId: string, confirmationDigest: string) {
      return transact((client, actor) => acceptMutation(client, program, actor, surface, intentId, confirmationDigest));
    },
    receipt(intentId: string) {
      return transact((client, actor) => recoverReceipt(client, program, actor, surface, intentId));
    },
  });
  rememberSession(session, { application: program.application, surface, role: program.role });
  return session;
}
export type LocalSession = ReturnType<typeof localSession>;
```

## src/local/admission.ts

Source SHA-256: 459ba00f7a0f320a7e80f6d9a77c8d157ed28d9c6e2d79b73804727e64578204

```ts
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import type { StoredObject } from "./types.ts";

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
  return freezeDeep(records.map(record => {
    if (!program.application.validate(journey.object, record.facts).valid) throw new Error("CORRUPT_OBJECT");
    return { id: record.id, version: record.version,
      facts: Object.fromEntries(fields.map(field => [field, record.facts[field]!])) };
  }));
}
```

## src/local/prepare.ts

Source SHA-256: acf9ec0e1e481e93fa223f77dcf28f553f5d11b96f0840777a351972d17672a1

```ts
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize, preparedView } from "./effects.ts";
import type { Facts, Intent } from "./types.ts";

export async function prepareMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, runId: string, input: unknown) {
  const run = await admittedRun(client, program, actor, surface, runId);
  const journey = program.journey(surface, run.journey);
  if (journey.kind !== "mutation") throw new Error("NOT_A_MUTATION_JOURNEY");
  if (!program.application.validateInput(journey.command.id, input).valid) throw new Error("INVALID_INPUT");
  const values = input as Facts;
  const { rows: [existing] } = await client.query<Intent>("SELECT * FROM desert_intents WHERE run_id = $1", [run.id]);
  if (existing) {
    if (canonical(existing.input) !== canonical(values)) throw new Error("INTENT_CONFLICT");
    return preparedView(program, run, existing);
  }
  if (run.state !== "admitted") throw new Error("INVALID_RUN_STATE");
  const record = journey.command.kind === "update"
    ? await ownedObject(client, program, actor, journey.command.object, run.subject!) : undefined;
  const effect = materialize(program, journey, actor, values, record?.id ?? randomUUID(), record);
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

Source SHA-256: a8b57bde79b65a8decd9b314f6b0826b1cc294af9e1879d450a441905b5ad38b

```ts
import type { PoolClient } from "pg";
import { freezeDeep } from "../json.ts";
import type { LocalProgram } from "./program.ts";
import { admittedRun, ownedObject, requireLiveRun } from "./records.ts";
import { canonical, confirmationDigest, materialize } from "./effects.ts";
import { requireUUID, type Intent, type Receipt } from "./types.ts";

async function loadIntent(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  requireUUID(id);
  const { rows: [intent] } = await client.query<Intent>(`SELECT i.* FROM desert_intents i
    JOIN desert_runs r ON i.run_id = r.id WHERE i.id = $1 AND r.actor = $2 AND r.surface = $3`, [id, actor, surface]);
  if (!intent) throw new Error("NOT_FOUND");
  const run = await admittedRun(client, program, actor, surface, intent.run_id, true);
  if (confirmationDigest(run, intent.input, intent.effect) !== intent.confirmation_digest) throw new Error("CORRUPT_INTENT");
  return { intent, run };
}

async function receipt(client: PoolClient, id: string) {
  const { rows: [row] } = await client.query<{ result: Receipt }>("SELECT result FROM desert_receipts WHERE intent_id = $1", [id]);
  return row ? freezeDeep(row.result) : null;
}

export async function recoverReceipt(client: PoolClient, program: LocalProgram, actor: string, surface: string, id: string) {
  await loadIntent(client, program, actor, surface, id);
  return receipt(client, id);
}

export async function acceptMutation(client: PoolClient, program: LocalProgram, actor: string,
  surface: string, id: string, expectedDigest: string) {
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
  const effect = materialize(program, journey, actor, intent.input, intent.effect.objectId, record);
  if (canonical(effect) !== canonical(intent.effect)) throw new Error("EFFECT_CHANGED");
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
  const result: Receipt = { id, runId: run.id, commandId: journey.command.id, status: "completed",
    object: { id: effect.objectId, type: effect.objectType, version } };
  await client.query("INSERT INTO desert_receipts (intent_id, result) VALUES ($1, $2)", [id, JSON.stringify(result)]);
  await client.query("UPDATE desert_runs SET state = 'completed' WHERE id = $1", [run.id]);
  return freezeDeep(result);
}
```

## src/local/database.ts

Source SHA-256: d27d992ab8dc0ef099865e51066235e9bf2c5644e0426486ab7c81b9d1c7636e

```ts
import { readFileSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { Pool, type PoolClient } from "pg";
import { requireDurablePrimary, requireInstallation } from "./installation.ts";

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

  async function install(product: string, digest: string, role: string) {
    await transaction(async client => {
      await requireDurablePrimary(client);
      await client.query("SELECT pg_advisory_xact_lock(842721)");
      await client.query(readFileSync(new URL("./schema.sql", import.meta.url), "utf8"));
      await client.query(`INSERT INTO desert_installation VALUES (true, 1, $1, $2, $3)
        ON CONFLICT DO NOTHING`, [product, digest, role]);
      await requireInstallation(client, { product, digest, role });
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
