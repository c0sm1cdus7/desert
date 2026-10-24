// AvatarShuffle: the avatar of a new identity as a button that draws a new seed.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { AvatarShuffleContract } from "./avatar-shuffle.contract.ts";

export const AvatarShuffle = defineComposition({
  id: "avatar-shuffle",
  purpose: { key: "avatarShuffle.purpose" }, messages: ["avatarShuffle.purpose", "avatarShuffle.shuffleAvatar"],
  owner: { entry: "AvatarShuffle.svelte" },
  uses: ["avatar"], approval: "none", contract: AvatarShuffleContract,
} as const);
