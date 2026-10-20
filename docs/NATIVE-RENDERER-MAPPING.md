# Native renderer mapping — proposal, not implementation

The canonical TypeScript/TypeBox bank is the only authored semantic source.
Future Swift and Kotlin bindings must be generated from its exported protocol
and validated with shared positive/negative fixtures, not maintained as parallel
handwritten product definitions. Svelte components, CSS, URL paths and DOM events
do not belong in those bindings. No Swift or Android renderer is installed.

## Preserve the logical operation

| Bank meaning | Future Apple realization | Required invariant |
| --- | --- | --- |
| `control.select`: identity, label, optional value, options and disabled/required state | A native picker/menu with stable option identities | Activating a permitted value emits one `select.change` immediately; no additional Confirm step. Dismissing or highlighting alone cannot change the value. |
| `control.money`: exact minor units and declared currencies/scales | Native text entry and the same native choice adapter | Currency changes use the existing `money.change` transition; no conversion, staged acceptance or invented domain write. |
| `control.popover`: open state and ordered typed information | A native anchored contextual popover | No task toolbar, scrim or background focus trap. Dismissal updates `popover.open`; opening does not run a command. |
| `action`: intent, label, icon and readiness | Native button/action component shared across ordinary placement and toolbars | Preserve typed intent, pending/disabled behavior and accessible name. Circular/capsule faces and borderless toolbars belong to the renderer profile, not author-supplied style fields. |
| Task/dialog frame `/6` | Appropriate native task/dialog presentation | Keep explicit journey review, uncertainty, dismissal and controller acceptance separate from local control selection. |
| Top toolbar: title/place, optional typed `face`, navigation and actions | One shared header composition over native controls | A supplied face sits above the action/title rail, horizontally centered in the full header. Absence reserves no face space. Use the same rule on persistent and transient surfaces; current presenters supply faces only for dialogs/messages. Keep dismissal reachable at enlarged text sizes. |

Apple's [SwiftUI Picker](https://developer.apple.com/documentation/swiftui/picker)
offers a selection binding and labelled, tagged choices; this is a candidate
adapter, not an additional DESERT selection model. Its binding must accept only
canonical validated transitions and reconcile owner updates without feedback
loops. An optional value is explicit absence, not the first item chosen by default.

[UIPopoverPresentationController](https://developer.apple.com/documentation/uikit/uipopoverpresentationcontroller)
provides anchoring, permitted bounds and interaction passthrough configuration.
Its system adaptation can produce a sheet on compact size classes. Consequently,
merely naming this API does not establish compliance with DESERT's nonmodal,
toolbar-free contextual interaction. Verify the actual trait/device behavior;
if an adapter cannot meet the declared semantics, report a capability gap rather
than silently turning a selector into a confirmation dialog.

## Semantic contract versus platform delivery

Stable identities, selected values, disabled options, requiredness, event kinds
and controller authority are portable. Pointer hover, keyboard focus navigation,
safe-area geometry, system material, accessibility APIs and optional haptics are
platform delivery concerns. A native adapter may use native APIs without copying
web gestures, but it may not change what counts as a committed choice.

The current renderer-requirements bundle declares finite node/event/features.
It is not an implemented Swift/Kotlin generator, native validator or comprehensive
platform-capability negotiation system. JSON Schema alone does not enforce all
semantic checks, such as unique option identities and permitted selections.
Future native adapters need those checks and shared fixture parity before claiming
support; TypeScript or schema compilation alone is insufficient.

The same distinction applies to assets: the protocol carries logical identifiers
and descriptions, while each host resolves a permitted local/native resource.
The web's media URL is not a portable asset identity. Local exercise changes are
session drafts, not receipts, persistence, uploads or admitted business commands.

## Compatibility and open boundaries

Frame `/6` removes the obsolete toolbar-bearing selection frame. Legacy
`selection.confirm` remains a recognized intent only for bank-wire compatibility;
there is no current frame/selection host for it and product dispatch rejects it.
Do not reproduce it in a new native selection adapter. Native support must pin
the exact schema and installed capability revision and reject unknown meanings.

The retained `locked` contextual-popover flag prevents dismissal, not interaction
with the underlying surface; it does not imply modal authority. Device and
assistive-technology evidence for this combination is still required. An actual
step-wizard footer exception also requires a future explicit contract; a generic
journey or multi-step implementation is not an authored wizard by inference.
