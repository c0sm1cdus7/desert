// A code-bound work stamp charges each guess to its sender without trusting IP headers or sharing a lockout.
import { createHash } from "node:crypto";
export const invitationShape = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
export function validInvitationProof(code: string, proof: unknown): boolean {
  if (
    !invitationShape.test(code) ||
    typeof proof !== "number" ||
    !Number.isSafeInteger(proof) ||
    proof < 0 ||
    proof > 0xffff_ffff
  )
    return false;
  const digest = createHash("sha256").update(`desert-invitation-work-v1:${code}:${proof}`).digest();
  return digest[0] === 0 && digest[1] === 0;
}
export function solveInvitationProof(code: string): number {
  if (!invitationShape.test(code)) return 0;
  for (let proof = 0; proof <= 0xffff_ffff; proof++) if (validInvitationProof(code, proof)) return proof;
  throw new Error("invitation-proof-exhausted");
}

export function invitationAttempts(
  redeem: (code: string) => Readonly<{ status: number; key?: string }>,
  now: () => number,
  generation: () => object,
) {
  let window = now(),
    attempts = 0,
    current = generation();
  const misses = new Map<string, number>();
  return (code: string, proof: unknown): Readonly<{ status: number; key?: string }> => {
    if (validInvitationProof(code, proof)) {
      if (current !== generation()) {
        current = generation();
        misses.clear();
      }
      if ((misses.get(code) ?? 0) > now()) return { status: 400 };
      const result = redeem(code);
      if (result.status === 400) {
        if (misses.size >= 256) misses.delete(misses.keys().next().value ?? "");
        misses.set(code, now() + 60_000);
      }
      return result;
    }
    if (now() >= window + 60_000) {
      window = now();
      attempts = 0;
    }
    // Unproven traffic never consumes a proven code's capacity, regardless of forged origin headers.
    return { status: ++attempts > 10 ? 429 : 400 };
  };
}
