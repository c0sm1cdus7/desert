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

The generated [complete source walkthrough](../skills/desert/references/web-renderer.md)
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
conversion or upload capabilities. See [coverage](BANK-COVERAGE.md).

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
open [prepare-response finding](BANK-SECURITY-FINDING.md). Installation and confirmation
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
