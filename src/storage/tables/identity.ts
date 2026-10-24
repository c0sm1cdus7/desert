// Human accounts and their browser sessions.
import { Type } from "@sinclair/typebox";
import { column, nullable } from "../columns.ts";
import { defineTable, references } from "../declare.ts";
import { identitiesTable } from "./local.ts";

const closed = { additionalProperties: false } as const;

export const accountsTable = defineTable({ name: "desert_identity_accounts", primaryKey: ["identity_id"], unique: [["login"]],
  foreignKeys: [{ columns: ["identity_id"], references: references(identitiesTable, "id") }],
  indexes: [{ name: "desert_single_administrator", columns: ["administrator"], unique: true, where: "administrator" }],
  row: Type.Object({
    identity_id: column.uuid(), login: column.text(), password_salt: column.text(), password_hash: column.text(),
    administrator: column.boolean(false), failed_attempts: column.integer({ minimum: 0 }, 0), blocked_until: nullable(column.timestamp()),
    avatar_seed: nullable(column.text({ pattern: "^[a-f0-9]{16}$" })),
  }, closed) });

export const sessionsTable = defineTable({ name: "desert_identity_sessions", primaryKey: ["credential_hash"],
  foreignKeys: [{ columns: ["identity_id"], references: references(accountsTable, "identity_id") }], row: Type.Object({
    credential_hash: column.text(), identity_id: column.uuid(), expires_at: column.timestamp(), revoked: column.boolean(false),
  }, closed) });
