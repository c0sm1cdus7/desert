import { expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
for (const field of ["id", "actor", "tool", "target", "slot", "cause", "revision", "refs", "batchSize", "batchIndex"])
  it(`alterar ${field} no conserva una firma válida aunque se conserve la cabeza`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("inventado")) };
    session.replace("signing", refs, 0);
    store.close();
    const db = new DatabaseSync(rig.file);
    db.exec("drop trigger custody_no_update");
    let value = JSON.stringify("changed");
    if (["revision", "batchSize", "batchIndex"].includes(field)) value = "3";
    if (field === "refs") value = JSON.stringify({ different: refs.key });
    db.prepare("update custody_facts set body=json_set(body, ?, json(?)) where seq=1").run(`$.${field}`, value);
    db.close();
    expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  });
