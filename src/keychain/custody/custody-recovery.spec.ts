import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { SecretCustody } from "./secret-custody.ts";
import type { CredentialFact, CredentialLedger } from "./custody-contract.ts";
it("un segundo escritor no recoge provisionales de una sesión viva", () => {
  const rig = custodyRig(),
    first = rig.open(),
    session = first.begin(custodyScope);
  const ref = session.capture(Buffer.from("sintetico"));
  expect(() => new SecretCustody(rig.file, rig.home, rig.keys)).toThrow("E-CUSTODY-LOCKED");
  expect(first.ids()).toContain(ref);
});
for (const after of [false, true])
  it(`corte ${after ? "después" : "antes"} de guardar el segundo material`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const old = { key: session.capture(Buffer.from("vigente")) };
    session.replace("signing", old, 0);
    let count = 0;
    const fail = vi.spyOn(CustodyDatabase.prototype, "put").mockImplementation(function (
      this: CustodyDatabase,
      ref,
      value,
    ) {
      if (++count !== 2 || after) this.db.prepare("update custody_material set payload=? where ref=?").run(value, ref);
      if (count === 2) throw new Error("corte");
    });
    session.capture(Buffer.from("certificado sintetico"));
    expect(() => session.capture(Buffer.from("llave sintetica"))).toThrow();
    store.close();
    fail.mockRestore();
    const recovered = rig.open();
    expect(recovered.ids()).toEqual([old.key]);
    expect(recovered.begin(custodyScope).current("signing")?.refs).toEqual(old);
  });
for (const committed of [false, true])
  it(`corte de vínculo con batch ${committed ? "confirmado" : "rechazado"}`, () => {
    const facts: CredentialFact[] = [];
    let fail = false;
    const ledger: CredentialLedger = {
      facts: () => facts,
      append: fact => {
        if (!fail || committed) facts.push(structuredClone(fact));
        if (fail) throw new Error("corte");
      },
    };
    const rig = custodyRig(),
      store = rig.open(ledger),
      session = store.begin(custodyScope);
    const old = { key: session.capture(Buffer.from("uno")) };
    session.replace("signing", old, 0);
    const next = { key: session.capture(Buffer.from("dos")) };
    fail = true;
    expect(() => session.replace("signing", next, 1)).toThrow();
    store.close();
    fail = false;
    const recovered = rig.open(ledger);
    expect(recovered.ids()).toEqual([committed ? next.key : old.key]);
    expect(recovered.begin(custodyScope).current("signing")?.refs).toEqual(committed ? next : old);
  });
it("borrado fallido revoca ya, informa pendiente y reintenta al abrir", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("sintetico")) };
  session.replace("signing", refs, 0);
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disco");
  });
  expect(() => session.release("signing", 1)).toThrow("E-CUSTODY-CLEANUP");
  await expect(store.adapter(session, ["signing"]).use(refs, () => true)).rejects.toThrow("E-CUSTODY-DENIED");
  expect(store.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(0);
  expect(store.facts().filter(fact => fact.kind === "credential-cleanup-pending")).toHaveLength(1);
  store.close();
  fail.mockRestore();
  const recovered = rig.open();
  expect(recovered.ids()).toEqual([]);
  expect(recovered.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(1);
});
for (const point of ["credential-cleanup-pending", "credential-purged"])
  it(`corte al escribir ${point} se retoma sin inventar un borrado`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("sintetico")) };
    session.replace("signing", refs, 0);
    const fail = vi.spyOn(CustodyDatabase.prototype, "append").mockImplementation(function (
      this: CustodyDatabase,
      fact,
    ) {
      if (fact.kind === point) throw new Error("corte");
      this.db.prepare("insert into custody_facts (body) values (?)").run(JSON.stringify(fact));
    });
    expect(() => session.release("signing", 1)).toThrow();
    expect(session.current("signing")).toBeUndefined();
    store.close();
    fail.mockRestore();
    const recovered = rig.open();
    expect(recovered.ids()).toEqual([]);
    expect(recovered.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(1);
  });
