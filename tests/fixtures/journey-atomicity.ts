import assert from "node:assert/strict";
import { Pool } from "pg";
import { compile } from "../../src/compile.ts";
import { Notebook } from "../../products/notebook/product.ts";
import { renderWriteFault, renderWriteFaultRemoval } from "../../src/storage/render-faults.ts";
import { receiptsTable } from "../../src/storage/tables/local.ts";
import { storedObjects } from "../../src/testing/stored-objects.ts";
import type { Runtime } from "./journey-runtime.ts";

const receiptFault = { name: "receipt_fault", event: "INSERT", message: "journey receipt fault" } as const;

export async function atomicity(f: Runtime) {
  const admin = new Pool({ host: f.database.socketDirectory, database: f.database.database, user: f.database.user });
  const application = compile(Notebook);
  try {
    const run = await f.begin();
    if (f.expected.kind === "read") {
      const before = await storedObjects(admin, application);
      await f.session.read(run.id);
      await f.session.read(run.id);
      assert.deepEqual(await storedObjects(admin, application), before);
      assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "1");
      return;
    }
    const intent = await f.session.prepare(run.id, f.expected.input);
    await admin.query(renderWriteFault(receiptsTable, receiptFault));
    await assert.rejects(f.session.accept(intent.id, intent.confirmationDigest), /journey receipt fault/);
    assert.equal(await f.session.receipt(intent.id), null);
    assert.equal((await f.all()).length, 1);
    assert.equal((await f.all())[0]!.facts.state, "active");
    assert.equal((await f.all())[0]!.version, 1);
    assert.equal((await admin.query("SELECT count(*) FROM desert_receipts")).rows[0].count, "1");
    await admin.query(renderWriteFaultRemoval(receiptsTable, receiptFault));
    const receipt = await f.session.accept(intent.id, intent.confirmationDigest);
    assert.deepEqual(await f.session.receipt(intent.id), receipt);
    assert.equal((await f.all()).length, f.expected.expectedCount);
  } finally { await admin.end(); }
}
