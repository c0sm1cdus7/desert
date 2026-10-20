import assert from "node:assert/strict";
import { eventually, type Runtime } from "./journey-runtime.ts";

export async function recovery(f: Runtime) {
  const availability = f.session.watchAvailability({ pollIntervalMs: 25, validForMs: 200 });
  const ready = () => availability.snapshot().journeys[f.journey]!.dependenciesReady;
  await eventually(ready);
  const run = await f.begin();
  const intent = f.expected.kind === "mutation" ? await f.session.prepare(run.id, f.expected.input) : undefined;
  f.cluster.stop();
  try {
    await eventually(() => !ready());
    await assert.rejects(f.begin());
    if (intent) await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest));
    else await assert.rejects(f.session.read(run.id));
  } finally { f.cluster.start(); }
  await eventually(ready);
  assert.equal((await f.all()).length, 1, "Recovery must not replay an unavailable command");
  assert.equal((await f.all())[0]!.facts.state, "active");
  if (intent) {
    assert.equal(await f.session.receipt(intent.id), null);
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
    const facts = (await f.session.read((await f.session.begin("read-note", receipt.object.id)).id))[0]!.facts;
    assert.deepEqual(facts, f.journey === "create-note"
      ? { title: "New note", body: "New content", state: "active" }
      : { title: "Seed", body: "Private content", state: "archived" });
  } else {
    assert.deepEqual((await f.session.read(run.id))[0]!.facts, { title: "Seed", body: "Private content", state: "active" });
  }
  assert.equal((await f.all()).length, f.expected.expectedCount);
  availability.dispose();
}
