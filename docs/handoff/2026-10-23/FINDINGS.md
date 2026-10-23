# Independent findings and source map

Three skeptical reviewers independently examined rendering, enforcement and the
assistant's acceptance process on 2026-10-23. This is a faithful consolidated
report, not a claim of runtime reproduction or a verbatim transcript. The reviewers
made no edits and did not execute tests/builds. Paths below are relative to DESERT.
Line numbers from the audit are navigation hints for this checkpoint, not permanent IDs.

## Verdicts

- Rendering reviewer: the rule is clear; the renderer does not have a closed
  universe of visual blocks that compositions must use. The issue exceeds lock.
- Enforcement reviewer: actual guards protect partial boundaries, while internal
  compositions can still reconstruct controls from lower-level pieces.
- Process reviewer: the instruction was understood and recorded. Presence,
  registration and passing narrower tests were accepted as if they established
  structural exclusivity. There is no evidentiary basis to blame unclear user intent.

The last review also checked Appearance directly. Wallpaper is already a visible
foundation; AppearancePreferences is a visible composition; AppearancePreview is
nested in its Composition parts. **The missing authority is not simply these names.**
The selection cards, swatches and miniature UI are drawn inside compositions.
The direct Wallpaper specimen shows its default choice and the AppearancePreview
specimen shows Dark; complete per-block state discovery is not established by
being able to change options inside the aggregate Appearance example.

## Rendering counterexamples

| Evidence | What it demonstrates |
| --- | --- |
| `src/svelte/pieces/LockScreen.svelte:37` | Password reconstructed with FieldWell/Group.Input/Button and `presentation="access"`; TextInput already supports current-password. |
| `src/svelte/pieces/FieldWell.svelte` and `vendor/components/ui/input-group/input-group.svelte` | The access variant reaches `rounded-full`. A finite enum inside SDK is not visual approval. |
| `src/svelte/pieces/SearchField.svelte:20`, `search-field.css:2` | Another direct InputGroup reconstruction, `border-radius:999px`, internal button sizing; not a separately inspected search foundation. Reachable through ToolbarSearch. |
| `src/svelte/pieces/AppearancePreferences.svelte:29` | Theme/wallpaper cards use native labels and vendor RadioGroup; Tint adds a swatch pseudo-element and its own geometry/colors in lines 65–77. No separately approved selectable-card/swatch foundation owns that anatomy. |
| `src/svelte/pieces/AppearancePreview.svelte:12` | Published composition draws miniature sidebar, rows and typography with div/span/strong and independent CSS. It does reuse Wallpaper, but that does not authorize its other parts. |
| `src/svelte/pieces/SummaryWidget.svelte:31` | Published composition draws a segmented chart and legend with spans/CSS, rather than an approved chart/progress foundation. |
| `src/svelte/pieces/media/PhotoCollection.svelte:30` | Direct HTML open-viewer and pagination buttons; `media/media.css:21` owns their geometry/focus/pseudo-element bullets. Used directly by higher compositions too. |
| `src/svelte/pieces/ToolbarMediaControls.svelte:16`, `media/media.css:37` | Generic vendor Button receives external thumbnail size/radius/border/opacity overrides. Importing Button does not alone preserve its anatomy. |
| `src/svelte/pieces/PlaceHeading.svelte:20` | Native `<video controls>` admits browser-rendered controls, unlike the separate PlaybackCanvas/PlaybackControls path. Installed via ContentFlow/CatalogWorkspace; not asserted to be visible in current Home. |
| `src/svelte/pieces/media/PlaybackControls.svelte:25` | Vendor Slider supplies volume/seek, with no corresponding inspectable Slider foundation in the current visible inventories. |
| `src/svelte/pieces/AccessForm.svelte:48` | Local h1 and independent responsive type scale instead of the shared heading owner. |
| `src/svelte/vendor/components/ui/button/button.svelte:8` | Base `self-start justify-self-start` affects placement in parent compositions, explaining lock alignment failures. The canonical Action repeats this policy. |

The visible Button example dispatches semantic action to `Action.svelte`. Other
compositions import a more permissive vendor Button with class/rest props and many
variants/sizes/presentations. The allowed visual factory is wider than the inspected
Button contract. Not every variant is inherently wrong; the authority mismatch is.

## Catalog fragmentation

`src/svelte/catalog-manifest.ts` has 100 implementation owners: 56 closed,
16 private-composition, 23 unsealed, four finite-inputs, one dispatcher. The visible
catalog combines 24 semantic IDs and a manual list of 31 shared owners in
`src/svelte/catalog/shared-owners.ts`, classified by `shared-purpose.ts`.
There are overlapping routes; these are not 55 unique foundations. Another six
foundation metadata groups in `src/interaction/catalog-ownership.ts` mean something
different from the two discovery categories requested by the owner.

