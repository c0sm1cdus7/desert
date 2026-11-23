// Render rule effect labels in every language while preserving English values in facts and action results.
import { linesIn, phrase, said, type Phrase } from "../../fields/phrases.ts";
import { ruleFormTexts } from "../../texts/rules.texts.ts";
/** Rules as data whose labels are phrases: a reader reads them in its language (`linesIn`). */
export function ruleDisplay(value: unknown): string {
  return JSON.stringify(value, (key: string, item: unknown) => {
    if ((key === "effect" || key === "outcome") && (item === "block" || item === "require-supervisor"))
      return ruleFormTexts.options[item].title;
    if (key === "operator" && item === "always") return ruleFormTexts.options.always.title;
    return item;
  });
}
/** Rules as one reader reads them, every label in each language: what an act says it found. */
export const ruleWords = (value: unknown, say: (shown: string) => Phrase): Phrase =>
  phrase(language => said(say(linesIn(ruleDisplay(value), language)), language));
