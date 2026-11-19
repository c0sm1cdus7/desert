// Filtra cartas con evidencia vigente y elige la de menor costo de referencia.
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
export function eligibleMindCards<T extends MindCandidate>(
  cards: readonly T[],
  role: string,
  providers: readonly string[],
  needs: readonly Capability[],
  fingerprint: Readonly<{ cases: string; skill: string; frameTexts: string }>,
): T[] {
  required(cards, "cards");
  if (!role) throw new Error("role");
  required(providers, "providers");
  required(needs, "needs");
  required(fingerprint, "fingerprint");
  if (!fingerprint.cases || !fingerprint.skill || !fingerprint.frameTexts) throw new Error("fingerprint");
  return cards.filter(card => {
    const result = [...card.results].reverse().find(each => each.role === role);
    return (
      providers.includes(card.provider) &&
      needs.every(need => card.capabilities.includes(need)) &&
      Number.isSafeInteger(card.referenceNanoUsd) &&
      card.referenceNanoUsd >= 0 &&
      !!result &&
      result.passed &&
      result.cases > 0 &&
      result.scenes === result.cases * 3 &&
      (["cases", "skill", "frameTexts"] as const).every(key => result.fingerprint[key] === fingerprint[key])
    );
  });
}
