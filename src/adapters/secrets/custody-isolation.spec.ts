import { expect, it, vi } from "vitest";
import { createDecipheriv } from "node:crypto";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
import { CustodyCipher } from "./custody/custody-cipher.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
it("una llave robada abre solo su secreto; la del registro no abre ninguno", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = [session.capture(Buffer.from("uno")), session.capture(Buffer.from("dos"))];
  store.close();
  const db = new CustodyDatabase(rig.file),
    house = db.identity(),
    rows = db.rows();
  db.close();
  const registry = rig.keys.key(house, false);
  const keys = refs.map(ref => rig.keys.key(`${house}-secret-${ref.slice(7)}`, false));
  expect(keys[0]).not.toEqual(keys[1]);
  expect(keys).not.toContainEqual(registry);
  for (const [i, row] of rows.entries())
    for (const [j, key] of [...keys, registry].entries()) {
      if (!row.payload) throw new Error("fixture");
      const parts = row.payload.split(".");
      const decrypt = () => {
        const native = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1] ?? "", "base64"));
        native.setAAD(Buffer.from(JSON.stringify([2, house, row.ref])));
        native.setAuthTag(Buffer.from(parts[2] ?? "", "base64"));
        native.update(Buffer.from(parts[3] ?? "", "base64"));
        native.final();
      };
      if (i === j) expect(decrypt).not.toThrow();
      else expect(decrypt).toThrow();
    }
  keys.forEach(key => key.fill(0));
  registry.fill(0);
});
it("abrir y vincular no piden llaves de secretos; un uso pide solo la suya y borra cada copia", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("uno")) };
  session.replace("signing", refs, 0);
  store.keep(Buffer.from("dos"));
  store.close();
  const copies: Uint8Array[] = [],
    accounts: string[] = [],
    key = rig.keys.key.bind(rig.keys);
  vi.spyOn(rig.keys, "key").mockImplementation((account, create) => {
    accounts.push(account);
    const copy = key(account, create);
    copies.push(copy);
    return copy;
  });
  const again = rig.open(),
    next = again.begin(custodyScope);
  next.replace("another", refs, 0);
  expect(accounts.some(account => account.includes("-secret-"))).toBe(false);
  accounts.length = 0;
  await again.adapter(next, ["signing"]).use(refs, values => {
    expect(Buffer.from(values.key ?? []).toString()).toBe("uno");
    expect(copies.every(copy => copy.every(byte => byte === 0))).toBe(true);
    return 1;
  });
  expect(accounts.filter(account => account.includes("-secret-"))).toEqual([
    expect.stringContaining(refs.key.slice(7)),
  ]);
  expect(copies.every(copy => copy.every(byte => byte === 0))).toBe(true);
});
it("un fallo parcial al preparar un par borra el primer material sin llamar al adaptador", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { a: session.capture(Buffer.from("uno")), b: session.capture(Buffer.from("dos")) };
  session.replace("signing", refs, 0);
  const decrypt = vi.spyOn(CustodyCipher.prototype, "open"),
    key = rig.keys.key.bind(rig.keys);
  vi.spyOn(rig.keys, "key").mockImplementation((account, create) => {
    if (account.endsWith(refs.b.slice(7))) throw new Error("falló");
    return key(account, create);
  });
  const body = vi.fn();
  await expect(store.adapter(session, ["signing"]).use(refs, body)).rejects.toThrow();
  expect(body).not.toHaveBeenCalled();
  const buffers = decrypt.mock.results.flatMap(result => (result.type === "return" ? [result.value] : []));
  expect(buffers).toHaveLength(1);
  expect(buffers[0]?.every(byte => byte === 0)).toBe(true);
});
it("M18: cerrar durante uso borra lo prestado inmediatamente y al finalizar", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("inventado")) };
  let finish = () => {},
    borrowed: Uint8Array | undefined;
  const work = store.adapter(session, []).use(refs, values => {
    borrowed = values.key;
    return new Promise<void>(resolve => {
      finish = resolve;
    });
  });
  expect(borrowed?.some(byte => byte !== 0)).toBe(true);
  if (!borrowed) throw new Error("fixture");
  const erase = vi.spyOn(borrowed, "fill");
  store.close();
  store.close();
  expect(erase).toHaveBeenCalledTimes(1);
  expect(borrowed.every(byte => byte === 0)).toBe(true);
  finish();
  await expect(work).rejects.toMatchObject({ code: "E-CUSTODY-DENIED" });
  expect(borrowed.every(byte => byte === 0)).toBe(true);
  expect(erase).toHaveBeenCalledTimes(2);
  expect(store.cleanupPending()).toBe(false);
});
it("un ingreso denegado borra su búfer y la falta tardía de proveedor dice qué falta", () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home),
    session = store.begin(custodyScope);
  const value = Buffer.from("inventado");
  expect(() => session.capture(value)).toThrow(/E-CUSTODY-PROVIDER.*secretKeys/u);
  expect(value.every(byte => byte === 0)).toBe(true);
  store.close();
});
it("una sesión cancelada no vuelve a ingresar material y borra la entrada rechazada", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope),
    input = Buffer.from("sintetico");
  session.cancel();
  expect(() => session.capture(input)).toThrow("E-CUSTODY-DENIED");
  expect(input.every(byte => byte === 0)).toBe(true);
  expect(store.ids()).toEqual([]);
});
