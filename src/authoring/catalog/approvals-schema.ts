// The one schema of the approvals ledger (src/svelte/catalog/approvals.json). Only the owner stamps "approved",
// through the approve command; an approved entry always carries both digests and the owner as approver.
import { Type, type Static } from "@sinclair/typebox";
import { closed, immutable, text } from "../../views/definition.ts";
import { PieceId } from "./declaration-schema.ts";

export const LedgerVersion = "desert.catalog-approvals/1" as const;
const Day = immutable(Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }));
const Digest = immutable(Type.String({ pattern: "^[a-f0-9]{64}$" }));
/** Specimen key: `<state>|<axis>=<value>,...` with axes sorted, or just `<state>`. */
const SpecimenKey = immutable(Type.String({ pattern: "^[a-z][a-z0-9-]*(?:\\|[a-z][A-Za-z0-9]*=[a-z0-9.-]+(?:,[a-z][A-Za-z0-9]*=[a-z0-9.-]+)*)?$" }));
const Specimens = immutable(Type.Record(SpecimenKey, Type.Union([Type.Literal("proposed"), Type.Literal("approved")])));

export const PieceApprovalSchema = immutable(Type.Union([
  closed({ status: Type.Literal("implemented"), specimens: Type.Optional(Specimens) }),
  closed({ status: Type.Literal("proposed"), proposedOn: Day, reason: text }),
  closed({ status: Type.Literal("approved"), sourceDigest: Digest, contractDigest: Digest, approvedOn: Day,
    approvedBy: Type.Literal("owner"), specimens: Type.Optional(Specimens) }),
]));
export const ApprovalsSchema = closed({
  version: Type.Literal(LedgerVersion),
  pieces: Type.Record(PieceId, PieceApprovalSchema),
});
export type Approvals = Static<typeof ApprovalsSchema>;
export type PieceApproval = Static<typeof PieceApprovalSchema>;
