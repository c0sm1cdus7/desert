import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { assertMutation, assertRead } from "./assertions.ts";
import type { Environment } from "./environment.ts";
import { observedEditBase } from "./edit-base.ts";

async function eventually(condition: () => boolean) {
  for (let i = 0; i < 400; i++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("AVAILABILITY_DID_NOT_CONVERGE");
}

export async function checkRecovery(f: Environment) {
  const observer = f.session.watchAvailability({ pollIntervalMs: 25, validForMs: 150 });
  const ready = () => observer.snapshot().journeys[f.journey.id]!.dependenciesReady;
  try {
    await eventually(ready);
    const before = await f.sandbox.snapshot();
    const run = await f.begin();
    const intent = f.journey.kind === "mutation"
      ? await f.session.prepare(run.id, f.input, observedEditBase(f.journey, before, f.subject)) : undefined;
    f.sandbox.stop();
    try {
      await eventually(() => !ready());
      await assert.rejects(f.begin());
      if (intent) await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest));
      else await assert.rejects(f.session.read(run.id));
    } finally { f.sandbox.start(); }
    await eventually(ready);
    assert.deepEqual(await f.sandbox.snapshot(), before, "RECOVERY_REPLAYED_OPERATION");
    if (intent && f.journey.kind === "mutation") {
      assert.equal(await f.session.receipt(intent.id), null);
      const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
      assertMutation(f.journey.command, f.input, f.owner.id, before, await f.sandbox.snapshot(), receipt, f.subject);
    } else if (f.journey.kind === "read") {
      const journey = f.journey;
      const actual = await f.session.read(run.id);
      const policy = f.product.policies!.find(policy => policy.object === journey.object)!;
      assertRead(journey, before, await f.sandbox.snapshot(), actual, policy.field, f.owner.id, f.subject);
    }
  } finally { observer.dispose(); f.sandbox.start(); }
}
