// Avatar: the picture of a person or identity, drawn from a seed (never letters), or an image over its seed drawing (shown
// while the image loads or when it cannot load), at portrait, compact or row size. A seed avatar can be a shuffle button that
// draws a new seed. It owns the vendor avatar family.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { AvatarContract } from "./avatar.contract.ts";

export const Avatar = defineFoundation({
  id: "avatar",
  purpose: { key: "avatar.purpose" }, messages: ["avatar.purpose"],
  owner: { entry: "Avatar.svelte", mechanisms: ["press-feedback"], parts: ["SeedPortrait.svelte", "ShuffleButton.svelte"], vendor: ["avatar"] },
  shape: "none", states: ["default"],
  variants: { size: ["portrait", "compact", "row"], interaction: ["none", "shuffle"] },
  approval: "required", contract: AvatarContract,
} as const);
