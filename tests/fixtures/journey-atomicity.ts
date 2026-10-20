import assert from "node:assert/strict";
import { Pool } from "pg";
import type { Runtime } from "./journey-runtime.ts";

export async function atomicity(f: Runtime) {
  const admin = new Pool({ host: f.database.socketDirectory, database: f.database.database, user: f.database.user });
  try {
    const run = await f.begin();
    if (f.expected.kind === "read") {
      const before = (await admin.query("SELECT id, version, facts FROM desert_objects ORDER BY id")).rows;
      await f.session.read(run.id);
      await f.session.read(run.id);
      assert.deepEqual((await admin.query("SELECT id, version, facts FROM desert_objects ORDER BY id")).rows, before);
      assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "1");
      return;
    }
    const intent = await f.session.prepare(run.id, f.expected.input);
    await admin.query(`CREATE FUNCTION reject_receipt() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'journey receipt fault'; END $$;
      CREATE TRIGGER receipt_fault BEFORE INSERT ON desert_receipts FOR EACH ROW EXECUTE FUNCTION reject_receipt()`);
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /journey receipt fault/);
    assert.equal(await f.session.receipt(intent.id), null);
    assert.equal((await f.all()).length, 1);
    assert.equal((await f.all())[0]!.facts.state, "active");
    assert.equal((await f.all())[0]!.version, 1);
    assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "1");
    await admin.query("DROP TRIGGER receipt_fault ON desert_receipts");
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assert.deepEqual(await f.session.receipt(intent.id), receipt);
    assert.equal((await f.all()).length, f.expected.expectedCount);
  } finally { await admin.end(); }
}
