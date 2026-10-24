// SeedAvatar: a deterministic picture of an identity drawn from its seed, never from letters or initials, at portrait or
// compact size. It is Avatar with a seed source (Avatar owns the drawing and the vendor avatar family); Batch 3 prunes it.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SeedAvatarContract } from "./seed-avatar.contract.ts";

export const SeedAvatar = defineFoundation({
  id: "seed-avatar",
  purpose: "Generate a deterministic visual identity from a seed without displaying letters or initials.",
  owner: { entry: "SeedAvatar.svelte" },
  shape: "none", states: ["default"],
  variants: { size: ["portrait", "compact"] },
  approval: "required", contract: SeedAvatarContract,
} as const);
