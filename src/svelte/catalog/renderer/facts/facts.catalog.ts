// Facts: the renderer entry for a facts body; it hands the body to the fact group.
import { defineComposition } from "../../../../authoring/catalog/define.ts";
import { FactsContract } from "./facts.contract.ts";

export const Facts = defineComposition({
  id: "facts",
  purpose: "Read a labeled value, including the difference between an empty value and an unknown value.",
  owner: { entry: "Facts.svelte" },
  uses: ["fact-group"], renders: ["fact"], approval: "none", contract: FactsContract,
} as const);
