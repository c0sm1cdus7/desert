import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { copyFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./secret-custody.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { containing } from "../../../tests/support/custody-files.ts";
it("p9: legado con filas sin proveedor falla antes de crear tablas o cambiar bytes", () => {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  db.exec("create table secrets(id text primary key, value text)");
  db.prepare("insert into secrets values (?,?)").run("secret:00000000-0000-0000-0000-000000000001", "invented");
  db.close();
  const before = readdirSync(rig.home).map(name => [name, readFileSync(join(rig.home, name))]);
  expect(() => new SecretCustody(rig.file, rig.home)).toThrow("E-CUSTODY-PROVIDER");
  expect(readdirSync(rig.home).map(name => [name, readFileSync(join(rig.home, name))])).toEqual(before);
});
it("el formato por casa de los commits no unidos se rechaza y no se convierte", () => {
  const rig = custodyRig(),
    db = new CustodyDatabase(rig.file);
  db.identity();
  db.saveKeyCheck("1.antiguo");
  db.close();
  const before = readFileSync(rig.file);
  expect(() => rig.open()).toThrow(/E-CUSTODY-FORMAT.*no se convierte/u);
  expect(readFileSync(rig.file)).toEqual(before);
});
it("M7c: compactar retira las páginas libres del legado, no solo la tabla", () => {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  db.exec("create table secrets(id text primary key, value text)");
  for (let n = 0; n < 8; n++)
    db.prepare("insert into secrets values (?,?)").run(
      `secret:00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
      `SINTETICO${n}`.repeat(16000),
    );
  db.close();
  rig.open().close();
  const after = new DatabaseSync(rig.file);
  expect(Number(after.prepare("pragma freelist_count").get()?.freelist_count)).toBeLessThanOrEqual(2);
  expect(after.prepare("select name from sqlite_master where name='secrets'").get()).toBeUndefined();
  after.close();
  expect(containing(rig.home, "SINTETICO")).toEqual([]);
});
it("p11: recuperar muchos provisionales tampoco repite recorridos por cada material", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  for (let n = 0; n < 50; n++) session.capture(Buffer.from(`invented-${n}`));
  store.close();
  const rows = vi.spyOn(CustodyDatabase.prototype, "rows"),
    facts = vi.spyOn(CustodyDatabase.prototype, "facts");
  expect(rig.open().ids()).toEqual([]);
  const reads =
    rows.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length +
    facts.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length;
  expect(reads).toBeLessThanOrEqual(50 * 20);
});
it("olvidar advierte sobre las copias; solo con aceptación borra todas las llaves", () => {
  const rig = custodyRig(),
    copy = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  store.close();
  copyFileSync(rig.file, copy.file);
  const again = rig.open();
  expect(again.forgetWarning()).toMatch(/ilegibles.*otras copias.*misma carpeta/u);
  expect(() => again.forgetHouse("sí")).toThrow("E-CUSTODY-DENIED");
  again.forgetHouse(again.forgetWarning());
  expect(() => new SecretCustody(copy.file, copy.home, rig.keys)).toThrow("E-CUSTODY-KEY");
  expect(() => rig.open()).toThrow("E-CUSTODY-KEY");
});
it("una llave que no se pudo borrar queda pendiente, no borra otra referencia y se reintenta", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  const fail = vi.spyOn(rig.keys, "forget").mockImplementation(() => {
    throw new Error("llavero");
  });
  expect(() => session.release("signing", 1)).toThrow("E-CUSTODY-CLEANUP");
  expect(store.cleanupPending()).toBe(true);
  expect(store.facts().some(f => f.kind === "credential-purged")).toBe(false);
  store.close();
  const reopened = rig.open();
  expect(reopened.cleanupPending()).toBe(true);
  fail.mockRestore();
  reopened.collect();
  expect(reopened.cleanupPending()).toBe(false);
  expect(reopened.facts().some(f => f.kind === "credential-purged")).toBe(true);
});
it("abrir verifica la presencia de cada llave de secreto sin recrearla", () => {
  const rig = custodyRig(),
    store = rig.open();
  const ref = store.keep(Buffer.from("invented"));
  store.close();
  const db = new CustodyDatabase(rig.file),
    house = db.identity();
  db.close();
  rig.keys.forget(`${house}-secret-${ref.slice(7)}`);
  const key = vi.spyOn(rig.keys, "key");
  expect(() => rig.open()).toThrow("E-CUSTODY-KEY");
  expect(key.mock.calls.every(args => !args[1])).toBe(true);
});
it("una casa vacía sin proveedor no tiene una falla de limpieza ni necesita llavero", () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home);
  try {
    expect(store.cleanupPending()).toBe(false);
    expect(() => store.collect()).not.toThrow();
    expect(store.cleanupPending()).toBe(false);
  } finally {
    store.close();
  }
});
it("la purga conserva el alcance del vínculo y no repite recibos al recolectar o reabrir", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  const bound = store.facts().find(fact => fact.kind === "credential-bound");
  session.release("signing", 1);
  expect(store.ids()).toEqual([]);
  const receipts = store.facts().filter(fact => fact.kind === "credential-purged");
  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({ ...custodyScope, slot: "signing", revision: 1, cause: bound?.id });
  const facts = store.facts();
  store.collect();
  store.collect();
  expect(store.facts()).toEqual(facts);
  store.close();
  expect(rig.open().facts()).toEqual(facts);
});
it("recolectar una casa cerrada rechaza la operación sin volver a tocar su almacenamiento", () => {
  const store = custodyRig().open();
  store.close();
  expect(() => store.collect()).toThrow("E-CUSTODY-DENIED");
});
it("un fallo antes de escribir pendientes de mantenimiento tampoco tapa el resultado y queda visible", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  let restore = () => {};
  await expect(
    store.adapter(session, []).use(refs, () => {
      const failure = vi.spyOn(CustodyDatabase.prototype, "rows").mockImplementation(() => {
        throw new Error("almacenamiento");
      });
      restore = () => {
        failure.mockRestore();
      };
      return "acuse";
    }),
  ).resolves.toBe("acuse");
  expect(store.cleanupPending()).toBe(true);
  restore();
  store.collect();
  expect(store.cleanupPending()).toBe(false);
});
it("terminar un préstamo después de cerrar no inventa una limpieza pendiente", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  store.close();
  store.finish(session);
  expect(store.cleanupPending()).toBe(false);
});
