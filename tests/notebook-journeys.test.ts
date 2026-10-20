import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { compile } from "../src/compile.ts";
import { Notebook } from "../products/notebook/product.ts";
import { postgresCluster } from "./fixtures/postgres.ts";
import { journeyCases, scenarioNames, requireJourneyCoverage, runtime, type JourneyId, type Runtime, type Scenario } from "./fixtures/journey-runtime.ts";
import { success, invalid, authority } from "./fixtures/journey-behaviors.ts";
import { recovery } from "./fixtures/journey-recovery.ts";
import { atomicity } from "./fixtures/journey-atomicity.ts";

const behaviors: Record<Scenario, (fixture: Runtime) => Promise<void>> = { success, invalid, authority, recovery, atomicity };
const ids = compile(Notebook).executionPlan().journeys.map(journey => journey.id);
const surfaces = Notebook.surfaces.map(surface => surface.id);
let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

test("Notebook evidence covers exactly the declared journeys and every required behavior", () => {
  requireJourneyCoverage(ids, journeyCases);
  assert.deepEqual(Notebook.surfaces.map(surface => surface.id).sort(), [...surfaces].sort(), "Every surface needs execution cases");
  assert.deepEqual(Object.keys(behaviors).sort(), [...scenarioNames].sort());
  for (const surface of Notebook.surfaces) {
    assert.deepEqual([...compile(Notebook).surface(surface.id).journeys.map(journey => journey.id)].sort(), [...ids].sort());
  }
});

test("adding a compiled journey or removing its independent cases fails the coverage gate", () => {
  const changed = { ...Notebook, journeys: [...Notebook.journeys, { ...Notebook.journeys[0]!, id: "uncovered-create" }] };
  const added = compile(changed).executionPlan().journeys.map(journey => journey.id);
  assert.throws(() => requireJourneyCoverage(added, journeyCases), /Every declared journey/);
  assert.throws(() => requireJourneyCoverage(ids, { "read-note": journeyCases["read-note"] }), /Every declared journey/);
});

for (const surface of surfaces) {
  for (const journey of Object.keys(journeyCases) as JourneyId[]) {
    for (const scenario of scenarioNames) {
      test(`Notebook ${surface}/${journey}: ${scenario}`, { timeout: 15000 }, async () => {
        const f = await runtime(cluster, surface, journey);
        try { await behaviors[scenario](f); }
        finally { cluster.start(); await f.close(); }
      });
    }
  }
}
