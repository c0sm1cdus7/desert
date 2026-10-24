// Slice 3 transition: the playback controller moved into media-player, which keeps it internal. The pieces lanes D and E
// replace (viewer, media-object, playback-controls, playback-canvas, the toolbar's media controls) import this path until
// Batch 3 deletes them.
export { mediaPlayback, mediaTime, type MediaPlayback } from "../catalog/foundations/media-player/playback.svelte.ts";
