// Historical fixtures preserve checks of retired APIs without shipping those APIs in the base.
import type { Capability } from "../../../src/fields/capabilities.ts";
import { type MindCandidate, eligibleMindCards } from "../../../src/runtime/minds/mind-assignment.ts";
export function initialMindAssignment<T extends MindCandidate>(
  cards: readonly T[],
  role: string,
  providers: readonly string[],
  needs: readonly Capability[],
  fingerprint: Readonly<{ cases: string; skill: string; frameTexts: string }>,
): T | undefined {
  return eligibleMindCards(cards, role, providers, needs, fingerprint).sort(
    (a, b) =>
      a.referenceNanoUsd - b.referenceNanoUsd || a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
  )[0];
}
