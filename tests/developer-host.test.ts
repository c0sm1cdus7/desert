import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../src/index.ts";
import type { Receipt } from "../src/local/types.ts";
import { openDeveloperHost, serveDeveloperSurface } from "../src/local/developer-host.ts";
import { NotebookProduct } from "../products/notebook/product.ts";
import { NotesController } from "../products/notebook/dependencies.ts";
import { CreateNote, ReadNote } from "../products/notebook/journeys.ts";

function fixture(t: { after(callback: () => void): void }) {
  const directory = mkdtempSync(join(tmpdir(), "desert-developer-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return { application: compile(NotebookProduct), roles: [NotesController.id], surfaceId: "human", directory };
}

test("developer host retains its private identity, accepted note and receipt across reopen", async t => {
  const options = fixture(t);
  const identityFile = join(options.directory, "identity.json");
  const first = await openDeveloperHost(options);
  let receipt: Receipt | undefined;
  let credential: string | undefined;
  try {
    assert.equal(statSync(options.directory).mode & 0o777, 0o700);
    assert.equal(statSync(identityFile).mode & 0o777, 0o600);
    credential = readFileSync(identityFile, "utf8");
    const run = await first.session.begin(CreateNote.id);
    const intent = await first.session.prepare(run.id, { title: "Retained identity", body: "Persistent witness." });
    receipt = await first.session.accept(intent.id, intent.confirmationDigest);
    assert.equal(await first.session.receipt(intent.id).then(value => value?.object.id), receipt.object.id);
  } finally { await first.close(); await first.close(); }
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
  assert.ok(receipt);
  const reopened = await openDeveloperHost(options);
  try {
    assert.equal(readFileSync(identityFile, "utf8"), credential);
    const read = await reopened.session.begin(ReadNote.id, receipt.object.id);
    const [note] = await reopened.session.read(read.id);
    assert.deepEqual(note?.facts, { title: "Retained identity", body: "Persistent witness.", state: "active" });
  } finally { await reopened.close(); }
});

test("an invalid retained credential is never silently replaced with a new identity", async t => {
  const options = fixture(t);
  const first = await openDeveloperHost(options);
  await first.close();
  const identityFile = join(options.directory, "identity.json");
  const credential = JSON.parse(readFileSync(identityFile, "utf8"));
  credential.token = "A".repeat(43);
  const before = JSON.stringify(credential);
  writeFileSync(identityFile, before);
  const reopened = await openDeveloperHost(options);
  try { await assert.rejects(reopened.session.begin(ReadNote.id), /UNAUTHENTICATED/); }
  finally { await reopened.close(); }
  assert.equal(readFileSync(identityFile, "utf8"), before);
});

test("malformed or nonprivate credentials fail closed without overwrite or a leaked host lock", async t => {
  const options = fixture(t);
  const first = await openDeveloperHost(options);
  await first.close();
  const identityFile = join(options.directory, "identity.json");
  writeFileSync(identityFile, "{}");
  await assert.rejects(openDeveloperHost(options), /INVALID_LOCAL_CREDENTIAL/);
  assert.equal(readFileSync(identityFile, "utf8"), "{}");
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
  chmodSync(identityFile, 0o644);
  await assert.rejects(openDeveloperHost(options), /PRIVATE_LOCAL_PATH_REQUIRED/);
  assert.equal(statSync(identityFile).mode & 0o777, 0o644);
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
});

test("unknown surfaces and failed web mounting preserve owned data and clean up the host", async t => {
  const options = fixture(t);
  await assert.rejects(openDeveloperHost({ ...options, surfaceId: "missing" }), /Unknown surface/);
  assert.equal(existsSync(join(options.directory, "postgres")), false);
  await assert.rejects(serveDeveloperSurface({ ...options, buildDirectory: join(options.directory, "missing-build"), port: 0 }));
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
  assert.equal(existsSync(join(options.directory, "postgres")), true);
  assert.equal(existsSync(join(options.directory, "identity.json")), true);
});

test("a missing credential in an existing store is not permission to initialize another identity", async t => {
  const options = fixture(t);
  const first = await openDeveloperHost(options);
  await first.close();
  const identityFile = join(options.directory, "identity.json");
  unlinkSync(identityFile);
  let unexpected: Awaited<ReturnType<typeof openDeveloperHost>> | undefined;
  try {
    await assert.rejects(async () => { unexpected = await openDeveloperHost(options); }, /LOCAL_CREDENTIAL_MISSING/);
  } finally { await unexpected?.close(); }
  assert.equal(existsSync(identityFile), false);
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
});

test("a dangling credential symlink is rejected as unsafe, not treated as first initialization", async t => {
  const options = fixture(t);
  const first = await openDeveloperHost(options);
  await first.close();
  const identityFile = join(options.directory, "identity.json");
  unlinkSync(identityFile);
  symlinkSync(join(options.directory, "missing-credential"), identityFile);
  await assert.rejects(openDeveloperHost(options), /PRIVATE_LOCAL_PATH_REQUIRED/);
  assert.equal(existsSync(join(options.directory, "missing-credential")), false);
  assert.equal(existsSync(join(options.directory, "runner.lock")), false);
});
