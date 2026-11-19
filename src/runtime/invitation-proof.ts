// Bounded one-use challenges renew work before replay memory is recycled; no origin shares a lockout.
import { createHash, randomBytes } from "node:crypto";
export const invitationShape = /^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;
export function validInvitationProof(code: string, proof: unknown, challenge = ""): boolean {
  if (
    !invitationShape.test(code) ||
    typeof proof !== "number" ||
    !Number.isSafeInteger(proof) ||
    proof < 0 ||
    proof > 0xffff_ffff
  )
    return false;
  const prefix = challenge ? `desert-invitation-work-v2:${challenge}` : "desert-invitation-work-v1";
  const digest = createHash("sha256").update(`${prefix}:${code}:${proof}`).digest();
  return digest[0] === 0 && digest[1] === 0;
}
export function solveInvitationProof(code: string, challenge = ""): number {
  if (!invitationShape.test(code)) return 0;
  for (let proof = 0; proof <= 0xffff_ffff; proof++) if (validInvitationProof(code, proof, challenge)) return proof;
  throw new Error("invitation-proof-exhausted");
}
export type InvitationResult = Readonly<{ status: number; key?: string; challenge?: string }>;
type Redeem = (code: string, key?: string, oauth?: boolean) => InvitationResult | Promise<InvitationResult>;
class InvitationAttempts {
  private window: number;
  private attempts = 0;
  private epoch = "";
  private readonly spent = new Set<string>();
  private readonly pending = new Map<string, Promise<InvitationResult>>();
  private readonly redeem: Redeem;
  private readonly now: () => number;
  constructor(redeem: Redeem, now: () => number) {
    this.redeem = redeem;
    this.now = now;
    this.window = now();
  }
  private renew(): InvitationResult {
    this.epoch = randomBytes(24).toString("base64url");
    this.spent.clear();
    return { status: 428, challenge: this.epoch };
  }
  private unproven(): InvitationResult {
    if (this.now() >= this.window + 60_000) {
      this.window = this.now();
      this.attempts = 0;
    }
    return { status: ++this.attempts > 10 ? 429 : 400 };
  }
  readonly attempt = async (
    code: string,
    proof: unknown,
    challenge = "",
    key?: string,
    oauth = false,
  ): Promise<InvitationResult> => {
    if (challenge !== this.epoch) return { status: 428, challenge: this.epoch };
    if (!validInvitationProof(code, proof, challenge)) return this.unproven();
    const candidate = `${challenge}:${code}`;
    if (this.spent.has(candidate)) return key ? this.renew() : { status: 400 };
    if (this.pending.has(candidate)) return { status: 400 };
    if (this.spent.size >= 256) return this.renew();
    if (this.pending.size >= 8) return { status: 503 };
    // Spend before awaiting: concurrent replays cannot duplicate expensive verification.
    this.spent.add(candidate);
    const work = Promise.resolve().then(() => this.redeem(code, key, oauth));
    this.pending.set(candidate, work);
    try {
      return await work;
    } finally {
      this.pending.delete(candidate);
    }
  };
}
export function invitationAttempts(redeem: Redeem, now: () => number) {
  return new InvitationAttempts(redeem, now).attempt;
}
