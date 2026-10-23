import { randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { AccessInput } from "./contract.ts";
import { credentialHash, humanIdentity } from "./sessions.ts";

export async function insertIdentity(client: PoolClient, input: AccessInput<"initialize">,
  password: { salt: string; hash: string }, administrator: boolean) {
  const id = randomUUID();
  const existing = await client.query("SELECT 1 FROM desert_identity_accounts WHERE login = $1", [input.login]);
  if (existing.rowCount) throw new Error("IDENTITY_LOGIN_UNAVAILABLE");
  await client.query(`INSERT INTO desert_identities (id, label, credential_hash, expires_at)
    VALUES ($1, $2, $3, 'infinity')`, [id, input.displayName, credentialHash(randomBytes(32).toString("base64url"))]);
  await client.query(`INSERT INTO desert_identity_accounts (identity_id, login, password_salt, password_hash, administrator, avatar_seed)
    VALUES ($1, $2, $3, $4, $5, $6)`, [id, input.login, password.salt, password.hash, administrator, input.avatarSeed ?? null]);
  return humanIdentity({ id, label: input.displayName, login: input.login, administrator, avatar_seed: input.avatarSeed });
}
