import type { Database } from "../local/database.ts";
import { accessInput } from "./contract.ts";
import { humanIdentity, issueHumanSession } from "./sessions.ts";
import { passwordMatches } from "./password.ts";

export async function signIn(database: Database, value: unknown) {
  const input = accessInput("signIn", value);
  const result = await database.transaction(async client => {
    const { rows: [row] } = await client.query(`SELECT i.id, i.label, i.revoked, a.*,
      coalesce(a.blocked_until > clock_timestamp(), false) AS blocked
      FROM desert_identity_accounts a JOIN desert_identities i ON i.id = a.identity_id
      WHERE a.login = $1 FOR UPDATE OF a FOR SHARE OF i`, [input.login]);
    const matches = await passwordMatches(input.password, row?.password_salt, row?.password_hash);
    if (!row || row.revoked || row.blocked) return undefined;
    if (!matches) {
      await client.query(`UPDATE desert_identity_accounts SET
        failed_attempts = CASE WHEN blocked_until <= clock_timestamp() THEN 1 ELSE failed_attempts + 1 END,
        blocked_until = CASE WHEN (CASE WHEN blocked_until <= clock_timestamp() THEN 1 ELSE failed_attempts + 1 END) >= 5
          THEN clock_timestamp() + interval '5 minutes' ELSE NULL END WHERE identity_id = $1`, [row.id]);
      return undefined;
    }
    await client.query("UPDATE desert_identity_accounts SET failed_attempts = 0, blocked_until = NULL WHERE identity_id = $1", [row.id]);
    return issueHumanSession(client, humanIdentity(row));
  });
  if (!result) throw new Error("INVALID_CREDENTIALS");
  return result;
}
