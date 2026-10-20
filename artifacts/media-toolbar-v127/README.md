# Gallery toolbar order — 2026-10-20

Owner requested Close as the leading toolbar item, before title/subtitle.
Only the existing Button's source order in shared `Viewer.svelte` changed.
No private styles, new primitives, focus removal or motion changes.

Frozen build: `build/landmarks-integration-v127a`
Renderer revision: `62b4b2d6eb374b0c40293959ad907c32ca09b3fb9e2201e515a66abb72b4946b`
Contract digest: `7642a0bc0d664c73ee7728d441e1a534efe7767fb520e36edbaed8046f76c2d9`

## Executed evidence

- Before implementation, both new `media-toolbar.test.ts` cases failed against
  v126c at the first-child assertion: actual false, expected true (390/1280px).
- After implementation, both pass: source order, geometry, initial focus,
  subsequent Tab focus and close/focus-return.
- Existing `media-gallery.test.ts` and `media-gestures.test.ts` pass.
- `npm run typecheck` and `npm run authoring:check` pass.
- `390.png` and `1280.png`: actual Chromium renders at 820px height, DPR 2,
  dark appearance, White Cliffs of Dover. Captured after keyboard Tab (the reset
  button's visible focus is intentional). Both were visually inspected.

These are implementation evidence, not a new approval proposal. Native Safari
and VoiceOver were not exercised; existing qualifications/limitations remain.
