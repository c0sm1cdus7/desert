import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { Database } from "./database.ts";
import { humanSession } from "../identity/sessions.ts";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export async function authenticate(client: PoolClient, token: string, lock = true): Promise<string> {
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("UNAUTHENTICATED");
  const human = await humanSession(client, token, lock);
  if (human) return human.id;
  const { rows: [identity] } = await client.query(
    `SELECT id, revoked, expires_at FROM desert_identities i WHERE credential_hash = $1
      AND NOT EXISTS (SELECT 1 FROM desert_identity_accounts a WHERE a.identity_id = i.id)${lock ? " FOR SHARE" : ""}`, [hash(token)]);
  const { rows: [clock] } = await client.query("SELECT clock_timestamp() AS time");
  if (!identity || identity.revoked || identity.expires_at <= clock.time) throw new Error("UNAUTHENTICATED");
  return identity.id;
}

export function identityAdministration(database: Database) {
  return Object.freeze({
    async issue(label: string, validForMs = 30 * 24 * 60 * 60 * 1000) {
      if (typeof label !== "string" || !label.trim() || label.length > 200) throw new Error("INVALID_IDENTITY_LABEL");
      if (!Number.isSafeInteger(validForMs) || validForMs <= 0) throw new Error("INVALID_IDENTITY_LIFETIME");
      const id = randomUUID();
      const token = randomBytes(32).toString("base64url");
      await database.transaction(client => client.query(`INSERT INTO desert_identities
        (id, label, credential_hash, expires_at) VALUES ($1, $2, $3, clock_timestamp() + $4 * interval '1 millisecond')`,
      [id, label, hash(token), validForMs]));
      return Object.freeze({ id, token });
    },
    async revoke(id: string) {
      await database.transaction(client => client.query("UPDATE desert_identities SET revoked = true WHERE id = $1", [id]));
    },
  });
}
