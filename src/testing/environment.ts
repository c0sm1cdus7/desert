import assert from "node:assert/strict";
import type { ProductDefinition } from "../contracts.ts";
import type { JourneyDefinition } from "../program-grammar.ts";
import type { LocalSession } from "../local.ts";
import { assertMutation } from "./assertions.ts";
import { setupFor } from "./setup-plan.ts";
import { commandInputs } from "./values.ts";
import type { Step, TestSandbox, Facts } from "./types.ts";
import { observedEditBase } from "./edit-base.ts";

export async function environment(product: ProductDefinition, journey: JourneyDefinition,
  surfaceId: string, seed: number, sandbox: TestSandbox) {
  const owner = await sandbox.controller.identities.issue("Verification owner");
  const stranger = await sandbox.controller.identities.issue("Verification stranger");
  const session = sandbox.controller.connect(owner.token, surfaceId);
  const other = sandbox.controller.connect(stranger.token, surfaceId);

  async function prepareSetup(steps: Step[], token = owner.token, actorId = owner.id) {
    let subject: string | undefined;
    for (const step of steps) {
      const actor = sandbox.controller.connect(token, step.surfaceId);
      const before = await sandbox.snapshot();
      const run = await actor.begin(step.journey.id, step.journey.command.kind === "create" ? undefined : subject);
      const intent = await actor.prepare(run.id, step.input, observedEditBase(step.journey, before, subject));
      assert.deepEqual(await sandbox.snapshot(), before, "PREPARATION_CHANGED_DOMAIN");
      const receipt = await actor.accept(intent.id, intent.confirmationDigest);
      assertMutation(step.journey.command, step.input, actorId, before, await sandbox.snapshot(), receipt,
        step.journey.command.kind === "create" ? undefined : subject);
      subject = receipt.object.id;
    }
    return subject;
  }
  const setup = setupFor(product, journey, seed);
  const subject = await prepareSetup(setup);
  const inputs = journey.kind === "mutation" ? commandInputs(product, journey.command, seed) : [{}];
  const input = inputs[0]!;
  const begin = (actor: LocalSession = session, target = subject) => actor.begin(journey.id, target);
  const prepare = async (value: Facts = input) => {
    const before = await sandbox.snapshot();
    return session.prepare((await begin()).id, value, observedEditBase(journey, before, subject));
  };
  return { product, journey, surfaceId, seed, sandbox, owner, stranger, session, other, setup,
    subject, inputs, input, begin, prepare, prepareSetup };
}
export type Environment = Awaited<ReturnType<typeof environment>>;
