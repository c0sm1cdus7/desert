import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
import type { SecretRef } from "./custody/custody-contract.ts";
function legacy() {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  // Exact field-vault schema of ac07248; only deliberately synthetic values are ever inserted.
  db.exec("create table secrets (id text primary key, value text not null unique)");
  const refs: { key: SecretRef; certificate: SecretRef } = {
    key: `secret:${randomUUID()}`,
    certificate: `secret:${randomUUID()}`,
  };
  db.prepare("insert into secrets values (?, ?)").run(refs.key, "MARCADOR_ANTERIOR\nSINTETICO");
  db.prepare("insert into secrets values (?, ?)").run(refs.certificate, "");
  db.close();
  return { ...rig, refs };
}
it("adopta cifrando, verifica lectura, conserva ids y retiene sin autorizar hasta declarar dueño", async () => {
  const rig = legacy(),
    custody = rig.open(),
    session = custody.begin(custodyScope);
  expect(custody.ids().sort()).toEqual(Object.values(rig.refs).sort());
  await expect(custody.adapter(session, ["signing"]).use(rig.refs, () => true)).rejects.toThrow();
  custody.close();
  expect(readFileSync(rig.file).includes(Buffer.from("MARCADOR_ANTERIOR"))).toBe(false);
  const reopened = rig.open();
  reopened.adopt(custodyScope, "signing", rig.refs);
  const next = reopened.begin(custodyScope);
  expect(await reopened.adapter(next, ["signing"]).use(rig.refs, values => values.certificate === "")).toBe(true);
  reopened.close();
  const again = rig.open();
  expect(again.begin(custodyScope).current("signing")).toEqual({ revision: 1, refs: rig.refs });
});
for (const point of ["retireLegacy", "compactLegacy"] as const)
  it(`retoma adopción cortada en ${point}, incluso con el diario WAL anterior`, () => {
    const rig = legacy(),
      old = new DatabaseSync(rig.file);
    old.exec("pragma journal_mode=WAL;");
    old.close();
    const failure = vi.spyOn(CustodyDatabase.prototype, point).mockImplementation(() => {
      throw new Error("corte");
    });
    expect(() => rig.open()).toThrow("E-CUSTODY-STORAGE");
    failure.mockRestore();
    const recovered = rig.open();
    expect(recovered.ids().sort()).toEqual(Object.values(rig.refs).sort());
    recovered.close();
    for (const file of readdirSync(rig.home))
      expect(readFileSync(join(rig.home, file)).includes(Buffer.from("MARCADOR_ANTERIOR"))).toBe(false);
  });
it("un corte entre registros cifrados conserva lo viejo y retoma sin perder ni cambiar referencias", () => {
  const rig = legacy();
  let writes = 0;
  const failure = vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (
    this: CustodyDatabase,
    ref,
    payload,
  ) {
    if (++writes === 2) throw new Error("CORTE_SINTETICO");
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
it("si la copia cifrada no se puede leer, lo viejo no se retira", () => {
  const rig = legacy();
  const failure = vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (this: CustodyDatabase, ref) {
    this.db.prepare("update custody_material set payload=? where ref=?").run("1.invalido.invalido.invalido", ref);
  });
  expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  failure.mockRestore();
  const db = new DatabaseSync(rig.file);
  expect(db.prepare("select count(*) as n from secrets").get()?.n).toBe(2);
  db.close();
});
