import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { postgresCluster } from "./fixtures/postgres.ts";
import { runtime } from "./fixtures/journey-runtime.ts";
import { ArchiveNote, ReadNote } from "../products/notebook/journeys.ts";
import { Notebook } from "../products/notebook/product.ts";
import { initialState, noteSamples } from "./fixtures/notebook-cases.ts";

let cluster: ReturnType<typeof postgresCluster>;
before(() => { cluster = postgresCluster(); });
after(() => { cluster?.dispose(); });

for (const surface of Notebook.surfaces.map(surface => surface.id)) {
  test(`Notebook ${surface}: archive preserves note content`, async () => {
    const f = await runtime(cluster, surface, ArchiveNote.id);
    try {
      const read = await f.session.begin(ReadNote.id, f.subject);
      const initial = (await f.session.read(read.id))[0]!;
      assert.deepEqual(initial.facts, { ...noteSamples.seed, state: initialState }, "FIXTURE_PRECONDITION");
      const intent = await f.session.prepare((await f.begin()).id, {});
      const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
      assert.equal(receipt.status, "completed");
      const archived = (await f.session.read(read.id))[0]!;
      const writes = new Set(Object.keys(ArchiveNote.command.set));
      const preserved = (facts: typeof archived.facts) =>
        Object.fromEntries(Object.entries(facts).filter(([field]) => !writes.has(field)));
      assert.deepEqual(preserved(archived.facts), preserved(initial.facts), "ARCHIVE_PRESERVATION_VIOLATION");
      for (const [field, expression] of Object.entries(ArchiveNote.command.set)) {
        assert.equal(expression.kind, "literal", "Unsupported Notebook fixture expression");
        if (expression.kind === "literal") assert.equal(archived.facts[field], expression.value);
      }
      assert.equal(archived.id, initial.id);
      assert.equal(archived.version, initial.version + 1);
      assert.deepEqual(await f.session.accept(intent.id, intent.confirmationDigest), receipt);
      assert.deepEqual((await f.session.read(read.id))[0], archived);
    } finally { await f.close(); }
  });
}
