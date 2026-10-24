// Rule L, structural half. Law: approval is data only the owner writes. The ledger holds the owner's decisions (proposed and
// approved pieces); a declared piece without an entry is implemented and not approved, so the executor can add pieces
// without touching the owner's file.
// Raises APPROVALS_LEDGER. Digest verification against the tree is the second half (slice 1).
import { Value } from "@sinclair/typebox/value";
import { ApprovalsSchema, type Approvals } from "../approvals-schema.ts";
import type { LocatedDeclaration } from "./inventory.ts";
import { themeMechanism } from "../layout.ts";

export function assertLedgerStructure(value: unknown, declarations: readonly LocatedDeclaration[]): Approvals {
  const fail = (what: string): never => { throw new Error(`APPROVALS_LEDGER: ${what}`); };
  if (!Value.Check(ApprovalsSchema, value)) {
    const first = Value.Errors(ApprovalsSchema, value).First();
    return fail(first ? `${first.path || "/"}: ${first.message}` : "not a ledger");
  }
  const declared = new Set(declarations.filter(item => item.declaration.kind !== "mechanism" || item.declaration.id === themeMechanism)
    .map(item => item.declaration.id));
  for (const [id, entry] of Object.entries(value.pieces)) {
    if (entry.status !== "proposed" && !declared.has(id)) fail(`${id} is not declared; only a proposed piece may precede its declaration`);
  }
  return value;
}
