// The pointer gestures of a media surface (swipe to page, pinch, double-click and ctrl-wheel to zoom, pan when zoomed):
// owned by gallery, shared with media-viewer, which lists it in owner.mechanisms.
import { defineMechanism } from "../../../../authoring/catalog/define.ts";

export const MediaGesturesMechanism = defineMechanism({ id: "media-gestures", owner: "gallery", files: ["media-gestures.ts"] } as const);
