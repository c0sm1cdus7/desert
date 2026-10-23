import assert from "node:assert/strict";
import { reachableStates, conditionsHold } from "./setup-plan.ts";
import { VerificationGap } from "./types.ts";
import type { Environment } from "./environment.ts";
import { successfulOperation } from "./check-success.ts";
import { observedEditBase } from "./edit-base.ts";

export async function checkGuards(f: Environment) {
  const command = f.journey.kind === "mutation" ? f.journey.command : undefined;
  assert.ok(command?.kind === "update");
  const object = f.product.objects.find(object => object.id === command.object)!;
  const states = reachableStates(f.product, command.object, f.seed);
  for (const [field, value] of Object.entries(command.when)) {
    const fieldType = object.facts[field]!;
    const singleton = fieldType.kind === "enum" ? fieldType.values.length === 1
      : fieldType.kind === "integer" ? fieldType.minimum !== undefined && fieldType.minimum === fieldType.maximum
      : fieldType.kind === "text" && fieldType.maxLength === 0;
    if (singleton) continue;
    const state = states.find(state => state.facts[field] !== value &&
      conditionsHold(state.facts, Object.fromEntries(Object.entries(command.when).filter(([key]) => key !== field))));
    if (!state) throw new VerificationGap("NO_GENERATED_COUNTEREXAMPLE: " + field);
    const subject = await f.prepareSetup(state.steps);
    const before = await f.sandbox.snapshot();
    await assert.rejects(async () => {
      const run = await f.session.begin(f.journey.id, subject);
      await f.session.prepare(run.id, f.input, observedEditBase(f.journey, before, subject));
    }, /PRECONDITION_FAILED/);
    assert.deepEqual(await f.sandbox.snapshot(), before, "GUARD_REJECTION_CHANGED_DOMAIN");
  }
  await successfulOperation(f);
}
