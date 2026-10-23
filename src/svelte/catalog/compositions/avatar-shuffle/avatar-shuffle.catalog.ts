// Declares this piece as it is at the start of the Visual Catalog migration (slice 0).
// Placeholder states and stub contract are replaced when the piece is migrated (slices 2-4).
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AvatarShuffleContract } from "./avatar-shuffle.contract.ts";

export const AvatarShuffle = defineComposition({
  id: "avatar-shuffle",
  purpose: "Generate a new avatar seed on activation and reveal the shuffle overlay on hover or focus.",
  owner: { entry: "AvatarShuffle.svelte" },
  uses: ["seed-avatar"], approval: "none", contract: AvatarShuffleContract,
} as const);
