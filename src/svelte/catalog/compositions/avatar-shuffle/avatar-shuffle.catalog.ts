// AvatarShuffle: the avatar of a new identity as a button that draws a new seed.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AvatarShuffleContract } from "./avatar-shuffle.contract.ts";

export const AvatarShuffle = defineComposition({
  id: "avatar-shuffle",
  purpose: "Generate a new avatar seed on activation and reveal the shuffle overlay on hover or focus.",
  owner: { entry: "AvatarShuffle.svelte" },
  uses: ["icon", "seed-avatar"], approval: "none", contract: AvatarShuffleContract,
} as const);
