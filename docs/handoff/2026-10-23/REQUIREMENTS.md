# Owner requirements and decision precedence

These requirements consolidate the 2026-10-22 and 2026-10-23 walkthrough, approvals,
corrections and subsequent skeptical audits. They are requirements, **not claims
that the checkpoint implements them correctly**. Later explicit decisions replace
earlier alternatives. Product mockup approval is not approval of every low-level
implementation technique or an exemption from the catalog law.

## The visual law

The owner's formulation is: "LO QUE NO ESTÁ EN EL BANCO VISUAL NO EXISTE."
Every visible pixel must belong to an existing, defined and approved catalog
foundation, or an approved composition of those foundations. This applies inside
the SDK as well as to product consumers. Internal/shared/private naming grants
no exemption. A composition cannot manufacture a new visual block in its body.

The catalog has exactly two discovery categories: **Foundations** and
**Compositions**. Foundations are actual basic components, including ordinary
Button, input controls, image and avatar. Compositions are permitted arrangements
from a surface or toolbar down to grouped content. No "Shared Compositions" or
"Product Examples" category can hide building blocks that the product uses.

Approval is not a boolean an implementation agent may set for itself. Existing
components, actual states and composition recipes must be inspectable. Proposed
additions need explicit owner review; approving a mockup does not automatically
approve an undocumented primitive used to approximate it. Private foundation
implementation details are legitimate only under that foundation's ownership,
not as an alternate toolkit for compositions.

## Shared anatomy and interactions

| Area | Required behavior |
| --- | --- |
| Left and right surfaces | Same entry/exit motion, with the approved former sidebar as reference. Mirror direction only. Shared progress, layout reservation and lifetime; matching duration numbers alone are insufficient. |
| Surface structure | Main surface owns content and docking areas. Top/bottom accept toolbars; root lateral docks accept surfaces. A mounted surface may have its own top/bottom toolbars, never another lateral surface. |
| Toolbar | Back/Close at top left. Contextual actions and Search at top right. Navigation toggle at the approved bottom position. Overflow uses the approved speed dial with readable labels. |
| Header handoff | Header title/subtitle in content while visible; toolbar identity appears only when the header scrolls away. No duplicate visible title. |
| Title and subtitle | Page, toolbar and dialog identities share compact spacing and secondary/attenuated subtitle hierarchy. Every page identity needs a useful subtitle. Catalog purpose belongs there, not in a redundant Purpose stack. |
| Ordinary forms | Close at top left; primary icon-only check at top right saves. No small right-aligned bottom action cluster. |
| Wizards | Bottom Back/Close and Continue actions occupy equal 50/50 rails only for actual multi-step flows. Do not turn ordinary editors into wizards. |
| Buttons | Intrinsic size; never stretch a button to imitate a row. Text or icon, not both competing inside a button. Labels beside speed-dial icons are not a mixed button. No arbitrary right-aligned content action such as Surface's former Open transient footer. |
| Action versus object rows | Action/navigation rows always have a representative face/icon. Object rows preserve actual content. One shared row anatomy, consistent measures, dividers and alignment. |
| Row subtitles | Optional real content, not blank reserved height. Chevron/accessories center against the complete title/subtitle block. Task summary says Open, not Status · open. |
| Fact rows | Capitalize labels without rewriting user values. Label left, value right; balanced wrapping within the value column. Reading paragraphs are a distinct explicit composition, not an alternate fact layout. |
| Empty facts | No visible "— Empty". Use no text or a single dash as appropriate; omit empty optional reading sections/groups. Unknown/offline is not known-empty. |
| Dropdowns | Shared field well, persistent label and consistent height. Appearance's former Text size field supplied the reference anatomy. No thin unlabeled reference field or input floating without its well. |
| Field hover | Rounded feedback within the actual select/field bounds, not a rectangular highlight on only its internal input. |
| Helpers | Specific guidance belongs to the input, with accessible association; general guidance belongs in the page subtitle. No detached paragraph of password/identity restrictions below the form. |
| Focus | Transient focus outline follows the actual rounded surface, without clipped square edges. Accessory controls and standalone centered actions must remain centered. |

## Appearance and access

The latest Appearance decision supersedes the earlier request for a theme dropdown:

- Dark and Light are selectable square previews, like wallpaper options, showing
  the real effect. Do not offer System as a new option. Do not silently overwrite
  an existing persisted System preference during migration.
