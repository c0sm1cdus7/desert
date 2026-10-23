import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { compile } from "../src/index.ts";
import { openControllerHost } from "../src/local/controller-host.ts";
import { serveIdentityHost } from "../src/local/identity-host.ts";
import { NotebookProduct } from "../products/notebook/product.ts";

test("the protected host never manufactures a developer credential and retains initialized access on restart", async t => {
  const directory = mkdtempSync(join(tmpdir(), "desert-identity-host-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const options = { application: compile(NotebookProduct), roles: ["notes"], surfaceId: "human", directory };
  const first = await openControllerHost(options);
  try {
    assert.deepEqual(await first.controller.access.state(), { kind: "onboarding" });
    assert.equal(existsSync(join(directory, "identity.json")), false);
    await first.controller.access.initialize({ login: "test-admin", displayName: "Test administrator", password: "A long test password" });
  } finally { await first.close(); await first.close(); }
  assert.equal(existsSync(join(directory, "runner.lock")), false);
  const second = await openControllerHost(options);
  try {
    assert.deepEqual(await second.controller.access.state(), { kind: "locked" });
    assert.equal(existsSync(join(directory, "identity.json")), false);
    const signedIn = await second.controller.access.signIn({ login: "test-admin", password: "A long test password" });
    assert.equal((await second.controller.access.state(signedIn.token)).kind, "ready");
  } finally { await second.close(); }
});

test("failed protected web mounting releases the host without creating an identity or launch credential", async t => {
  const directory = mkdtempSync(join(tmpdir(), "desert-identity-host-failure-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const options = { application: compile(NotebookProduct), roles: ["notes"], surfaceId: "human", directory };
  await assert.rejects(serveIdentityHost({ ...options, buildDirectory: join(directory, "missing"), port: -1 }), /INVALID_LOCAL_PORT/);
  assert.equal(existsSync(join(directory, "postgres")), false);
  await assert.rejects(serveIdentityHost({ ...options, buildDirectory: join(directory, "missing"), port: 0 }));
  for (const file of ["identity.json", "web-launch.json", "runner.lock"]) assert.equal(existsSync(join(directory, file)), false);
  const host = await openControllerHost(options);
  try { assert.deepEqual(await host.controller.access.state(), { kind: "onboarding" }); }
  finally { await host.close(); }
});
