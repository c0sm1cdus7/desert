// Presenta Reglas en el menú del sistema con sus palabras propias y sin configuración de la distribución.
import { rulesTexts as words } from "../../../texts/rules.texts.ts";
import type { ToolWords } from "../ports/house-ports.ts";
const ruleWords: ToolWords = {
  name: words.name,
  key: "r",
  system: true,
  empty: words.empty,
  listed: words.history,
  reads: {},
  presents: [],
};
export const withRulesWords = <S extends { words: Readonly<Record<string, ToolWords>> }>(
  registry: readonly { id: string }[],
  shown: S,
): S =>
  registry.some(tool => tool.id === "rules") ? { ...shown, words: { ...shown.words, rules: ruleWords } } : shown;
