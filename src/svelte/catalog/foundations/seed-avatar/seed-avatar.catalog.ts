// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { SeedAvatarContract } from "./seed-avatar.contract.ts";

export const SeedAvatar = defineFoundation({
  id: "seed-avatar",
  purpose: "Generate a deterministic visual identity from a seed without displaying letters or initials.",
  owner: { entry: "SeedAvatar.svelte", vendor: ["avatar"] },
  shape: "none", states: ["default"], approval: "required", contract: SeedAvatarContract,
} as const);
