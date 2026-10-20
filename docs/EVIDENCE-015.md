# Typed composition and feedback — 2026-10-15

## Owner findings and boundary

The catalog reproduced real renderer defects: rectangular input hover outside a
rounded well, a footer border touching the last field, and a transient composed
from raw facts with no visible top toolbar, padding or bottom anchoring. A later
finding showed destination rows shrinking like standalone buttons and exposing
their rectangular edges. The owner also required destructive errors, yellow
warnings and primary spinners.

The bank is typed semantic data, not HTML/CSS or a component registry. The Svelte
registry is now named `renderer-registry.ts`. `surface-frame.ts` defines the closed
`desert.surface-frame/1` grammar and derives its TypeScript types. Top, content and
bottom are required. Only installed content objects are admitted; arbitrary HTML,
styles, classes, snippets and callbacks are not part of the object. Action IDs are
resolved by the existing host, not arbitrary business callbacks in product data.

The existing controller and Notebook product contract are unchanged. Creation
still submits directly, archival still reviews, and acceptance still uses the
admitted prepared operation. Context destinations remain rows and its only footer
action is surface dismissal. There is no data repin, migration or reset.

## Implementation

- `src/web/client/frame.ts` and `src/interaction/frame-presenters.ts` derive frames
  from the compiled contract and current state. They do not redeclare constraints.
- `SurfaceFrame.svelte` owns visible top, padded scroll content and stable bottom.
  Drawer accepts a frame instead of arbitrary children. Catalog uses that renderer.
- Existing shadcn Field/InputGroup/Button and Bits UI dialog behavior are reused.
  Tailwind supplies frame layout. No new product-specific page or control engine.
- The input well contains child paint; the group, not its square child, owns hover.
- Destination rows retain geometry during press, inherit only outer well corners,
  and keep separators contiguous. Press color and keyboard focus remain visible.
- Warning has a semantic token with light/dark values. Error uses destructive;
  checking/pending uses primary. Spinner animation respects reduced motion. Icons
  and text remain present: meaning is not conveyed by color alone.

## Evidence

The new runtime contract test initially failed because the contract did not exist.
The new browser slot test failed against `notebook-approved-bank-v4` because the
drawer had no owned top/content/bottom slots. These are separate observations;
neither is a pixel-similarity benchmark.

After implementation, the first full browser run exposed duplicate accessible
landmark names in inline specimens and an outdated test equating *any* footer
with a command-step footer. Specimens no longer create redundant named regions;
the context assertion now requires exactly the Close action, excluding commands.

Verified against `build/notebook-slots-v4`:

- `npm run check`: 166 passed; no skipped/pending/failing tests; TypeScript passes.
- `npm run web:check`: zero errors and warnings.
- `DESERT_WEB_BUILD=build/notebook-slots-v4 npm run test:web`: 19 passed.
- Negative static examples include omitted top, raw HTML and injected CSS classes.
  Their expected compiler errors are checked without suppression in memory.
- Browser checks cover 1280/390 widths, short/long content, text scale 200%,
  anchored footer and header, actual scrolling, input containment, semantic colors,
  three contiguous destination rows, modal focus, reduced motion, create/read/archive
  and actual database/transport failure recovery without draft loss or write replay.
- Screenshots are under `artifacts/typed-bank/`; the live bank was inspected at 4276.

## Limits

Types enforce admitted composition data, not pixels. Runtime grammar, rendered
geometry and interaction checks are complementary gates. This does not certify
all future primitives, operating systems, browsers, screen readers or compositions.
Frame version 1 is an internal renderer-neutral composition contract, bound to
the distribution through its source revision; it does not change the existing
installed product digest or claim a released portable authoring bundle.

No upstream Tres Marías, Kenon, production or external provider was modified.
Draft authoring references were regenerated; no new skill release was published.
