# Stable-renderer preservation gates

These scripts exercise independent headless browser contexts. They do not drive
the owner's browser, stop preview servers, edit builds, or accept product writes.
Each evidence directory must be new; earlier runs are never overwritten.

## Exact visual comparison

```sh
DESERT_PARITY_CANDIDATE=http://127.0.0.1:4395/ \
DESERT_PARITY_OUTPUT=artifacts/my-new-parity-run \
node scripts/visual-parity/compare.ts
```

Baseline defaults to the immutable approved `http://127.0.0.1:4292/` and may be
set explicitly with `DESERT_PARITY_BASELINE`. Candidate must serve the same
Landmarks component-bank content. VOID has different authored labels/content and
must not be claimed pixel-identical to Landmarks using this command.

For a VOID-to-VOID architecture migration, set `DESERT_PARITY_FAMILY=void` and
point the baseline at the approved VOID server. This opens Home and navigates
through the real sidebar to Visual catalog in fresh unauthenticated contexts;
it neither consumes the owner's launch invitation nor creates notes. Both pixel
and motion scripts use the same family selector. Do not compare unlike products.

The matrix is 390×844 and 1280×900, dark/light, initial/real-wheel scroll/search/
sidebar/transient: 20 pairs, 40 viewport PNGs, exact RGBA comparison. No masks,
tolerance, resized images, color correction, injected CSS, or font substitution.
Only the caret is hidden. Finite motion settles and temporary compositor layers
retire before static capture. Wide sidebar is already docked; compact sidebar is
opened. Sidebar trajectories are covered separately below.

## Motion comparison

```sh
DESERT_PARITY_CANDIDATE=http://127.0.0.1:4395/ \
DESERT_PARITY_OUTPUT=artifacts/my-new-motion-run \
node scripts/visual-parity/motion.ts
```

Twelve pairs cover search/sidebar/transient in both sizes/themes. Actual triggered
CSS transitions are paused, then timing, keyframes, and computed paint are compared
at normalized progress 0, .25, .5, .75, 1. This avoids comparing arbitrary wall-clock
frames. A missing transition fails rather than comparing two empty captures.

## First-open regression

```sh
DESERT_PANEL_ENTRY_EVIDENCE=artifacts/my-new-entry-run \
node --test tests/view-panel-entry.test.ts
```

The same valid frame is opened through a retained, initially closed NodeRenderer
and a previously absent View Panel. Both must traverse intermediate opacity and
animation progress. This isolates composition lifetime from controller/authentication.

## Historical VOID diagnostic

```sh
DESERT_PARITY_OUTPUT=artifacts/my-new-void-diagnostic \
node scripts/visual-parity/diagnose-void.ts
```

Defaults to historical `4399` (now stopped); set `DESERT_VOID_DIAGNOSTIC_ORIGIN`
to an active candidate, such as `http://127.0.0.1:4400/`. It records real wheel
behavior, viewport/ancestor geometry, modal locks, and forwarded native scrollTo
calls to detect an application resetting scroll position.
Unauthenticated first-open coverage is explicitly unexecuted if Create note is
disabled; the harness never bypasses admission. Use the fixture test above for
independent first-open coverage.

## Executed evidence, 2026-10-20

- `module-void-parity-self-20261020`: first VOID self-control; wrong dialog-name
  selector caused four timeouts, and one wide scroll pair differed by eight
  Home-icon corner pixels. The selector was corrected; evidence is retained.
- `module-void-parity-self-20261020-b`: corrected 4400→4400 self-control,
  19/20 exact; eight Home-icon corner pixels differ in wide/dark/scroll.
  Additional repeated-context inspection found two persistent per-context
  rasterizations, not a transition that disappeared after waiting more frames.
- `module-void-parity-20261020-a`: approved VOID→module-composed VOID,
  18/20 exact; both wide/scroll pairs have that same eight-pixel variation.
  This is not a green full-matrix result; no tolerance/mask was added.
- `module-void-motion-20261020-a`: 12/12 exact transition comparisons for the
  module-composed build against approved VOID, with unchanged visual owners.
- `stable-parity-self-20261020-c`: 4292→4292, 20/20 exact, zero changed pixels.
- `stable-parity-v128-20261020-a`: 4292→4397, 20/20 exact, zero changed pixels.
- `stable-motion-v128-20261020-a`: 4292→4397, 12/12 exact motion comparisons.
- `stable-parity-v128-final-b-20261020`: final 4292→4396, 20/20 exact, zero
  changed pixels in every pair.
- `stable-motion-v128-final-b-20261020`: final 4292→4396, 12/12 exact motion
  comparisons.
- `stable-parity-v128-final-c-20261020`: final-c 4292→4395, 20/20 exact, zero
  changed pixels in every pair after the top-toolbar action placement correction.
- `stable-motion-v128-final-c-20261020`: final-c 4292→4395, 12/12 exact motion
  comparisons.
- `view-panel-entry-red-20261020`: retained bank passed; View Panel failed first
  entry because it appeared opaque without intermediate motion.
- `view-panel-entry-green-20261020`: both passed after the lifecycle correction.
- `void-4399-regression-red-20261020-b`: real wheel left scrollTop at zero in both
  widths despite overflowing, bounded viewports and no active modal/body lock.
- `void-4399-regression-red-20261020-c`: confirms the same wheel failure and
  records application scrollTo({ top: 0 }) resets after scrolling.
- `void-4400-regression-final-b-20261020`: real wheel advances scrollTop from 0
  to 620 at both widths with no application scrollTo reset. Fresh-context note
  creation remains disabled by admission, so that diagnostic explicitly does not
  execute first-entry coverage or consume the owner's launch credentials.

Earlier `-a`/`-b` self-controls retain harness-selector/compositor-timing failures;
they are not product regression evidence. These gates do not certify every bank
state, every browser, native platforms, or the complete SDK suite. Shared-shell
parity is not closure of the separate 326-file architecture/override audit.
