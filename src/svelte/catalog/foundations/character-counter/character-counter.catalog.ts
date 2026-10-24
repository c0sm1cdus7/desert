// CharacterCounter: the caption under a text input that counts characters, or the characters remaining against a limit,
// and turns destructive once the limit is exceeded.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { CharacterCounterContract } from "./character-counter.contract.ts";

export const CharacterCounter = defineFoundation({
  id: "character-counter",
  purpose: "Count the characters of a text value, or how many remain before its limit and by how many it is over.",
  owner: { entry: "CharacterCounter.svelte" },
  shape: "none", states: ["unlimited", "remaining", "exceeded"], approval: "required", contract: CharacterCounterContract,
} as const);
