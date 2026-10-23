import assert from "node:assert/strict";
import { test } from "node:test";
import { accessClient } from "../src/web/client/access.ts";
import { accessLockFixture } from "./fixtures/access-lock.ts";

const identity = { kind: "human", id: "00000000-0000-4000-8000-000000000000", login: "franco", displayName: "Franco", role: "administrator" };
const sessionBinding = "a".repeat(43);
test("access client fails closed on startup; no ready workspace follows unknown or unavailable replies", async () => {
  for (const value of [{ kind: "surprise" }, { kind: "ready" }, { kind: "ready", identity: { ...identity, token: "secret" } }]) {
    const client = accessClient("digest", accessLockFixture(), async () => Response.json(value));
    await client.refresh();
    assert.equal(client.snapshot().state.kind, "unavailable");
  }
  const client = accessClient("digest", accessLockFixture(), async () => { throw new Error("offline"); });
  await client.refresh();
  assert.equal(client.snapshot().state.kind, "unavailable");
});

test("lock hides identity synchronously, never reopens it after an uncertain reply or delayed refresh", async () => {
  let lockRequested = false;
  const client = accessClient("digest", accessLockFixture(), async (input) => {
    if (String(input).endsWith("/lock")) { lockRequested = true; throw new Error("offline"); }
    return Response.json({ kind: "ready", identity, sessionBinding });
  });
  await client.refresh();
  assert.equal(client.snapshot().state.kind, "ready");
  const locking = client.lock();
  assert.equal(client.snapshot().state.kind, "locked");
  await locking; await client.refresh();
  assert.equal(lockRequested, true);
  assert.equal(client.snapshot().state.kind, "locked");
  assert.match(client.snapshot().error ?? "", /confirm/i);
});

test("sign-in is explicit and does not retain passwords in published client state", async () => {
  const received: unknown[] = [];
  const client = accessClient("digest", accessLockFixture(), async (_url, options) => {
    received.push(JSON.parse(String(options?.body)));
    return Response.json({ kind: "ready", identity, sessionBinding });
  });
  await client.authenticate("signIn", { login: "franco", password: "private passphrase" });
  assert.equal(client.snapshot().state.kind, "ready");
  assert.deepEqual(received, [{ login: "franco", password: "private passphrase" }]);
  assert.ok(!JSON.stringify(client.snapshot()).includes("passphrase"));
});

test("unconfirmed lock survives client recreation, locks other tabs, and only explicit sign-in clears it", async () => {
  const barrier = accessLockFixture();
  const send: typeof fetch = async input => {
    if (String(input).endsWith("/lock")) throw new Error("offline");
    return Response.json({ kind: "ready", identity, sessionBinding });
  };
  const first = accessClient("digest", barrier, send), second = accessClient("digest", barrier, send);
  await first.refresh(); await second.refresh();
  assert.equal(second.snapshot().state.kind, "ready");
  await first.lock();
  assert.equal(second.snapshot().state.kind, "locked");
  first.stop();
  const reloaded = accessClient("digest", barrier, send);
  await reloaded.refresh();
  assert.equal(reloaded.snapshot().state.kind, "locked");
  await reloaded.authenticate("signIn", { login: "franco", password: "private passphrase" });
  assert.equal(reloaded.snapshot().state.kind, "ready");
  assert.equal(barrier.isLocked(), false);
  assert.equal(second.snapshot().state.kind, "locked", "another tab never unlocks implicitly");
  second.stop(); reloaded.stop();
});

test("inaccessible persistent lock storage never admits a ready workspace", async () => {
  const client = accessClient("digest", { isLocked() { throw new Error("storage denied"); },
    lock() { throw new Error("storage denied"); }, clear() { throw new Error("storage denied"); },
    generation() { throw new Error("storage denied"); }, advance() { throw new Error("storage denied"); }, subscribe: () => () => {} },
  async () => Response.json({ kind: "ready", identity, sessionBinding }));
  await client.refresh();
  assert.equal(client.snapshot().state.kind, "unavailable");
  await client.authenticate("signIn", { login: "franco", password: "private passphrase" });
  assert.notEqual(client.snapshot().state.kind, "ready");
});