- Text size has its own stack and a compact labeled select, not a full-width control.
- Tint uses smaller visual swatches and tighter horizontal spacing, retaining an
  accessible hit target. Its label is Tint, not UI tint.
- Wallpaper uses system-generated Silk/Mist/Plain; no Choose image, file upload or
  arbitrary user-image background in Appearance/onboarding.
- Appearance uses a palette icon, not System's cog.
- The selector card, tint swatch, wallpaper preview and selected/focus/disabled
  treatment must each resolve to approved visual blocks. Publishing the overall
  Appearance composition is not sufficient.

Lock and onboarding mockups were approved subject to the global catalog rule:
exactly two onboarding steps, identity credentials together then appearance;
seeded non-letter avatar; no password confirmation, extra Ready step or unsupported
biometric/recovery claims. Completion is Get started, text-only without an arrow.
The later functional subtitle proposal is "Create your identity to access VOID."
Identity/password constraints attach to their respective inputs.

The lock incident remains an explicit rejection case: no private pill-shaped
password implementation; use the approved password-capable input. Its accessory
and Use another identity action must be correctly centered. Do not infer a global
ban on every previously approved rounded button from the complaint about this
unapproved input. The controlling rule is approved component anatomy, not a newly
invented blanket geometry rule.

## Home and attention

The latest direction replaces module-specific Open tasks and Notes lists:

- One Attention stack aggregates all objects requiring the current identity's
  attention, independent of module. Open business state alone does not mean attention.
- The same amber pulsing indicator marks attention everywhere the object appears;
  reduced motion uses a steady indicator. No competing per-module attention styles.
- One Widgets stack contains useful glanceable module summaries, not another list
  of objects. A widget can show a meaningful status graphic and navigates to its
  module when activated. Modules need not all publish widgets.
- A widget graphic must itself use approved foundations; useful information does
  not authorize a composition to invent a chart.

## Tasks and Notes

- Preserve shared create/read/edit/Trash/Restore and receipt/authority semantics.
- Tasks expose named state selection rather than unexplained Complete/Reopen icons.
- Projects are optional labels/relationships, not mandatory containers. The current
  source has typed project references; do not regress to arbitrary text labels.
- Latest direction removes project creation from the reference dropdown. Tasks +
  offers separate Create task / Create project actions in the shared speed dial.
- Project selection uses a proper labeled field, names and color bullets. Do not
  duplicate creation, force an empty project or silently change business semantics.
- Notes/Media management navigation such as Trash is a separate action row with
  a representative face, not an unexplained top-toolbar collection shortcut.
- Restore uses an undo/restore meaning, not a search icon. Recovering an uncertain
  operation is a different command and must not share accidental semantics.
- Expansion of Notes/Tasks must follow existing product requirements, not new
  invented fields. Collaboration, participants, actor assignment and task
  conversations are broader pending scope, not part of this enforcement repair.

## Media

- Destination title is Media, not My images: it includes image, video and audio.
- One library with mixed collections and consistent viewer behavior. Collection
  edit occurs in collection context; image editing in its viewer context.
- + directly opens the native file picker, filtered from actually supported format
  contracts; cancel leaves the view unchanged. No menu/form before that picker.
- Any subsequent import/configuration surface is transient, never docked, even on
  a wide viewport. Filter and validation have one source of truth.
- Collection/header title follows the shared scroll-to-toolbar rule.
- Never ship private media in a public build or publish Apple's reference assets.

## Loading, connection and catalog navigation

No flash of Empty before reads finish. Shared loading placeholders preserve stable
geometry; known cached content may remain readable offline. Commands requiring the
controller are unavailable without it; no create/delete pretending to succeed.
Offline local drafts and eventual upload were discussed as future capability, not
permission to invent an unqualified write queue or automatic replay policy.

Catalog state inspection includes loading/offline where applicable to foundations
and compositions, with behavior as well as appearance. Stateless decorative pieces
may inherit host state; the agent must state such ownership rather than fabricate
a connection of their own or silently omit coverage.

Catalog entry navigation stays within the Visual Catalog destination. Back is in
the toolbar; the content header becomes the selected entry name and purpose.
Catalog examples use the exact same production owners. Every used variant and
state is discoverable; implementation-file count and screenshot count are not
proof of complete coverage. Do not hide unresolved entries by removing examples.
