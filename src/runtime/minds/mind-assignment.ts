// Filters hand-assignable cards by provider, capabilities and a valid reference price.
import type { Capability } from "../../fields/capabilities.ts";
export type MindCandidate = Readonly<{
  name: string;
  version: string;
  provider: string;
  capabilities: readonly Capability[];
  referenceNanoUsd: number;
  results: readonly Readonly<{
    role: string;
    passed: boolean;
    cases: number;
    scenes: number;
    fingerprint: Readonly<{ cases: string; skill: string; frameTexts: string }>;
  }>[];
}>;
const required = (value: unknown, name: string) => {
  if (value === undefined || value === null) throw new Error(name);
};
/** Cards are assigned by hand; a card is selectable when its provider is enabled, it has every needed
 * capability and a valid reference price. Bank results only compose the catalog offline. */
export function eligibleMindCards<T extends MindCandidate>(
  cards: readonly T[],
  providers: readonly string[],
  needs: readonly Capability[],
): T[] {
  required(cards, "cards");
  required(providers, "providers");
  required(needs, "needs");
  return cards.filter(
    card =>
      providers.includes(card.provider) &&
      needs.every(need => card.capabilities.includes(need)) &&
      Number.isSafeInteger(card.referenceNanoUsd) &&
      card.referenceNanoUsd >= 0,
  );
}
