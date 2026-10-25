// FactValue: the reading of one scalar fact, inline or as a paragraph of reading copy; an unknown or empty value shows a
// muted icon and an accessible state.
import { defineFoundation } from "../../../../authoring/catalog/define.ts";
import { FactValueContract } from "./fact-value.contract.ts";

export const FactValue = defineFoundation({
  id: "fact-value",
  purpose: { key: "factValue.purpose" },
  messages: ["factValue.purpose", "factValue.state"],
  owner: { entry: "FactValue.svelte" },
  shape: "none", states: ["known", "empty", "unknown"],
  variants: { presentation: ["inline", "paragraph"] },
  approval: "required", contract: FactValueContract,
} as const);
