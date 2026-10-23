import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import { compile } from "../../src/compile.ts";
import { openLocalController, type LocalSession } from "../../src/local.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { CreateNote, ReadNote } from "../../products/notebook/journeys.ts";
import { NotesController } from "../../products/notebook/dependencies.ts";
import { journeyCases, noteSamples, type JourneyId } from "./notebook-cases.ts";
import type { postgresCluster } from "./postgres.ts";

export { journeyCases, type JourneyId } from "./notebook-cases.ts";
export const scenarioNames = ["success", "invalid", "authority", "recovery", "atomicity"] as const;
export type Scenario = typeof scenarioNames[number];

export function requireJourneyCoverage(ids: readonly string[], cases: Record<string, unknown>) {
  assert.deepEqual(Object.keys(cases).sort(), [...ids].sort(), "Every declared journey needs independent executable cases");
}

export async function runtime(cluster: ReturnType<typeof postgresCluster>, surface: string, journey: JourneyId) {
  const expected = journeyCases[journey];
  assert.ok(expected, `Missing declared Notebook journey case: ${journey}`);
  const database = await cluster.database();
  const host = await openLocalController(compile(Notebook), { ...database, roles: [NotesController.id] });
  const owner = await host.identities.issue("Owner");
  const stranger = await host.identities.issue("Stranger");
  const session = host.connect(owner.token, surface);
  const other = host.connect(stranger.token, surface);
  const seed = await session.prepare((await session.begin(CreateNote.id)).id, noteSamples.seed);
  const seedReceipt = await session.accept(seed.id, seed.confirmationDigest);
  const subject = journey === CreateNote.id ? undefined : seedReceipt.object.id;
  const all = async () => session.read((await session.begin(ReadNote.id)).id);
  const begin = (actor: LocalSession = session) => actor.begin(journey, subject);
  return { host, database, owner, session, other, subject, seedReceipt, all, begin, cluster, journey,
    expected, close: () => host.close() };
}
export type Runtime = Awaited<ReturnType<typeof runtime>>;

export async function eventually(condition: () => boolean) {
  for (let attempt = 0; attempt < 500; attempt++) {
    if (condition()) return;
    await delay(10);
  }
  assert.fail("Journey availability did not converge");
}
