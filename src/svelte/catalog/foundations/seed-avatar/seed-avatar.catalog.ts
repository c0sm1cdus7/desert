// SeedAvatar: a deterministic picture of an identity drawn from its seed, never from letters or initials.
// The same seed always draws the same bands and colours, at portrait or compact size.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SeedAvatarContract } from "./seed-avatar.contract.ts";

export const SeedAvatar = defineFoundation({
  id: "seed-avatar",
  purpose: "Generate a deterministic visual identity from a seed without displaying letters or initials.",
  owner: { entry: "SeedAvatar.svelte", vendor: ["avatar"] },
  shape: "none", states: ["default"],
  variants: { size: ["portrait", "compact"] },
  approval: "required", contract: SeedAvatarContract,
} as const);
