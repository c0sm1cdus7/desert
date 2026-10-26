// The DESERT tree itself satisfies every implemented catalog rule: no undeclared visual file, consistent
// declarations, and a ledger that names every piece. Slice-0 exit condition, kept as a permanent guard.
// Its approvals are the owner's: whatever is approved today, each approved entry is the owner's stamp of the current bytes.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { Value } from "@sinclair/typebox/value";
import { ApprovalsSchema, type Approvals } from "../src/authoring/catalog/approvals-schema.ts";
import { contractDigest, sourceDigest, type DigestTree, type ReadBytes } from "../src/authoring/catalog/digest.ts";
import { ruleL2 } from "../src/authoring/catalog/gate/approvals.ts";
import { contentViolations, readCatalogTree, runCatalogGate } from "../src/authoring/catalog/gate/run.ts";
import { formatViolation } from "../src/authoring/catalog/gate/violation.ts";
import { DesertLayout } from "../src/authoring/catalog/layout.ts";
import { withoutApprovals } from "./support/ledger-fixtures.ts";
import { realContext, realLedger, realSource } from "./support/real-tree.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const disk: ReadBytes = path => { try { return new Uint8Array(readFileSync(join(root, path))); } catch { return undefined; } };
const tree = await readCatalogTree(root, DesertLayout);
const digestTree: DigestTree = { layout: DesertLayout, paths: tree.paths, declarations: tree.declarations };
const today = new Date().toISOString().slice(0, 10);

/** Every way an approved entry is not the owner's stamp of the bytes `read` returns, computed the way `approve` computes it. */
function stampProblems(ledger: Approvals, read: ReadBytes): string[] {
  const problems: string[] = [];
  for (const [id, entry] of Object.entries(ledger.pieces)) {
    if (entry.status !== "approved") continue;
    if (entry.approvedBy !== "owner") problems.push(`${id}: approved by ${String(entry.approvedBy)}`);
    const day = new Date(`${entry.approvedOn}T00:00:00Z`);
    if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== entry.approvedOn || entry.approvedOn > today) {
      problems.push(`${id}: approvedOn ${entry.approvedOn} is not a past calendar day`);
    }
    if (sourceDigest(digestTree, id, read) !== entry.sourceDigest) problems.push(`${id}: the source digest does not match the sources`);
    if (contractDigest(digestTree, id, read) !== entry.contractDigest) problems.push(`${id}: the contract digest does not match the contract`);
  }
  return problems;
}
const ledgerOf = (value: unknown): Approvals => {
  assert.ok(Value.Check(ApprovalsSchema, value), "the ledger is a valid ledger");
  return value;
};
/** A copy of `ledger` with `id` stamped from `read`, exactly as the approve command stamps it. */
const stamped = (ledger: Approvals, id: string, read: ReadBytes): Approvals => ({ ...ledger, pieces: { ...ledger.pieces, [id]: {
  status: "approved", sourceDigest: sourceDigest(digestTree, id, read), contractDigest: contractDigest(digestTree, id, read),
  approvedOn: "2026-10-26", approvedBy: "owner" } } });
const digestChanges = (ledger: unknown, changes: Readonly<Record<string, string>> = {}) => ruleL2(realContext(changes, ledger))
  .filter(item => item.code === "FOUNDATION_UNAPPROVED_CHANGE").map(formatViolation);

test("the DESERT tree passes rules A, B and L", async () => {
  const checked = await runCatalogGate(root, { layout: DesertLayout, rules: ["A", "B", "L"] });
  assert.ok(checked.declarations.length > 0);
});

test("every approved piece carries the owner's stamp of its current sources and contract", async () => {
  const ledger = ledgerOf(tree.ledger);
  assert.deepEqual(stampProblems(ledger, disk), [], "only the approve command run by the owner stamps a piece, and a changed byte needs a new stamp");
  const { violations } = await contentViolations(root, tree, { layout: DesertLayout, rules: ["L2"] });
  assert.deepEqual(violations.filter(item => item.code === "FOUNDATION_UNAPPROVED_CHANGE").map(formatViolation), [],
    "the gate's rule L2, reading the tree from disk, agrees: no approved digest has drifted");
});

test("a hand-edited approved entry whose digests do not match the sources fails", () => {
  const id = "heading", base = withoutApprovals(realLedger), handSet = "0".repeat(64);
  assert.ok(tree.declarations.some(item => item.declaration.id === id), "the tree declares heading");
  const forged: Approvals = { ...base, pieces: { ...base.pieces, [id]: { status: "approved", sourceDigest: handSet, contractDigest: handSet,
    approvedOn: "2026-10-26", approvedBy: "owner" } } };
  assert.deepEqual(stampProblems(forged, disk), [`${id}: the source digest does not match the sources`, `${id}: the contract digest does not match the contract`]);
  assert.ok(digestChanges(forged).some(line => line.includes(`${id}: the source digest differs`)), "the gate refuses the forged entry");
  assert.deepEqual(stampProblems(stamped(base, id, disk), disk), [], "control: the same entry stamped from the sources passes");
});

test("a byte changed after the stamp is digest drift: refused until the owner stamps it again", () => {
  const flow = "src/svelte/catalog/compositions/content-flow/ContentFlow.svelte", changed = `${realSource(flow)}\n<!-- x -->\n`;
  const drifted: ReadBytes = path => path === flow ? Buffer.from(changed, "utf8") : disk(path);
  const ledger = stamped(withoutApprovals(realLedger), "content-flow", disk);
  assert.deepEqual(stampProblems(ledger, drifted), ["content-flow: the source digest does not match the sources"]);
  assert.deepEqual(digestChanges(ledger), [], "control: the stamped, unchanged tree has no drift");
  assert.ok(digestChanges(ledger, { [flow]: changed }).some(line => line.includes("content-flow: the source digest differs")),
    "the gate refuses the changed bytes of an approved piece");
});
