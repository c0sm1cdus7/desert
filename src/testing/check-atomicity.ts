import assert from "node:assert/strict";
import { assertMutation } from "./assertions.ts";
import type { Environment } from "./environment.ts";
import { successfulOperation } from "./check-success.ts";

export async function checkAtomicity(f: Environment) {
  if (f.journey.kind === "read") return successfulOperation(f);
  const before = await f.sandbox.snapshot();
  const intent = await f.prepare();
  await f.sandbox.rejectReceipts(true);
  try {
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /VERIFICATION_RECEIPT_FAULT/);
    assert.equal(await f.session.receipt(intent.id), null);
    assert.deepEqual(await f.sandbox.snapshot(), before, "ROLLBACK_VIOLATION");
  } finally { await f.sandbox.rejectReceipts(false); }
  const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
  assertMutation(f.journey.command, f.input, f.owner.id, before, await f.sandbox.snapshot(), receipt, f.subject);
}

export async function checkConcurrency(f: Environment) {
  if (f.journey.kind !== "mutation") throw new Error("MUTATION_REQUIRED");
  const before = await f.sandbox.snapshot();
  const first = await f.prepare();
  const competing = f.journey.command.kind === "update" ? await f.prepare() : undefined;
  const receipts = await Promise.all([
    f.session.accept(first.id, first.confirmationDigest),
    f.session.accept(first.id, first.confirmationDigest),
  ]);
  assert.deepEqual(receipts[0], receipts[1], "RETRY_IDENTITY_VIOLATION");
  assertMutation(f.journey.command, f.input, f.owner.id, before, await f.sandbox.snapshot(), receipts[0]!, f.subject);
  if (competing) {
    const after = await f.sandbox.snapshot();
    await assert.rejects(f.session.accept(competing.id, competing.confirmationDigest), /VERSION_CONFLICT/);
    assert.deepEqual(await f.sandbox.snapshot(), after, "STALE_ACCEPTANCE_CHANGED_DOMAIN");
  }
}
