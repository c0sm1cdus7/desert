import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local/controller.ts";
import { SharedProduct } from "./fixtures/shared-controller.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import type { ProductDefinition } from "../src/contracts.ts";

const definition: ProductDefinition = structuredClone(SharedProduct);
definition.dependencies = [
  { kind: "controller", id: "memos", objects: ["memo"], requires: [] },
  { kind: "controller", id: "bookmarks", objects: ["bookmark"], requires: [] },
];
for (const journey of definition.journeys ?? []) journey.requires.controller = journey.id.includes("memo") ? "memos" : "bookmarks";
const application = compile(definition);
let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => cluster?.dispose());

test("one installed host serves independent controller roles without conflating their admission", async () => {
  const database = await cluster.database();
  const host = await openLocalController(application, { ...database, roles: ["memos", "bookmarks"] });
  const owner = await host.identities.issue("Owner");
  const session = host.connect(owner.token, "agent");
  try {
    for (const [journey, input] of [["create-memo", { title: "Private memo" }],
      ["create-bookmark", { address: "local:reference" }]] as const) {
      const prepared = await session.prepare((await session.begin(journey)).id, input);
      await session.accept(prepared.id, prepared.confirmationDigest);
    }
    const availability = session.watchAvailability({ pollIntervalMs: 25, validForMs: 500 });
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("AVAILABILITY_TIMEOUT")), 5000);
      const stop = availability.subscribe(snapshot => {
        if (Object.values(snapshot.journeys).every(journey => journey.dependenciesReady)) {
          clearTimeout(timeout); stop(); resolve();
        }
      });
    });
    availability.dispose();
    const other = host.connect((await host.identities.issue("Other")).token, "agent");
    for (const read of ["read-memo", "read-bookmark"]) {
      assert.equal((await session.read((await session.begin(read)).id)).length, 1);
      assert.deepEqual(await other.read((await other.begin(read)).id), []);
    }
  } finally { await host.close(); }
  const reopened = await openLocalController(application, { ...database, roles: ["bookmarks", "memos"] });
  await reopened.close();
  await assert.rejects(openLocalController(application, { ...database, roles: ["memos"] }), /INSTALLATION_MISMATCH/);
});

test("role installation is explicit and missing roles remain unavailable", async () => {
  const database = await cluster.database();
  for (const roles of [[], ["missing"], ["memos", "memos"]]) {
    await assert.rejects(openLocalController(application, { ...database, roles }), /CONTROLLER/);
  }
  const host = await openLocalController(application, { ...database, roles: ["memos"] });
  try {
    const session = host.connect((await host.identities.issue("Owner")).token, "agent");
    await session.begin("read-memo");
    await assert.rejects(session.begin("read-bookmark"), /JOURNEY_NOT_INSTALLED/);
  } finally { await host.close(); }
});
