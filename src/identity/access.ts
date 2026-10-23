import type { Database } from "../local/database.ts";
import { accessInput, type AccessState, type AccessInput } from "./contract.ts";
import { credentialHash, humanSession, humanIdentity, issueHumanSession, requireHumanSession, readyAccessState } from "./sessions.ts";
import { hashPassword } from "./password.ts";
import { insertIdentity } from "./accounts.ts";
import { signIn } from "./sign-in.ts";

export function humanIdentityAccess(database: Database) {
  return Object.freeze({
    async state(token?: string): Promise<AccessState> {
      return database.transaction(async client => {
        const { rowCount } = await client.query("SELECT 1 FROM desert_identity_accounts WHERE administrator");
        if (!rowCount) return { kind: "onboarding" };
        const identity = token ? await humanSession(client, token, false) : undefined;
        return identity ? readyAccessState(identity, token!) : { kind: "locked" };
      }, true);
    },
    async initialize(value: AccessInput<"initialize">) {
      const input = accessInput("initialize", value), password = await hashPassword(input.password);
      return database.transaction(async client => {
        await client.query("SELECT pg_advisory_xact_lock(842722)");
        if ((await client.query("SELECT 1 FROM desert_identity_accounts WHERE administrator")).rowCount) throw new Error("ALREADY_INITIALIZED");
        return issueHumanSession(client, await insertIdentity(client, input, password, true));
      });
    },
    signIn(value: AccessInput<"signIn">) { return signIn(database, value); },
    async lock(token: string) {
      await database.transaction(async client => {
        await client.query("UPDATE desert_identity_sessions SET revoked = true WHERE credential_hash = $1", [credentialHash(token)]);
      });
      return { kind: "locked" as const };
    },
    async createIdentity(token: string, value: AccessInput<"createIdentity">) {
      const input = accessInput("createIdentity", value);
      await database.transaction(client => requireHumanSession(client, token, true, false), true);
      const password = await hashPassword(input.password);
      return database.transaction(async client => {
        await requireHumanSession(client, token, true);
        await client.query("SELECT pg_advisory_xact_lock(842722)");
        return insertIdentity(client, input, password, false);
      });
    },
    async listIdentities(token: string) {
      return database.transaction(async client => {
        await requireHumanSession(client, token, true, false);
        const { rows } = await client.query(`SELECT i.id, i.label, i.revoked, a.login, a.administrator, a.avatar_seed
          FROM desert_identity_accounts a JOIN desert_identities i ON i.id = a.identity_id ORDER BY a.login`);
        return rows.map(row => Object.freeze({ ...humanIdentity(row), disabled: row.revoked as boolean }));
      }, true);
    },
    async disableIdentity(token: string, identityId: string) {
      accessInput("disableIdentity", { identityId });
      await database.transaction(async client => {
        await requireHumanSession(client, token, true);
        const { rows: [target] } = await client.query("SELECT administrator FROM desert_identity_accounts WHERE identity_id = $1", [identityId]);
        if (!target) throw new Error("NOT_FOUND");
        if (target.administrator) throw new Error("ADMINISTRATOR_CANNOT_BE_DISABLED");
        await client.query("UPDATE desert_identities SET revoked = true WHERE id = $1", [identityId]);
      });
      return { disabled: true as const };
    },
  });
}
export type HumanIdentityAccess = ReturnType<typeof humanIdentityAccess>;
