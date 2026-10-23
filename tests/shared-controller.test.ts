import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import type { LocalSession } from "../src/local.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { postgresCluster } from "./fixtures/postgres.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });
const application = compile(SharedProduct);

async function accept(session: LocalSession, journey: string, input: unknown, subject?: string) {
  const run = await session.begin(journey, subject);
  const intent = await session.prepare(run.id, input);
  const receipt = await session.accept(intent.id, intent.confirmationDigest);
  assert.deepEqual(await session.accept(intent.id, intent.confirmationDigest), receipt);
  return receipt;
}

test("a shared controller compiles all six explicitly expected journeys", () => {
  assert.deepEqual(application.surface("agent").journeys.map(journey => journey.id).sort(),
    ["archive-memo", "create-bookmark", "create-memo", "read-bookmark", "read-memo", "remove-bookmark"]);
  for (const journey of application.surface("agent").journeys) assert.deepEqual(journey.dependencies, ["workspace"]);
});

test("runtime contracts still reject a controller missing the journey object", () => {
  const definition = structuredClone(SharedProduct);
  definition.dependencies[0]!.objects = ["memo"];
  assert.throws(() => compile(definition), /Controller does not own: bookmark/);
});

test("one local store executes every journey with per-object ownership and durable state", async () => {
  const database = await cluster.database();
  const host = await openLocalController(application, { ...database, roles: ["workspace"] });
  const identity = await host.identities.issue("Alice");
  const alice = host.connect(identity.token, "agent");
  const bob = host.connect((await host.identities.issue("Bob")).token, "agent");
  try {
    const memo = await accept(alice, "create-memo", { title: "Private memo" });
    const bookmark = await accept(alice, "create-bookmark", { address: "local:reference" });
    for (const [read, update, subject, expected] of [
      ["read-memo", "archive-memo", memo.object.id, { title: "Private memo", state: "active" }],
      ["read-bookmark", "remove-bookmark", bookmark.object.id, { address: "local:reference", state: "saved" }],
    ] as const) {
      assert.deepEqual((await alice.read((await alice.begin(read, subject)).id))[0]!.facts, expected);
      assert.deepEqual(await bob.read((await bob.begin(read)).id), []);
      await assert.rejects(bob.begin(update, subject), /NOT_FOUND/);
      await accept(alice, update, {}, subject);
      await assert.rejects(accept(alice, update, {}, subject), /PRECONDITION_FAILED/);
    }
    await assert.rejects(alice.begin("archive-memo", bookmark.object.id), /NOT_FOUND/);
    await assert.rejects(alice.begin("remove-bookmark", memo.object.id), /NOT_FOUND/);
  } finally { await host.close(); }
  const reopened = await openLocalController(application, { ...database, roles: ["workspace"] });
  try {
    const session = reopened.connect(identity.token, "agent");
    for (const [read, state] of [["read-memo", "archived"], ["read-bookmark", "removed"]]) {
      const objects = await session.read((await session.begin(read!)).id);
      assert.equal(objects.length, 1);
      const detail = await session.read((await session.begin(read!, objects[0]!.id)).id);
      assert.equal(detail[0]!.facts.state, state);
    }
  } finally { await reopened.close(); }
});