Only 51 distinct implementation owners belong to the union of the bank-owner and
shared-owner lists. The remainder includes legitimate infrastructure; **49 is not
a count of visual bugs**. The finding is that the visible catalog, implementation
manifest and reachable visual sources do not form one enforceable authority graph.

## Enforcement gaps

| Source | Verified gap |
| --- | --- |
| `src/authoring/visual-boundary/composition.ts`, `inspect.ts`, `closed.ts:53` | Internal compositions may own native DOM/CSS/vendor imports; most caller restrictions concern externally supplied markup/props. |
| `tests/visual-private-composition-inventory.test.ts:9` | Locally authored native markup is accepted. Related tests accept a raw h1 in an internal snippet. |
| `tests/visual-boundary.test.ts:35` | A composition with a private grid div/style is expected to pass. Structural layout alone is allowed by the older written contract; this test is not, by itself, proof every div is illegal. The missing distinction is structural layout versus new visual-control ownership. |
| `src/authoring/web-catalog/check.ts:17` | Checks registered owner to existing source; does not establish the inverse mapping of every executable visual source to approved authority. |
| `src/authoring/visual-boundary/dependency-graph.ts:60` | Sealed adapter traversal stops at the catalog gateway, not at a transitively proven foundation graph. |
| `src/authoring/visual-boundary/model.ts`, `closed.ts:71` | Unknown Svelte can classify as composition, and unsealed/unknown targets do not receive the same closed-caller checks. |
| `src/build/svelte/project.ts:27`, `src/authoring/visual-boundary/source.ts:21` | Real build invokes partial migrated checks, not global ownership qualification or the no-new-debt alarm. |
| `src/authoring/visual-boundary/inventory.ts:43` | Strict global qualification unconditionally throws VISUAL_OWNERSHIP_INCOMPLETE. There is no successful global certification implemented. |
| `scripts/check-visual-boundary.ts` | Strict check and no-new-debt are separate optional CLI paths. Updating the debt baseline cannot qualify existing violations. |
| `src/build/svelte/template/src/routes/+page.svelte`, `src/build/svelte/public-catalog-page.svelte`, `src/build/svelte/template/src/app.html` | Framework render entry coverage is incomplete. The bootstrap guard seals +layout; other entry sources/assets do not receive equivalent end-to-end rejection. |
| `package.json` exports | `./src/*` makes internals physically importable. The product source gate does restrict authored VOID imports, but it does not stop an SDK composition from bypassing its foundation. |

These are source-flow findings. Do not claim executed mutation results until you
actually introduce isolated negative fixtures and observe the normal build reject
them for the intended reason, with a corresponding passing positive control.

## Process findings and contrary evidence

The existing contract already says internal code is not exempt and that registering
a variant does not legitimize an override: `docs/VISUAL-CATALOG-CONTRACT.md:9`,
`:147`, `:176`; `docs/VISUAL-CATALOG-ENFORCEMENT.md:41`.
The requirement was recorded before the failed deliveries. Mockup approval did
not remove it. "It is a finite shared owner" became an unauthorized weaker rule.

Catalog ownership tests verify IDs, files, metadata and fixtures; they explicitly
retain partial qualification. Access responsive tests check overflow, presence,
screenshots and identity switching, not canonical TextInput reuse or geometric
centering. None of those green results establishes the requested impossibility.

There is also meaningful counterevidence: source gates reject many product-level
escapes; adapters have negative tests; canonical transaction/authority tests are
real; historical records retain failures and scope limitations. Do not claim all
testing was fabricated or discard useful mechanisms. The failure is treating
partial evidence as sufficient to hand over a product violating its central law.

## Coverage limits

The rendering reviewer inventoried 431 files under `src/svelte`: 416 source files
(282 Svelte, 108 TS, 26 CSS), of which 159 Svelte files are outside vendor. Pattern
inspection covered that tree; deep reading covered representative and suspect
paths across all visual families. Product source and the build/enforcement chain
were also inspected. This is not a line-by-line review of every backend file,
third-party dependency, browser state or generated artifact.

No non-vendor canvas/raw-HTML escape was found in that scan. SeedAvatar/Wallpaper
own SVG as published foundations, which is legitimate. A hidden native file input
is platform machinery, not an extra visible control. Those distinctions must
survive enforcement; a crude ban on all DOM everywhere is not the requested model.
