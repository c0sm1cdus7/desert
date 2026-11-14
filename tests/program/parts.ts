// A fixed count, independent of workers: the same position always belongs to the same part.
export const programPartCount = 8;

export function checksInPart<T>(checks: readonly T[], part: number): readonly T[] {
  if (!Number.isInteger(part) || part < 0 || part >= programPartCount) throw new Error(`Invalid program part: ${part}`);
  return checks.filter((_, position) => position % programPartCount === part);
}
