import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
for (const after of [false, true])
  it(`un corte ${after ? "después" : "antes"} de anclar recupera un agregado`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("inventado")) };
    const anchor = rig.keys.anchor.bind(rig.keys);
    const fail = vi.spyOn(rig.keys, "anchor").mockImplementation((house, head) => {
      if (after) anchor(house, head);
      throw new Error("corte");
    });
    expect(() => session.replace("signing", refs, 0)).not.toThrow();
    expect(store.anchorPending()).toBe(true);
    store.close();
    fail.mockRestore();
    const again = rig.open();
    expect(again.begin(custodyScope).current("signing")?.refs).toEqual(refs);
  });
it("dos agregados por delante del ancla no se aceptan como un corte simple", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("inventado")) };
  const head = vi.spyOn(rig.keys, "head");
  session.replace("one", refs, 0);
  session.replace("two", refs, 0);
  const house = head.mock.calls[0]?.[0];
  if (!house) throw new Error("fixture");
  rig.keys.anchor(house, { count: 0, authentication: "" });
  expect(() => store.facts()).toThrow("E-CUSTODY-ROLLBACK");
  store.close();
  expect(() => rig.open()).toThrow("E-CUSTODY-ROLLBACK");
});
for (const shape of ["empty", "empty-plus-marker", "prefix", "missing", "different"])
  it(`el ancla detecta ${shape}; no modifica el registro rechazado`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("inventado")) };
    session.replace("one", refs, 0);
    session.replace("two", refs, 0);
    store.close();
    const db = new DatabaseSync(rig.file);
    db.exec("drop trigger custody_no_delete");
    if (shape === "empty" || shape === "empty-plus-marker") db.exec("delete from custody_facts");
    if (shape === "empty-plus-marker") db.exec("delete from custody_meta where name='key-check'");
    if (shape === "prefix") db.exec("delete from custody_facts where seq=2");
    const house = String(db.prepare("select value from custody_meta where name='house-id'").get()?.value);
    db.close();
    if (shape === "missing") vi.spyOn(rig.keys, "head").mockReturnValue(undefined);
    if (shape === "different") rig.keys.anchor(house, { count: 2, authentication: "a".repeat(64) });
    expect(() => rig.open()).toThrow(
      shape === "missing"
        ? "E-CUSTODY-KEY"
        : /E-CUSTODY-ROLLBACK.*quitaron renglones.*copia vieja.*acceptRestoredCopy/u,
    );
  });
it("aceptar una restauración verifica todo antes de mover el ancla", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("inventado")) };
  session.replace("signing", refs, 0);
  const head = custodyHead(store.facts());
  store.close();
  const db = new CustodyDatabase(rig.file),
    house = db.identity();
  db.remove(refs.key);
  db.close();
  const before = rig.keys.head(house);
  expect(() => SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, head)).toThrow("E-CUSTODY-MISSING");
  expect(rig.keys.head(house)).toEqual(before);
});
it("un lote de varios vínculos es un solo agregado recuperable y no admite un prefijo cortado", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("inventado")) };
  const anchor = vi.spyOn(rig.keys, "anchor").mockImplementation(() => {
    throw new Error("corte");
  });
  expect(() =>
    store.deferCleanup(() => {
      store.confirm(session, "one", 0, refs);
      store.confirm(session, "two", 0, refs);
    }),
  ).not.toThrow();
  expect(store.anchorPending()).toBe(true);
  store.close();
  anchor.mockRestore();
  const recovered = rig.open();
  expect(recovered.facts()).toHaveLength(2);
  expect(recovered.begin(custodyScope).current("two")?.refs).toEqual(refs);
  recovered.close();
  const db = new DatabaseSync(rig.file);
  db.exec("drop trigger custody_no_delete; delete from custody_facts where seq=2");
  db.close();
  expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
});
it("los recibos de la versión retirada no ocultan el material ausente del vínculo vigente", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  session.replace("signing", { key: session.capture(Buffer.from("uno")) }, 0);
  const refs = { key: session.capture(Buffer.from("dos")) };
  session.replace("signing", refs, 1);
  store.close();
  const db = new CustodyDatabase(rig.file);
  db.remove(refs.key);
  db.close();
  expect(() => rig.open()).toThrow("E-CUSTODY-MISSING");
});
