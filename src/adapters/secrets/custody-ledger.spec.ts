import { expect, it } from "vitest";
import { copyFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
for (const mutation of ["append", "edit", "duplicate", "reorder", "malformed"])
  it(`rechaza el registro adulterado: ${mutation} (a1/a2)`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture("SINTETICO") };
    session.replace("signing", refs, 0);
    session.replace("another", refs, 0);
    store.close();
    const db = new DatabaseSync(rig.file);
    if (mutation === "append")
      db.prepare("insert into custody_facts (body) values (?)").run(
        JSON.stringify({
          id: "forged",
          kind: "credential-bound",
          ...custodyScope,
          tool: "other",
          slot: "signing",
          revision: 1,
          refs,
          cause: "",
        }),
      );
    if (mutation === "malformed") db.exec("insert into custody_facts (body) values ('not-json')");
    if (mutation === "duplicate")
      db.exec("insert into custody_facts (body) select body from custody_facts where seq=1");
    if (mutation === "edit") {
      db.exec("drop trigger custody_no_update");
      db.exec("update custody_facts set body=replace(body, 'vault', 'other') where seq=1");
    }
    if (mutation === "reorder") {
      db.exec("drop trigger custody_no_update");
      db.exec("update custody_facts set seq=-seq; update custody_facts set seq=3+seq");
    }
    db.close();
    expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  });
it("una copia vieja completa restaura los secretos que contenía: límite explícito (a2)", async () => {
  const rig = custodyRig(),
    backup = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture("ANTERIOR") };
  session.replace("signing", refs, 0);
  store.close();
  copyFileSync(rig.file, backup.file);
  const next = rig.open();
  next.begin(custodyScope).release("signing", 1);
  expect(next.ids()).toEqual([]);
  next.close();
  copyFileSync(backup.file, rig.file);
  const restored = rig.open();
  expect(await restored.adapter(restored.begin(custodyScope), ["signing"]).use(refs, m => m.key)).toBe("ANTERIOR");
});
