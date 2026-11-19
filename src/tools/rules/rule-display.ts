// Render rule effect labels in the house language while preserving English values in facts and action results.
import { ruleFormTexts } from "../../texts/rules.texts.ts";
export function ruleDisplay(value: unknown): string {
  return JSON.stringify(value, (key: string, item: unknown) => {
    if ((key === "effect" || key === "outcome") && (item === "block" || item === "require-supervisor"))
      return ruleFormTexts.options[item].title;
    return item;
  });
}
