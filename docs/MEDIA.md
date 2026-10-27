# Shared photo delivery and interaction

Implemented by the web-reference renderer in v126c; not native platform certification.
Approved decision: `artifacts/media-gallery-v125/`, revision 2. Original photos and
previous builds remain unchanged. The integration evidence is in
`artifacts/media-integration-v126/`.

## Portable meaning

Catalog `featuredMedia` accepts an image, a video, or `{ kind: 'gallery', images }`.
Gallery images are ordered `{ asset, alt }` references, with 1–10 unique assets.
A source record can declare `gallery: ['cover-asset', 'second-asset']`; its first
entry must be its existing `image`. Compilation resolves alt text from declared
assets. Missing, duplicate, mismatched-cover and non-image gallery assets fail
validation. A gallery requires `media.gallery` renderer capability; older
single-image catalogs retain their existing requirements and original URLs.

The actual Landmarks home explicitly authors Fuji, Great Barrier Reef and Sahara
as its collection. Each individual landmark still has one photograph. There are
no fabricated additional photographs, uploads, editing or sharing operations.

## Shared owners

- `catalog/foundations/image/Image.svelte`: identity-keyed DOM image, async decode, neutral
  canvas, error/retry, responsive rendition choice. Header, cards, standalone
  images, avatars and the optional background extension consume this loader.
- `PhotoCollection.svelte`: local selected index, opening/closing the viewer,
  compact page indicators and bounded neighbor preparation. Cards retain their
  navigation action and warm their destination on pointer/focus intent.
- `Viewer.svelte`: installed Dialog/Button/Toolbar composition. Window-filling
  photo canvas, keyboard focus containment/return, thumbnails, zoom controls.
- `gestures.ts`: owned pointers, drag versus tap, pinch/pan versus paging,
  cancellation, bounds and listener cleanup. No auto-advance or infinite wrap.

Selection/open/close are renderer-local interaction state, never business
journeys, writes, file persistence or catalog navigation commands. The place
title and subtitle remain unchanged as its selected photo changes.

Changing assets removes old pixels immediately, even while a network request or
decode is pending. The same asset's smaller decoded image may remain during a
larger rendition request, preventing zoom/resize flashes. Loading has no text,
spinner, progress or shimmer. Errors have an explicit retry, distinct from loading.

Dots use 24px center spacing and 24×44px non-overlapping targets, with 6px/8px
inactive/active marks. This is the accepted compact geometry, not a claim of
Apple's default target dimensions. A single photo has no dots, arrows or strip.
The photo itself has no perimeter focus ring; keyboard focus shows a small
action label. Other controls retain their focus indications. Subtitle ink is
74% white over the protective gradient, full white under increased contrast.

## Host-owned derivatives

`build/public-catalog/renditions.ts` uses pinned Sharp 0.35.5. Preparation generates
WebP at long-edge buckets 160/320/640/1280/1920/2560 with quality 82, no upscaling,
orientation correction, preserved alpha and sRGB color interpretation. Private
EXIF/XMP is not copied. Source bytes are never rewritten. Original-file fallback
remains available, including on an older host without the rendition route.

Cache identity includes source digest, encoder recipe and Sharp/libvips versions;
cache bytes are hash-checked. Preparation has two source workers. The local host
serves prepared variants at `/media/<logical-id>?w=<bucket>`, with bounded sizes,
ETag and HEAD support. It never resizes images per display request. Cached variants
remain external local bindings, not embedded in the portable product build.

The loader chooses a bucket from measured canvas size × device pixel ratio ×
zoom, and observes resize. This implementation uses measured selection rather
than misleading `w` descriptors for long-edge/portrait derivatives. Intent
prefetch is capped at two requests, four queued and eight retained image objects,
and respects save-data. It does not download entire galleries or videos ahead.

Measured Fuji: 8,035,245-byte original → 287,734-byte 1280px rendition;
its existing 2,490,515-byte thumbnail → 101,942-byte 640px rendition. Byte reduction
does not by itself certify perceptual quality; actual compact/wide renders were
also inspected. No AVIF encoder policy or server upload ingestion is introduced.

## Qualification limits

Twenty focused unit/host checks and 23 Chromium browser checks pass. The latter
include 390/1280px, light/dark, deliberate request delays, stale completions,
actual A→home→B navigation, error/retry, zoom/pan, emulated pinch, focus return,
reduced motion, docking/snapping, alignment, press feedback and search motion.
Only deliberately abandoned photo requests may report expected ERR_ABORTED in
the delayed-load test; unrelated console/network/HTTP errors still fail it.

Native Safari, VoiceOver, native trackpad inertia and exact pinch-centroid anchoring
remain unqualified. Existing bank-history restoration at 1280px also fails on
v124a and is recorded separately, not claimed fixed by this integration.
