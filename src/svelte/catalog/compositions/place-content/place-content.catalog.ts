// PlaceContent: a place's checked content as one document region: its embedded heading and each of its stacks.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { PlaceContentContract } from "./place-content.contract.ts";

export const PlaceContent = defineComposition({
  id: "place-content",
  purpose: { key: "placeContent.purpose" },
  messages: ["placeContent.purpose"],
  owner: { entry: "PlaceContent.svelte" },
  uses: ["place-heading", "stack", "view-region"], approval: "none", contract: PlaceContentContract,
} as const);
