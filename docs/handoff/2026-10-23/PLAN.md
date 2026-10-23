# Work plan and acceptance gates

## Phase 1 Independent proposal before implementation

Read the handoff package and both instruction files. Pin both repositories. Do not
start by fixing the lock radius or adding all missing names to the visible list.
Return an independent proposal for owner review through the original conversation.
The owner will manually relay that response; no autonomous cross-agent messaging
or external coordination is required.

Produce an inventory covering every render entry, generated host template, Svelte
owner, transitive runtime helper, stylesheet, imported visual asset and browser
drawing capability. Separate current reachability from dormant source that can be
admitted later. Trace every visible part of Appearance and Lock as worked examples.

Classify each relevant node as foundation, composition, nonvisual infrastructure,
or legitimate private implementation of a named foundation. Give its catalog entry,
dependencies, exact contract, states and approval evidence. An internal owner ID,
a test fixture, a proposal screenshot or today's implementation is not approval.
Flag missing/ambiguous approval rather than infer it. Preserve approved obligations
even if the current implementation/catalog omits them.

Resolve these design questions explicitly in the proposal:

- Which single authority generates the visible catalog, types, admissible imports,
  dependency graph and coverage obligations? What remains human approval evidence?
- How is composition layout represented without giving compositions arbitrary
  visual-control/CSS authority? Existing structural DOM allowances need precision.
- How are private parts confined to their owning foundation? How are vendor
  primitives, assets, inherited CSS and browser-native controls accounted for?
- How do actual variants/states remain discoverable without promoting every old
  override into a new approved component or exploding the catalog into helpers?
- How does a legitimate new foundation get proposed, inspected, approved and
  versioned before product use? Changing code must not preserve stale approval.
- Which build/CI entrypoints become mandatory, and what is the trusted boundary?
  A contributor able to rewrite the checker/approval evidence can defeat a local
  check; do not claim a tamper-proof security sandbox. Propose independent review
  and CI protections; changing repository rules needs separate owner authorization.

Exit condition: the owner accepts the explicit design and unresolved additions.
The current handoff is not blanket approval of any future schema or new visuals.

## Phase 2 Write independent rejection cases first

After proposal approval, establish observable failing tests against this checkpoint
in disposable worktrees/fixtures. Freeze expectations independently from the code
being checked. Pair every rejection with a valid control and assert the specific
boundary failure, not just any thrown error or missing dependency.

| Negative case | Required result |
| --- | --- |
| Recreate LockScreen password with Group/Input/FieldWell access | Normal build rejects unauthorized reconstruction before emitting a usable product. |
| Add a tint swatch or option card privately inside Appearance | Rejected unless it composes the exact approved block/recipe. |
| Put an unapproved chart inside a registered SummaryWidget | Registration of the parent does not make it pass. |
| Import vendor Button/Slider directly from a composition | Rejected outside the documented owning-foundation boundary. |
| Add CSS, inline style, class variant or pseudo-element that changes another owner's anatomy | Rejected, including transitive imports and inherited/global selectors. |
| Use snippets/children/spreads/dynamic components to inject rendering | Rejected through actual compiler/build entrypoints, not only a helper test. |
| Add drawing through JS helpers, aliases/barrels, canvas, raw HTML, SVG injection or native media controls | Rejected or confined to an explicitly approved foundation/platform boundary. |
| Add render code/assets in framework templates or an unregistered source file | Not silently copied/admitted into output. |
| Rename/move a forbidden source or update a debt baseline | Cannot convert an unauthorized implementation into accepted ownership. |
| Mutate manifest, registry, gateway, fixture or approval revision independently | Fails consistency/approval checks; catalog disappearance cannot erase an obligation. |
| Build through alternate distributions/legacy/public-catalog paths | Same required guarantee or an explicit blocked unsupported route, never silent fallback. |

Positive controls must include password TextInput with approved accessory,
selectable previews/swatches through approved components, foundation-owned SVG,
nonvisual platform file selection, valid structural layouts, and normal product
builds. Preserve runtime authority and recovery tests alongside visual cases.

## Phase 3 Establish one enforced visual authority

Implement the accepted model in DESERT, not a VOID-only linter or private renderer.
Every admitted visual part must have exactly accountable ownership. Derive catalog
inspection and implementation bindings from the same authority without losing
independent expected-behavior tests. Existing manual lists are migration inputs,
not parallel truth. No warning-only exception for current debt on qualified builds.

The real build must invoke the complete gate before producing a usable artifact.
Unknown source/semantics and incomplete ownership fail closed. A diagnostic
migration command may remain, but it must not label or emit an accepted release
through the normal product build. Do not replace an unconditional global failure
with unconditional success; demonstrate a complete accepted graph and counterexamples.

## Phase 4 Migrate all consumers and preserve product behavior

Use the inventory to migrate in bounded commits: foundations/private internals,
compositions, adapters/templates, catalog inspection, then product consumers.
Order high-risk routes first: Appearance and access, inputs/selects, buttons/rows,
typography, surfaces/toolbars/motion, media and Home widgets. Do not stop after the
reported screenshots are repaired. Preserve all accepted variants and semantics.

Do not auto-register every existing private shape. If a visual capability is genuinely
missing, propose the smallest coherent foundation or composition and obtain approval.
If an existing foundation suffices, reuse it. Ownership and approval precede use.
Retire obsolete rendering paths only after proving no required behavior depends
on them; no destructive reset or unrelated product rewrite.

## Phase 5 Verify the exact build and report every open item

Record SDK/product commit IDs, dependency versions, commands, exit results,
environment and build contract digest. Separate executed, inspected, failed,
blocked and unexecuted. Old totals and screenshots cannot certify new commits.

- Run structural negative/positive cases through the production build path.
- Run SDK and product typing/source admission plus applicable runtime tests.
- Inspect the real generated product and catalog, not a parallel mockup renderer.
- Compare the actual foundation instance/contract used by the catalog and every
  consumer. Include empty, filled, invalid, disabled, loading and offline behavior.
- Check widths including narrow 320px, enlarged text, light/dark, focus/keyboard,
  contrast, reduced motion/transparency and connection loss/reconnect as applicable.
- Measure lock accessory and secondary-action centers, input radius/height, select
  well geometry, dialog title/subtitle spacing, clipping and row accessory alignment.
- Exercise sidebar/right-surface entry, exit, reservation, reversal/interruption
  and reduced motion; matching CSS constants alone is not a motion proof.
- Verify catalog entry navigation, subtitle/scroll handoff, no duplicate header,
  and complete Appearance option/swatches/preview discovery.
- Verify real authority/recovery and preserved data under ordinary interaction;
  screenshots and disabled controls do not establish controller enforcement.

## Definition of done

Enforcement is complete only when the approved graph is exhaustive for the
delivered renderer, the normal build rejects every unauthorized escape class,
all required visible parts/states are inspectable, real product consumers use
those same owners, independent review finds no open escape, and all required
verification is executed on the delivered revisions. Missing evidence is not a pass.

The owner may review genuine new designs, but must not be the person discovering
routine contract violations after each claimed completion. Report partial progress
as partial; do not say "ready" while the central ownership guarantee remains open.

## Return package

Before implementation: proposal, findings, inventory and decision requests.
After accepted implementation: exact commit pair, architecture delta, approval
mapping, negative-test evidence, actual browser evidence, compatibility/data
impact, remaining gaps, and setup commands. Return this package for the original
conversation to review before resuming feature development. Do not merge or deploy
automatically merely because the enforcement tests pass.
