// Avatar: the picture of a person or identity, drawn from a seed (never letters), from an image with its initials while it
// cannot load, or from initials alone, at portrait, compact or row size. A seed avatar can be a shuffle button that
// draws a new seed. It owns the vendor avatar family.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AvatarContract } from "./avatar.contract.ts";

export const Avatar = defineFoundation({
  id: "avatar",
  purpose: "Show a person or identity as a seeded drawing, a picture or initials, optionally as the button that shuffles its seed.",
  owner: { entry: "Avatar.svelte", mechanisms: ["press-feedback"], parts: ["SeedPortrait.svelte", "ShuffleButton.svelte"], vendor: ["avatar"] },
  shape: "none", states: ["default"],
  variants: { size: ["portrait", "compact", "row"], interaction: ["none", "shuffle"] },
  approval: "required", contract: AvatarContract,
} as const);
