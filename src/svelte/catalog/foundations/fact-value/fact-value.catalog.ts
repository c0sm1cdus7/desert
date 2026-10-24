// FactValue: the reading of one scalar fact; an unknown or empty value shows a muted icon and an accessible state.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactValueContract } from "./fact-value.contract.ts";

export const FactValue = defineFoundation({
  id: "fact-value",
  purpose: "Read one scalar fact as text, or show that it is unknown or empty with a muted icon and an accessible state.",
  owner: { entry: "FactValue.svelte" },
  shape: "none", states: ["known", "empty", "unknown"],
  approval: "required", contract: FactValueContract,
} as const);
