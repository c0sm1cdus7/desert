import assert from "node:assert/strict";
import { invalidInputs } from "./values.ts";
import { successfulOperation } from "./check-success.ts";
import { assertMutation } from "./assertions.ts";
import { objectIdOf } from "./setup-plan.ts";
import type { Environment } from "./environment.ts";

export async function checkInputs(f: Environment) {
  const before = await f.sandbox.snapshot();
  if (f.journey.kind === "read") {
    await assert.rejects(f.session.prepare((await f.begin()).id, {}), /NOT_A_MUTATION_JOURNEY/);
    await assert.rejects(f.session.read("invalid-run"), /INVALID_REFERENCE/);
    assert.deepEqual(await f.sandbox.snapshot(), before);
    await successfulOperation(f);
    return;
  }
  const objectId = objectIdOf(f.journey);
  const object = f.product.objects.find(object => object.id === objectId)!;
  for (const invalid of invalidInputs(object, f.journey.command, f.input)) {
    await assert.rejects(f.session.prepare((await f.begin()).id, invalid), /INVALID_INPUT/);
    assert.deepEqual(await f.sandbox.snapshot(), before, "INVALID_INPUT_CHANGED_DOMAIN");
  }
  for (const input of f.inputs) {
    if (f.journey.command.kind === "update") {
      const subject = await f.prepareSetup(f.setup);
      const snapshot = await f.sandbox.snapshot();
      const run = await f.session.begin(f.journey.id, subject);
      const intent = await f.session.prepare(run.id, input);
      assert.deepEqual(await f.sandbox.snapshot(), snapshot, "PREPARATION_CHANGED_DOMAIN");
      const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
      assertMutation(f.journey.command, input, f.owner.id, snapshot, await f.sandbox.snapshot(), receipt, subject);
    } else await successfulOperation(f, input);
  }
}
