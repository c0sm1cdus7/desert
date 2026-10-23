import { createHash, createHmac, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import type { AccessState, HumanIdentity, HumanCredential } from "./contract.ts";

export const credentialHash = (token: string) => createHash("sha256").update(token).digest("hex");
export const validCredential = (token: unknown): token is string => typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);
export function readyAccessState(identity: HumanIdentity, token: string): Extract<AccessState, { kind: "ready" }> {
  return Object.freeze({ kind: "ready", identity,
    sessionBinding: createHmac("sha256", token).update("desert.browser-session/1").digest("base64url") });
}
type IdentityRow = { id: string; label: string; login: string; administrator: boolean; avatar_seed?: string | null | undefined };
export const humanIdentity = (row: IdentityRow): HumanIdentity => Object.freeze({ kind: "human", id: row.id,
  displayName: row.label, login: row.login, role: row.administrator ? "administrator" : "member",
  ...(row.avatar_seed ? { avatarSeed: row.avatar_seed } : {}) });

export async function humanSession(client: PoolClient, token: string, lock = true): Promise<HumanIdentity | undefined> {
  if (!validCredential(token)) return undefined;
  const { rows: [row] } = await client.query(`SELECT i.id, i.label, a.login, a.administrator, a.avatar_seed
    FROM desert_identity_sessions s JOIN desert_identities i ON i.id = s.identity_id
    JOIN desert_identity_accounts a ON a.identity_id = i.id
    WHERE s.credential_hash = $1 AND NOT s.revoked AND NOT i.revoked
      AND s.expires_at > clock_timestamp() AND i.expires_at > clock_timestamp()
    ${lock ? "FOR SHARE OF i, s" : ""}`, [credentialHash(token)]);
  return row ? humanIdentity(row) : undefined;
}
export async function requireHumanSession(client: PoolClient, token: string, administrator = false, lock = true) {
  const identity = await humanSession(client, token, lock);
  if (!identity) throw new Error("UNAUTHENTICATED");
  if (administrator && identity.role !== "administrator") throw new Error("ADMINISTRATOR_REQUIRED");
  return identity;
}
export async function issueHumanSession(client: PoolClient, identity: HumanIdentity): Promise<HumanCredential> {
  const token = randomBytes(32).toString("base64url");
  await client.query(`INSERT INTO desert_identity_sessions (credential_hash, identity_id, expires_at)
    VALUES ($1, $2, clock_timestamp() + interval '8 hours')`, [credentialHash(token), identity.id]);
  return Object.freeze({ identity, token });
}
