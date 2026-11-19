// Bearers live only in memory; journal digests retain replay revocation across house restarts.
import { createHash, randomBytes } from "node:crypto";
import { credentialEqual } from "../../house/doors/credential-equal.ts";
import type { OAuthCodeJournal } from "./oauth-code-journal.ts";
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
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
class OAuthCodes {
  private readonly pending = new Map<string, StoredGrant>();
  private readonly now: () => number;
  private readonly revoke: (key: string) => void;
  private readonly journal: OAuthCodeJournal;
  constructor(now: () => number, revoke: (key: string) => void, journal: OAuthCodeJournal) {
    this.now = now;
    this.revoke = revoke;
    this.journal = journal;
  }
  private retire(id: string, revokeKey: boolean) {
    const stored = this.pending.get(id);
    if (!stored) return;
    if (revokeKey) this.revoke(stored.grant.keyId);
    clearTimeout(stored.timer);
    this.pending.delete(id);
  }
  available() {
    for (const [id, stored] of this.pending) if (stored.expires <= this.now()) this.retire(id, true);
    return this.journal.active() < 4096;
  }
  issue(grant: OAuthGrant) {
    if (!this.available()) {
      this.revoke(grant.keyId);
      return undefined;
    }
    const code = randomBytes(32).toString("base64url"),
      id = digest(code);
    try {
      this.journal.issue(id, grant.keyId);
    } catch (error) {
      this.revoke(grant.keyId);
      throw error;
    }
    const timer = setTimeout(() => this.retire(id, true), 60_000);
    timer.unref();
    this.pending.set(id, { grant, expires: this.now() + 60_000, timer });
    return code;
  }
  exchange(params: URLSearchParams): string | undefined {
    const id = digest(params.get("code") ?? "");
    let stored: StoredGrant | undefined;
    for (const [fingerprint, pending] of this.pending) if (credentialEqual(fingerprint, id)) stored = pending;
    if (!stored) {
      const replay = this.journal.find(id);
      if (replay) this.revoke(replay);
      return undefined;
    }
    const { grant } = stored;
    const verifier = params.get("code_verifier") ?? "";
    const valid =
      stored.expires > this.now() &&
      credentialEqual(grant.client, params.get("client_id") ?? "") &&
      credentialEqual(grant.redirect, params.get("redirect_uri") ?? "") &&
      credentialEqual(grant.resource, params.get("resource") ?? "") &&
      /^[A-Za-z0-9._~-]{43,128}$/.test(verifier) &&
      credentialEqual(createHash("sha256").update(verifier).digest("base64url"), grant.challenge);
    if (valid) this.journal.deliver(id);
    this.retire(id, !valid);
    return valid ? grant.key : undefined;
  }
  close() {
    for (const id of this.pending.keys()) this.retire(id, true);
  }
}

export function oauthCodes(now: () => number, revoke: (key: string) => void, journal: OAuthCodeJournal) {
  return new OAuthCodes(now, revoke, journal);
}
