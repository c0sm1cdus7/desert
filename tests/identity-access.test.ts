import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { Pool } from "pg";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());
const administrator = { login: "franco", displayName: "Franco", password: "correct horse battery staple" };
const member = { login: "guest", displayName: "Guest", password: "another private passphrase" };
async function setup() {
  const database = await cluster.database(), app = compile(Notebook);
  const host = await openLocalController(app, { ...database, roles: ["notes"] });
  const sql = new Pool({ host: database.socketDirectory, database: database.database, user: database.user });
  return { database, app, host, sql, async close() { await sql.end(); await host.close(); } };
}
async function createNote(host: Awaited<ReturnType<typeof openLocalController>>, token: string) {
  const session = host.connect(token, "human");
  const intent = await session.prepare((await session.begin("create-note")).id, { title: "Private", body: "Only mine" });
  return { session, intent };
}

test("first-admin initialization is atomic, stores only password derivations and cannot run twice", async () => {
  const f = await setup();
  try {
    assert.deepEqual(await f.host.access.state(), { kind: "onboarding" });
    const outcomes = await Promise.allSettled([f.host.access.initialize(administrator), f.host.access.initialize(administrator)]);
    assert.equal(outcomes.filter(result => result.status === "fulfilled").length, 1);
    assert.match(String((outcomes.find(result => result.status === "rejected") as PromiseRejectedResult).reason), /ALREADY_INITIALIZED/);
    const { rows } = await f.sql.query("SELECT * FROM desert_identity_accounts");
    assert.equal(rows.length, 1); assert.equal(rows[0].administrator, true);
    assert.ok(!JSON.stringify(rows).includes(administrator.password));
    assert.deepEqual(await f.host.access.state(), { kind: "locked" });
  } finally { await f.close(); }
});

test("lock revokes actual controller authority, sign-in resumes the same identity and private facts", async () => {
  const f = await setup();
  try {
    const first = await f.host.access.initialize(administrator);
    const { session, intent } = await createNote(f.host, first.token);
    await session.accept(intent.id, intent.confirmationDigest);
    await f.host.access.lock(first.token);
    await assert.rejects(session.begin("read-note"), /UNAUTHENTICATED/);
    assert.deepEqual(await f.host.access.state(first.token), { kind: "locked" });
    const second = await f.host.access.signIn({ login: administrator.login, password: administrator.password });
    assert.equal(second.identity.id, first.identity.id); assert.notEqual(second.token, first.token);
    const resumed = f.host.connect(second.token, "human");
    assert.equal((await resumed.read((await resumed.begin("read-note")).id))[0]!.facts.title, "Private");
    await f.sql.query("UPDATE desert_identity_sessions SET expires_at = clock_timestamp() - interval '1 second'");
    await assert.rejects(resumed.begin("read-note"), /UNAUTHENTICATED/);
  } finally { await f.close(); }
});

test("the identity avatar seed survives lock, sign-in and directory reads without altering authority", async () => {
  const f = await setup();
  try {
    const seed = "0011223344556677";
    const initial = await f.host.access.initialize({ ...administrator, avatarSeed: seed });
    assert.equal(initial.identity.avatarSeed, seed);
    await f.host.access.lock(initial.token);
    const signed = await f.host.access.signIn({ login: administrator.login, password: administrator.password });
    assert.equal(signed.identity.avatarSeed, seed);
    assert.equal((await f.host.access.listIdentities(signed.token))[0]?.avatarSeed, seed);
    assert.equal((await f.sql.query("SELECT avatar_seed FROM desert_identity_accounts")).rows[0].avatar_seed, seed);
    assert.equal(signed.identity.role, "administrator");
  } finally { await f.close(); }
});

