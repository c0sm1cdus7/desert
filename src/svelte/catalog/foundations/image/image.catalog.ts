// Image: a public or private image sized to its frame, kept hidden until decoded, with a fallback when it cannot load.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { ImageContract } from "./image.contract.ts";

export const Image = defineFoundation({
  id: "image",
  purpose: "Show a public or private image at the rendition its frame needs, hidden until decoded, with a fallback and optional retry.",
  owner: { entry: "Image.svelte" },
  shape: "none", states: ["loading", "ready", "error"],
  variants: { fit: ["fill", "fit"] },
  assets: ["bank-image.svg"],
  approval: "required", contract: ImageContract,
} as const);
