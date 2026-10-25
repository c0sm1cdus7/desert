// Gallery: one photo at a time with paging dots, swipe and arrow keys, opening the full-screen media viewer on press. It
// is the photo-collection composition made a foundation; it owns the media-gestures mechanism.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { GalleryContract } from "./gallery.contract.ts";

export const Gallery = defineFoundation({
  id: "gallery",
  purpose: "Page through a set of photos in place, inline, heading a place or as a detail's photograph, and open them in the viewer.",
  messages: ["gallery.open", "gallery.choose", "gallery.photo"],
  owner: { entry: "Gallery.svelte", mechanisms: ["media-gestures"] },
  shape: "none", states: ["single", "set"],
  variants: { presentation: ["inline", "header", "detail"], aspect: ["fill", "square", "landscape", "portrait"] },
  approval: "required", contract: GalleryContract,
} as const);
