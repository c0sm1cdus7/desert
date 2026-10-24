// PlaceContent: a place's checked content, its header and each of its stacks.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceContentContract } from "./place-content.contract.ts";

export const PlaceContent = defineComposition({
  id: "place-content",
  purpose: "Show a place's checked content: its header and each of its stacks.",
  owner: { entry: "PlaceContent.svelte" },
  uses: ["place-header", "stack"], approval: "none", contract: PlaceContentContract,
} as const);
