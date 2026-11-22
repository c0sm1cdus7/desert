import { SecretCustody } from "./secret-custody.ts";
import { expect, it } from "vitest";
import { copyFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
for (const mutation of ["append", "edit", "duplicate", "reorder", "malformed"])
  it(`rejects the tampered record: ${mutation} (a1/a2)`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("SYNTHETIC")) };
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
it("an old copy requires explicit acceptance; only material whose key is still present comes back", async () => {
  const rig = custodyRig(),
    backup = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("PREVIOUS")) };
  session.replace("signing", refs, 0);
  const head = custodyHead(store.facts());
  store.close();
  copyFileSync(rig.file, backup.file);
  const next = rig.open();
  next.retain(refs.key, "respaldo aceptable");
  next.begin(custodyScope).release("signing", 1);
  expect(next.ids()).toEqual([refs.key]);
  next.close();
  copyFileSync(backup.file, rig.file);
  expect(() => rig.open()).toThrow("E-CUSTODY-ROLLBACK");
  SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, head);
  const restored = rig.open();
  expect(
    await restored
      .adapter(restored.begin(custodyScope), ["signing"])
      .use(refs, m => Buffer.from(m.key ?? []).toString("utf8")),
  ).toBe("PREVIOUS");
});