test("only the administrator provisions identities, never acquires their content authority", async () => {
  const f = await setup();
  try {
    const admin = await f.host.access.initialize(administrator);
    const person = await f.host.access.createIdentity(admin.token, member);
    assert.equal(person.kind, "human"); assert.equal(person.role, "member");
    const signed = await f.host.access.signIn({ login: member.login, password: member.password });
    await assert.rejects(f.host.access.createIdentity(signed.token, { ...member, login: "third" }), /ADMINISTRATOR_REQUIRED/);
    await assert.rejects(f.host.access.listIdentities(signed.token), /ADMINISTRATOR_REQUIRED/);
    const { session, intent } = await createNote(f.host, signed.token);
    const receipt = await session.accept(intent.id, intent.confirmationDigest);
    const adminSession = f.host.connect(admin.token, "human");
    assert.deepEqual(await adminSession.read((await adminSession.begin("read-note")).id), []);
    await assert.rejects(adminSession.begin("archive-note", receipt.object.id), /NOT_FOUND/);
    assert.equal((await f.host.access.listIdentities(admin.token)).length, 2);
    await f.host.access.disableIdentity(admin.token, person.id);
    await assert.rejects(session.begin("read-note"), /UNAUTHENTICATED/);
    await assert.rejects(f.host.access.signIn({ login: member.login, password: member.password }), /INVALID_CREDENTIALS/);
    await assert.rejects(f.host.access.disableIdentity(admin.token, admin.identity.id), /ADMINISTRATOR_CANNOT_BE_DISABLED/);
  } finally { await f.close(); }
});

test("password failures are durable and throttled; unknown identities disclose no existence", async () => {
  const f = await setup();
  try {
    await f.host.access.initialize(administrator);
    for (let attempt = 0; attempt < 5; attempt++) {
      await assert.rejects(f.host.access.signIn({ login: administrator.login, password: "wrong password" }), /INVALID_CREDENTIALS/);
    }
    await assert.rejects(f.host.access.signIn({ login: administrator.login, password: administrator.password }), /INVALID_CREDENTIALS/);
    await assert.rejects(f.host.access.signIn({ login: "unknown", password: "wrong password" }), /INVALID_CREDENTIALS/);
    assert.equal((await f.sql.query("SELECT failed_attempts FROM desert_identity_accounts")).rows[0].failed_attempts, 5);
    await f.sql.query("UPDATE desert_identity_accounts SET blocked_until = clock_timestamp() - interval '1 second'");
    assert.equal((await f.host.access.signIn({ login: administrator.login, password: administrator.password })).identity.role, "administrator");
  } finally { await f.close(); }
});

test("human administration rejects agent credentials and undeclared request semantics", async () => {
  const f = await setup();
  try {
    await assert.rejects(f.host.access.initialize({ ...administrator, administrator: true } as typeof administrator), /INVALID_ACCESS_REQUEST/);
    await assert.rejects(f.host.access.initialize({ ...administrator, password: "short" }), /INVALID_ACCESS_REQUEST/);
    const admin = await f.host.access.initialize(administrator), agent = await f.host.identities.issue("Agent");
    await assert.rejects(f.host.access.listIdentities(agent.token), /UNAUTHENTICATED/);
    await assert.rejects(f.host.access.createIdentity(admin.token, { ...member, role: "administrator" } as typeof member), /INVALID_ACCESS_REQUEST/);
    assert.equal((await f.host.access.state(admin.token)).kind, "ready");
  } finally { await f.close(); }
});

test("restart retains identity and revocation; locked prepared work cannot be accepted", async () => {
  const f = await setup();
  let resumed: Awaited<ReturnType<typeof openLocalController>> | undefined;
  try {
    const first = await f.host.access.initialize(administrator);
    const { session, intent } = await createNote(f.host, first.token);
    await f.host.access.lock(first.token);
    await assert.rejects(session.accept(intent.id, intent.confirmationDigest), /UNAUTHENTICATED/);
    await f.host.close();
    resumed = await openLocalController(f.app, { ...f.database, roles: ["notes"] });
    assert.deepEqual(await resumed.access.state(first.token), { kind: "locked" });
    await assert.rejects(resumed.access.initialize(administrator), /ALREADY_INITIALIZED/);
    const next = await resumed.access.signIn({ login: administrator.login, password: administrator.password });
    assert.equal(next.identity.id, first.identity.id);
    const reader = resumed.connect(next.token, "human");
    assert.deepEqual(await reader.read((await reader.begin("read-note")).id), []);
  } finally { await resumed?.close(); await f.sql.end(); await f.host.close(); }
});
