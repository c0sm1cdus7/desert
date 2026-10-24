// Rule L, structural half. Law: approval is data the owner writes; the ledger names every declared piece once.
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
  for (const id of declared) if (!Object.hasOwn(value.pieces, id)) fail(`${id} has no ledger entry`);
  for (const [id, entry] of Object.entries(value.pieces)) {
    if (entry.status !== "proposed" && !declared.has(id)) fail(`${id} is not declared; only a proposed piece may precede its declaration`);
  }
  return value;
}
