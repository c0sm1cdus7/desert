import type { Capability } from "../../../src/fields/capabilities.ts";
import { meant } from "../../../src/fields/phrases.ts";
// Historical fixtures preserve checks of retired APIs without shipping those APIs in the base.
import { type Card, cards, costUsd } from "../../../src/adapters/models/catalog.ts";
import { modelTexts } from "../../../src/texts/model.texts.ts";
export const cardsFor = (acts: readonly Act[]): readonly Card[] => {
  required(acts, "acts");
  return cards.filter(card => lostActs(card, acts).length === 0);
};
export function withinCap(args: {
  spentUsd: number;
  capUsd: number;
  card: Card;
  maxInputTokens: number;
  maxOutputTokens: number;
}): boolean {
  required(args, "args");
  const { spentUsd, capUsd, card, maxInputTokens, maxOutputTokens } = args;
  required(card, "card");
  validNumber(spentUsd, "spentUsd");
  validNumber(capUsd, "capUsd");
  const costs = ["input", "cacheWrite", "cacheRead"].map(key =>
    costUsd(card, {
      input: key === "input" ? maxInputTokens : 0,
      cacheWrite: key === "cacheWrite" ? maxInputTokens : 0,
      cacheRead: key === "cacheRead" ? maxInputTokens : 0,
      output: maxOutputTokens,
    }),
  );
  return spentUsd + Math.max(...costs) <= capUsd;
}
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new Error(`${meant(modelTexts.missing)}: ${name}`);
};
const validNumber = (value: number, name: string) => {
  if (!Number.isFinite(value) || value < 0) throw new Error(name);
};

export const lostActs = <T extends Act>(card: Card, acts: readonly T[]): T[] => {
  required(card, "card");
  required(acts, "acts");
  return acts.filter(act => {
    required(act.needs, "needs");
    return act.needs.some(need => !card.capabilities.includes(need));
  });
};

type Act = { needs: readonly Capability[] };
