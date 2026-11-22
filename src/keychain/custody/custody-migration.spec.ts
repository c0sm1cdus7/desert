import { CustodyCipher } from "./custody-cipher.ts";
import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { containing } from "../../../tests/support/custody-files.ts";
import { randomUUID } from "node:crypto";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody-database.ts";
import type { SecretRef } from "./custody-contract.ts";
function legacy() {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  // Exact field-vault schema of ac07248; only deliberately synthetic values are ever inserted.
  db.exec("create table secrets (id text primary key, value text not null unique)");
  const refs: { key: SecretRef; certificate: SecretRef } = {
    key: `secret:${randomUUID()}`,
    certificate: `secret:${randomUUID()}`,
  };
  db.prepare("insert into secrets values (?, ?)").run(refs.key, "PREVIOUS_MARKER\nSYNTHETIC");
  db.prepare("insert into secrets values (?, ?)").run(refs.certificate, "");
  db.close();
  return { ...rig, refs };
}
it("adopts encrypting, verifies reads, keeps ids and retains unauthorized until an owner is declared", async () => {
  const rig = legacy(),
    custody = rig.open(),
    session = custody.begin(custodyScope);
  expect(custody.ids().sort()).toEqual(Object.values(rig.refs).sort());
  await expect(custody.adapter(session, ["signing"]).use(rig.refs, () => true)).rejects.toThrow();
  custody.close();
  expect(containing(rig.home, "PREVIOUS_MARKER")).toEqual([]);
  const reopened = rig.open();
  reopened.adopt(custodyScope, "signing", rig.refs);
  const next = reopened.begin(custodyScope);
  expect(
    await reopened
      .adapter(next, ["signing"])
      .use(rig.refs, values => Buffer.from(values.certificate ?? []).toString("utf8") === ""),
  ).toBe(true);
  reopened.close();
  const again = rig.open();
  expect(again.begin(custodyScope).current("signing")).toEqual({ revision: 1, refs: rig.refs });
});
for (const point of ["retireLegacy", "compactLegacy"] as const)
  it(`resumes an adoption cut at ${point}, even with the previous WAL journal`, () => {
    const rig = legacy(),
      old = new DatabaseSync(rig.file);
    old.exec("pragma journal_mode=WAL;");
    old.close();
    const failure = vi.spyOn(CustodyDatabase.prototype, point).mockImplementation(() => {
      throw new Error("cut");
    });
    expect(() => rig.open()).toThrow("E-CUSTODY-STORAGE");
    failure.mockRestore();
    const recovered = rig.open();
    expect(recovered.ids().sort()).toEqual(Object.values(rig.refs).sort());
    recovered.close();
    expect(containing(rig.home, "PREVIOUS_MARKER")).toEqual([]);
  });
it("a cut between encrypted records keeps the old one and resumes without losing or changing references", () => {
  const rig = legacy();
  let writes = 0;
  const failure = vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (
    this: CustodyDatabase,
    ref,
    payload,
  ) {
    if (++writes === 2) throw new Error("SYNTHETIC_CUT");
    this.db.prepare("update custody_material set payload=? where ref=?").run(payload, ref);
  });
  expect(() => rig.open()).toThrow();
  const db = new DatabaseSync(rig.file);
  expect(db.prepare("select count(*) as n from secrets").get()?.n).toBe(2);
  db.close();
  failure.mockRestore();
  const custody = rig.open();
  expect(custody.ids().sort()).toEqual(Object.values(rig.refs).sort());
  for (const ref of Object.values(rig.refs)) expect(() => custody.verifyLegacy(ref)).not.toThrow();
});
it("if the encrypted copy cannot be read, the old one is not retired", () => {
  const rig = legacy();
  const failure = vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (this: CustodyDatabase, ref) {
    this.db.prepare("update custody_material set payload=? where ref=?").run("1.invalid.invalid.invalid", ref);
  });
  expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  failure.mockRestore();
  const db = new DatabaseSync(rig.file);
  expect(db.prepare("select count(*) as n from secrets").get()?.n).toBe(2);
  db.close();
});
it("a valid encrypted copy of another value does not allow retiring the original", () => {
  const rig = legacy();
  vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (this: CustodyDatabase, ref) {
    const cipher = new CustodyCipher(this.identity(), rig.keys);
    const other = cipher.seal(ref, Buffer.from("OTHER_SYNTHETIC_VALUE"), false);
    this.db.prepare("update custody_material set payload=? where ref=?").run(other, ref);
  });
  expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  const db = new DatabaseSync(rig.file);
  expect(db.prepare("select count(*) as n from secrets").get()?.n).toBe(2);
  db.close();
});
