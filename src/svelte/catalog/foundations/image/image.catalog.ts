// Image: a public or private image sized to its frame, kept hidden until decoded, with a fallback when it cannot load;
// without an image, the placeholder of missing video or audio artwork or of unavailable media (it absorbs ArtworkPlaceholder).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ImageContract } from "./image.contract.ts";

export const Image = defineFoundation({
  id: "image",
  purpose: "Show a public or private image at the rendition its frame needs, hidden until decoded, with a fallback and optional retry, or the placeholder of missing artwork.",
  messages: ["image.unavailable", "image.noCover", "image.noPoster", "image.retry"],
  owner: { entry: "Image.svelte" },
  shape: "none", states: ["loading", "ready", "error", "video", "audio", "unavailable"],
  variants: { fit: ["fill", "fit"] },
  // A placeholder fills its frame: it has no image to fit.
  stateVariants: { video: { fit: ["fill"] }, audio: { fit: ["fill"] }, unavailable: { fit: ["fill"] } },
  assets: ["bank-image.svg"],
  approval: "required", contract: ImageContract,
} as const);
