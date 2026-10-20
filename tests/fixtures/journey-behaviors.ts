import assert from "node:assert/strict";
import type { Runtime } from "./journey-runtime.ts";

export async function success(f: Runtime) {
  const run = await f.begin();
  if (f.expected.kind === "read") {
    const records = await f.session.read(run.id);
    assert.deepEqual(records[0]!.facts, { title: "Seed", body: "Private content", state: "active" });
    assert.equal(records.length, 1);
    assert.equal(records[0]!.id, f.seedReceipt.object.id);
  } else {
    const intent = await f.session.prepare(run.id, f.expected.input);
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assert.equal(receipt.status, "completed");
    assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
    const record = (await f.session.read((await f.session.begin("read-note", receipt.object.id)).id))[0]!;
    assert.equal(record.facts.state, f.expected.expectedState);
    assert.equal(record.version, f.journey === "create-note" ? 1 : 2);
    if (f.journey === "create-note") assert.deepEqual(record.facts, { title: "New note", body: "New content", state: "active" });
    else assert.deepEqual(record.facts, { title: "Seed", body: "Private content", state: "archived" });
  }
  assert.equal((await f.all()).length, f.expected.expectedCount);
}

export async function invalid(f: Runtime) {
  const run = await f.begin();
  if (f.expected.kind === "read") {
    await assert.rejects(f.session.prepare(run.id, {}), /NOT_A_MUTATION_JOURNEY/);
    await assert.rejects(f.session.read("not-a-run"), /INVALID_REFERENCE/);
  } else {
    const input = f.journey === "create-note" ? { title: "", body: "" } : { state: "active" };
    await assert.rejects(f.session.prepare(run.id, input), /INVALID_INPUT/);
    const intent = await f.session.prepare(run.id, f.expected.input);
    await assert.rejects(f.session.accept(intent.id, "forged"), /CONFIRMATION_MISMATCH/);
    assert.equal(await f.session.receipt(intent.id), null);
  }
  assert.equal((await f.all()).length, 1);
  assert.equal((await f.all())[0]!.facts.state, "active");
}

export async function authority(f: Runtime) {
  const run = await f.begin();
  let acceptPrepared: (() => Promise<unknown>) | undefined;
  if (f.expected.kind === "read") {
    await assert.rejects(f.other.read(run.id), /NOT_FOUND/);
    await assert.rejects(f.begin(f.other), /NOT_FOUND/);
    assert.deepEqual(await f.other.read((await f.other.begin("read-note")).id), []);
  } else {
    const intent = await f.session.prepare(run.id, f.expected.input);
    acceptPrepared = () => f.session.accept(intent.id, intent.confirmationDigest);
    await assert.rejects(f.other.prepare(run.id, f.expected.input), /NOT_FOUND/);
    await assert.rejects(f.other.accept(intent.id, intent.confirmationDigest), /NOT_FOUND/);
    if (f.subject) await assert.rejects(f.begin(f.other), /NOT_FOUND/);
    assert.equal(await f.session.receipt(intent.id), null);
  }
  await assert.rejects(f.begin(f.host.connect("invalid-token", "human")), /UNAUTHENTICATED/);
  assert.equal((await f.all()).length, 1);
  assert.equal((await f.all())[0]!.facts.state, "active");
  await f.host.identities.revoke(f.owner.id);
  await assert.rejects(f.begin(), /UNAUTHENTICATED/);
  if (f.expected.kind === "read") await assert.rejects(f.session.read(run.id), /UNAUTHENTICATED/);
  else {
    await assert.rejects(f.session.prepare(run.id, f.expected.input), /UNAUTHENTICATED/);
    await assert.rejects(acceptPrepared!, /UNAUTHENTICATED/);
  }
}
