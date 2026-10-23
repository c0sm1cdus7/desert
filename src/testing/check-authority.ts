import assert from "node:assert/strict";
import { assertRead } from "./assertions.ts";
import { objectIdOf, reachableStates } from "./setup-plan.ts";
import type { Environment } from "./environment.ts";
import { VerificationGap } from "./types.ts";
import { observedEditBase } from "./edit-base.ts";

export async function checkAuthority(f: Environment) {
  const before = await f.sandbox.snapshot();
  const run = await f.begin();
  await assert.rejects(f.begin(f.sandbox.controller.connect("invalid", f.surfaceId)), /UNAUTHENTICATED/);
  if (f.subject) await assert.rejects(f.begin(f.other), /NOT_FOUND/);
  if (f.journey.kind === "mutation") {
    const options = observedEditBase(f.journey, before, f.subject);
    const intent = await f.session.prepare(run.id, f.input, options);
    await assert.rejects(f.other.prepare(run.id, f.input, options), /NOT_FOUND/);
    await assert.rejects(f.other.accept(intent.id, intent.confirmationDigest), /NOT_FOUND/);
    await assert.rejects(f.session.accept(intent.id, "forged"), /CONFIRMATION_MISMATCH/);
    assert.equal(await f.session.receipt(intent.id), null);
    await f.sandbox.controller.identities.revoke(f.owner.id);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /UNAUTHENTICATED/);
  } else {
    const journey = f.journey;
    await assert.rejects(f.other.read(run.id), /NOT_FOUND/);
    const collection = await f.other.read((await f.other.begin(journey.id)).id);
    const policy = f.product.policies!.find(policy => policy.object === journey.object)!;
    assertRead(journey, before, await f.sandbox.snapshot(), collection, policy.field, f.stranger.id);
    await f.sandbox.controller.identities.revoke(f.owner.id);
    await assert.rejects(f.session.read(run.id), /UNAUTHENTICATED/);
  }
  await assert.rejects(f.begin(), /UNAUTHENTICATED/);
  assert.deepEqual(await f.sandbox.snapshot(), before, "AUTHORITY_REJECTION_CHANGED_DOMAIN");
}

export async function seedSentinels(f: Environment) {
  // Other objects and another owner's data must survive every accepted operation.
  const target = objectIdOf(f.journey);
  for (const object of f.product.objects) {
    const controller = f.product.dependencies?.find(item => item.id === f.journey.requires.controller);
    if (controller?.kind !== "controller" || !controller.objects.includes(object.id)) continue;
    const state = reachableStates(f.product, object.id, f.seed)[0];
    if (!state) throw new VerificationGap("NO_SENTINEL_SETUP: " + object.id);
    await f.prepareSetup(state.steps, f.stranger.token, f.stranger.id);
    if (object.id !== target) await f.prepareSetup(state.steps);
  }
}
