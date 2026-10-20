import assert from "node:assert/strict";
import { assertMutation, assertRead } from "./assertions.ts";
import type { Environment } from "./environment.ts";
import type { Facts } from "./types.ts";

export async function successfulOperation(f: Environment, input: Facts = f.input) {
  const before = await f.sandbox.snapshot();
  const run = await f.begin();
  if (f.journey.kind === "mutation") {
    const intent = await f.session.prepare(run.id, input);
    assert.deepEqual(await f.sandbox.snapshot(), before, "PREPARATION_CHANGED_DOMAIN");
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assertMutation(f.journey.command, input, f.owner.id, before, await f.sandbox.snapshot(), receipt, f.subject);
    assert.equal(receipt.runId, run.id);
    const after = await f.sandbox.snapshot();
    assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
    assert.deepEqual(await f.session.receipt(intent.id), receipt);
    assert.deepEqual(await f.sandbox.snapshot(), after, "REPLAY_CHANGED_DOMAIN");
  } else {
    const journey = f.journey;
    const policy = f.product.policies!.find(policy => policy.object === journey.object)!;
    const detail = await f.session.read(run.id);
    assertRead(journey, before, await f.sandbox.snapshot(), detail, policy.field, f.owner.id, f.subject);
    const collection = await f.session.read((await f.session.begin(journey.id)).id);
    assertRead(journey, before, await f.sandbox.snapshot(), collection, policy.field, f.owner.id);
  }
}
