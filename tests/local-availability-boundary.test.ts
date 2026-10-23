import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { controllerRole, objectType, ownershipPolicy, readJourney } from "../src/index.ts";
import { compile } from "../src/compile.ts";
import { openLocalController } from "../src/local.ts";
import { Notebook } from "../products/notebook/product.ts";
import { Note } from "../products/notebook/note.ts";
import { CreateNote, ReadNote, ArchiveNote } from "../products/notebook/journeys.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { notebookDefinition } from "./fixtures/notebook.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

async function eventually(condition: () => boolean) {
  for (let attempt = 0; attempt < 500; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("Runtime observation did not converge");
}

test("a real local controller does not announce other controllers as ready", async () => {
  const OtherNote = objectType({ ...Note, id: "other-note" });
  const OtherController = controllerRole({ id: "other-controller", objects: [OtherNote], requires: [] });
  const ReadOther = readJourney("read-other", OtherNote, { fields: ["title"], collection: ["title"],
    requires: { controller: OtherController, dependencies: [] } });
  const source = notebookDefinition();
  const fixture = { ...source,
    objects: [...source.objects, OtherNote],
    dependencies: [...source.dependencies, OtherController],
    policies: [...source.policies, ownershipPolicy(OtherNote, "owner")],
    journeys: [...source.journeys, ReadOther],
    surfaces: [{ id: "agent", kind: "agent" as const, journeys: [CreateNote, ReadNote, ArchiveNote, ReadOther].map(journey => journey.id) }],
  };
  const host = await openLocalController(compile(fixture), { ...await cluster.database(), roles: ["notes"] });
  try {
    const identity = await host.identities.issue("Owner");
    const session = host.connect(identity.token, "agent");
    const availability = session.watchAvailability({ pollIntervalMs: 30, validForMs: 300 });
    await eventually(() => availability.snapshot().journeys["read-note"]!.dependenciesReady);
    assert.deepEqual(availability.snapshot().journeys["read-other"], {
      dependenciesReady: false, blockers: [{ dependency: "other-controller", reason: "unknown" }],
    });
    assert.deepEqual(await session.read((await session.begin("read-note")).id), []);
    await assert.rejects(session.begin("read-other"), /JOURNEY_NOT_INSTALLED/);
  } finally { await host.close(); }
});

test("throwing observers and diagnostics cannot interrupt polling or controller cleanup", async () => {
  const host = await openLocalController(compile(Notebook), { ...await cluster.database(), roles: ["notes"] });
  try {
    const identity = await host.identities.issue("Owner");
    const session = host.connect(identity.token, "human");
    const availability = session.watchAvailability({ pollIntervalMs: 30, validForMs: 300,
      onListenerError() { throw new Error("Broken diagnostic consumer"); } });
    assert.doesNotThrow(() => availability.subscribe(() => { throw new Error("Broken surface consumer"); }));
    await eventually(() => availability.snapshot().journeys["read-note"]!.dependenciesReady);
    await host.identities.revoke(identity.id);
    await eventually(() => availability.snapshot().journeys["read-note"]!.blockers[0]?.reason === "session-required");
    await host.close();
    assert.equal(availability.snapshot().journeys["read-note"]!.blockers[0]?.reason, "disposed");
  } finally { await host.close(); }
});
