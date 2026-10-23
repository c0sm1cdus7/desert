import type { Finding, VisualSource } from "./model.ts";

const identity = (finding: Pick<Finding, "code" | "fingerprint">) => `${finding.code}:${finding.fingerprint}`;
const validDigest = (value: string) => /^[a-f0-9]{64}$/.test(value);
const counts = (findings: readonly Pick<Finding, "code" | "fingerprint">[]) => {
  const result = new Map<string, number>();
  for (const finding of findings) result.set(identity(finding), (result.get(identity(finding)) ?? 0) + 1);
  return result;
};

/** Audit reconciliation, never rendering permission. A reviewed source must use
 * one exact replacement family for one historical forwarding occurrence.
 * The report and baseline retain their original findings without mutation. */
export function reconcileReviewedNarrowings(current: VisualSource, historical: VisualSource) {
  const removedCurrent = new Set<string>(), removedHistorical = new Set<Finding>();
  const originalCounts = counts(historical.findings), currentCounts = counts(current.findings);
  const claimed = new Map<string, string>();
  const invalid = (): never => { throw new Error(`INVALID_VISUAL_DEBT_REVIEW: ${current.path}`); };
  const mismatch = (): never => { throw new Error(`NEW_VISUAL_DEBT: narrowing witness mismatch ${current.path}`); };
  for (const original of historical.findings) {
    const reviews = original.reviewedNarrowings;
    if (!reviews) continue;
    const originalId = identity(original), alternatives = new Set<string>(), digests = new Set<string>();
    if (original.code !== "OPEN_COMPONENT_INPUT" || !reviews.length || originalCounts.get(originalId) !== 1) invalid();
    for (const review of reviews) {
      if (!validDigest(review.sourceDigest) || !review.reason.trim() || !review.findings.length
        || digests.has(review.sourceDigest)) invalid();
      digests.add(review.sourceDigest);
      for (const replacement of review.findings) {
        const replacementId = identity(replacement), owner = claimed.get(replacementId);
        if (replacement.code !== original.code || !validDigest(replacement.fingerprint)
          || originalCounts.has(replacementId) || owner && owner !== originalId) invalid();
        claimed.set(replacementId, originalId);
        alternatives.add(replacementId);
      }
    }
    if (![...alternatives].some(key => currentCounts.has(key))) continue;
    const selected = reviews.find(review => review.sourceDigest === current.digest);
    if (!selected) return mismatch();
    if (currentCounts.has(originalId)) mismatch();
    const expected = counts(selected.findings);
    for (const key of alternatives) if ((currentCounts.get(key) ?? 0) !== (expected.get(key) ?? 0)) mismatch();
    for (const key of expected.keys()) removedCurrent.add(key);
    removedHistorical.add(original);
  }
  return {
    current: current.findings.filter(finding => !removedCurrent.has(identity(finding))),
    historical: historical.findings.filter(finding => !removedHistorical.has(finding)),
  };
}
