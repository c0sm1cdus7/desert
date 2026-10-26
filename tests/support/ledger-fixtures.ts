// Fixture ledgers, so a test states the approval state it needs instead of reading whatever the owner has stamped today.
import { Value } from "@sinclair/typebox/value";
import { ApprovalsSchema, type Approvals } from "../../src/authoring/catalog/approvals-schema.ts";

/** `ledger` with no piece approved: each approved entry becomes implemented (its specimens kept), every other entry stays.
 * Under it rule L2 verifies no digest, and every exposed mount it reports is reported in the base tree as in the changed one. */
export function withoutApprovals(ledger: unknown): Approvals {
  if (!Value.Check(ApprovalsSchema, ledger)) throw new Error("LEDGER_FIXTURE: the ledger to derive from is not a valid ledger");
  return { version: ledger.version, pieces: Object.fromEntries(Object.entries(ledger.pieces).map(([id, entry]) => [id,
    entry.status === "approved" ? { status: "implemented" as const, ...entry.specimens ? { specimens: entry.specimens } : {} } : entry])) };
}
