// Hold short-lived grants in memory; hashed tombstones revoke a live door key on authorization-code replay.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
export type OAuthGrant = Readonly<{
  client: string;
  redirect: string;
  challenge: string;
  resource: string;
  identity: string;
  key: string;
  keyId: string;
}>;
type StoredGrant = Readonly<{ grant: OAuthGrant; expires: number; timer: ReturnType<typeof setTimeout> }>;
const digest = (value: string) => createHash("sha256").update(value).digest("base64url");
class OAuthCodes {
  private readonly pending = new Map<string, StoredGrant>();
  private readonly spent = new Map<string, string>();
  private readonly now: () => number;
  private readonly revoke: (key: string) => void;
  private readonly live: (key: string) => boolean;
  constructor(now: () => number, revoke: (key: string) => void, live: (key: string) => boolean) {
    this.now = now;
    this.revoke = revoke;
    this.live = live;
  }
  private retire(id: string, revokeKey: boolean) {
    const stored = this.pending.get(id);
    if (!stored) return;
    clearTimeout(stored.timer);
    this.pending.delete(id);
    if (revokeKey) this.revoke(stored.grant.keyId);
    else this.spent.set(id, stored.grant.keyId);
  }
  available() {
    for (const [id, stored] of this.pending) if (stored.expires <= this.now()) this.retire(id, true);
    for (const [id, key] of this.spent) if (!this.live(key)) this.spent.delete(id);
    return this.pending.size + this.spent.size < 4096;
  }
  issue(grant: OAuthGrant) {
    const code = randomBytes(32).toString("base64url"),
      id = digest(code);
    const timer = setTimeout(() => this.retire(id, true), 60_000);
    timer.unref();
    this.pending.set(id, { grant, expires: this.now() + 60_000, timer });
    return code;
  }
  exchange(params: URLSearchParams): string | undefined {
    const id = digest(params.get("code") ?? ""),
      stored = this.pending.get(id);
    const replay = this.spent.get(id);
    if (replay) {
      this.revoke(replay);
      this.spent.delete(id);
      return undefined;
    }
    if (!stored) return undefined;
    const { grant } = stored;
    const verifier = params.get("code_verifier") ?? "";
    const valid =
      stored.expires > this.now() &&
      grant.client === params.get("client_id") &&
      grant.redirect === params.get("redirect_uri") &&
      grant.resource === params.get("resource") &&
      /^[A-Za-z0-9._~-]{43,128}$/.test(verifier) &&
      timingSafeEqual(Buffer.from(digest(verifier)), Buffer.from(grant.challenge));
    this.retire(id, !valid);
    return valid ? grant.key : undefined;
  }
  close() {
    for (const id of this.pending.keys()) this.retire(id, true);
  }
}

export function oauthCodes(now: () => number, revoke: (key: string) => void, live: (key: string) => boolean) {
  return new OAuthCodes(now, revoke, live);
}