test("sign-in from another tab invalidates the original instance before a response or next poll", async () => {
  const barrier = accessLockFixture(); barrier.lock();
  let shared = { kind: "ready" as const, identity, sessionBinding };
  const first = accessClient("digest", barrier, async () => Response.json(shared));
  const second = accessClient("digest", barrier, async () => Response.json(shared));
  await first.authenticate("signIn", { login: "franco", password: "private passphrase" });
  const original = first.binding(); assert.equal(original.kind, "identity");
  if (original.kind !== "identity") throw new Error("Missing private binding");
  assert.equal(original.isCurrent(), true);
  shared = { kind: "ready", identity: { ...identity, login: "other" }, sessionBinding: "b".repeat(43) };
  await second.authenticate("signIn", { login: "other", password: "another passphrase" });
  assert.equal(first.snapshot().state.kind, "locked"); assert.equal(original.isCurrent(), false);
  assert.equal(second.snapshot().state.kind, "ready");
  await first.refresh(); assert.equal(first.snapshot().state.kind, "locked");
  first.stop(); second.stop();
});

test("a missed storage event still invalidates a bound instance synchronously before transport", async () => {
  let generation = "first";
  const client = accessClient("digest", { isLocked: () => false, lock() {}, clear() {},
    generation: () => generation, advance() { generation = "signed-in"; }, subscribe: () => () => {} },
  async () => Response.json({ kind: "ready", identity, sessionBinding }));
  await client.authenticate("signIn", { login: "franco", password: "private passphrase" });
  const binding = client.binding(); assert.equal(binding.kind, "identity");
  if (binding.kind !== "identity") throw new Error("Missing private binding");
  generation = "other-tab";
  assert.equal(binding.isCurrent(), false); assert.equal(client.snapshot().state.kind, "locked");
  client.stop();
});

test("a definitive locked refresh retires its binding; an older reply or later poll cannot resurrect it", async () => {
  const pending: Array<(response: Response) => void> = [];
  const ready = { kind: "ready", identity, sessionBinding };
  let delayed = false;
  const client = accessClient("digest", accessLockFixture(), async input => {
    if (!delayed || String(input).endsWith("/signIn")) return Response.json(ready);
    return new Promise<Response>(resolve => { pending.push(resolve); });
  });
  await client.refresh();
  const binding = client.binding(); assert.equal(binding.kind, "identity");
  if (binding.kind !== "identity") throw new Error("Missing private binding");
  delayed = true;
  const older = client.refresh(), newer = client.refresh();
  pending[1]!(Response.json({ kind: "locked" })); await newer;
  assert.equal(client.snapshot().state.kind, "locked"); assert.equal(binding.isCurrent(), false);
  pending[0]!(Response.json(ready)); await older;
  assert.equal(client.snapshot().state.kind, "locked"); assert.equal(binding.isCurrent(), false);
  delayed = false; await client.refresh();
  assert.equal(client.snapshot().state.kind, "locked", "polls never authenticate a retired instance");
  await client.authenticate("signIn", { login: "franco", password: "private passphrase" });
  assert.equal(client.snapshot().state.kind, "ready"); assert.equal(binding.isCurrent(), false);
  const renewed = client.binding(); assert.equal(renewed.kind, "identity");
  if (renewed.kind !== "identity") throw new Error("Missing private binding");
  assert.equal(renewed.isCurrent(), true); client.stop();
});

test("only the latest refresh may publish; healthy polls preserve the current bound instance", async () => {
  const pending: Array<(response: Response) => void> = [];
  const ready = { kind: "ready", identity, sessionBinding };
  let delayed = false;
  const client = accessClient("digest", accessLockFixture(), async () => {
    if (!delayed) return Response.json(ready);
    return new Promise<Response>(resolve => { pending.push(resolve); });
  });
  await client.refresh();
  const binding = client.binding(); assert.equal(binding.kind, "identity");
  if (binding.kind !== "identity") throw new Error("Missing private binding");
  delayed = true;
  const older = client.refresh(), newer = client.refresh();
  pending[1]!(Response.json(ready)); await newer;
  pending[0]!(Response.json({ kind: "locked" })); await older;
  assert.equal(client.snapshot().state.kind, "ready"); assert.equal(binding.isCurrent(), true);
  delayed = false; await client.refresh();
  assert.equal(binding.isCurrent(), true); client.stop();
});
