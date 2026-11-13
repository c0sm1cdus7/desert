import { expect, it } from "vitest";
import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
import { MemoryHouseKeys } from "./custody/house-keys.ts";
it("la identidad persiste al renombrar, mover y abrir por enlace o mayúsculas (a1/a2)", async () => {
  const rig = custodyRig(),
    folder = join(rig.home, "Casa");
  mkdirSync(folder);
  const file = join(folder, "fixture.sqlite");
  const store = new SecretCustody(file, folder, rig.keys),
    session = store.begin(custodyScope);
  const refs = { key: session.capture("SINTETICO") };
  session.replace("signing", refs, 0);
  store.close();
  const moved = join(rig.home, "Movida");
  renameSync(folder, moved);
  const linked = join(rig.home, "enlace");
  symlinkSync(moved, linked);
  const paths = [moved, linked];
  if (existsSync(join(rig.home, "MOVIDA"))) paths.push(join(rig.home, "MOVIDA"));
  for (const path of paths) {
    const reopened = new SecretCustody(join(path, "fixture.sqlite"), path, rig.keys);
    try {
      expect(await reopened.adapter(reopened.begin(custodyScope), ["signing"]).use(refs, m => m.key)).toBe("SINTETICO");
    } finally {
      reopened.close();
    }
  }
});
it("una casa nueva en la ruta de una borrada pide otra identidad y otra llave (a2)", () => {
  const rig = custodyRig(),
    identities: string[] = [],
    copies: Uint8Array[] = [];
  const provider = {
    forget() {},
    key: (id: string, create: boolean) => {
      identities.push(id);
      const value = rig.keys.key(id, create);
      copies.push(Uint8Array.from(value));
      return value;
    },
  };
  for (let index = 0; index < 2; index++) {
    const store = new SecretCustody(rig.file, rig.home, provider);
    store.keep("SINTETICO");
    store.close();
    rmSync(rig.file);
  }
  expect(new Set(identities).size).toBe(2);
  for (const id of identities) expect(id).toMatch(/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/u);
  expect(copies[0]).not.toEqual(copies[1]);
});
it("una copia en otra máquina requiere llevar su llave y después conserva identidad (a2)", () => {
  const rig = custodyRig(),
    copy = custodyRig(),
    store = rig.open();
  store.keep("SINTETICO");
  store.close();
  copyFileSync(rig.file, copy.file);
  expect(() => new SecretCustody(copy.file, copy.home, new MemoryHouseKeys())).toThrow(/llave.*traslad/iu);
  const restored = new SecretCustody(copy.file, copy.home, rig.keys);
  expect(restored.ids()).toHaveLength(1);
  restored.close();
});
it("si falta la llave con material guardado, jamás se pide crearla (a5/a9)", () => {
  const rig = custodyRig(),
    store = rig.open();
  store.keep("SINTETICO");
  store.close();
  for (const removeCheck of [false, true]) {
    if (removeCheck) {
      const db = new DatabaseSync(rig.file);
      db.exec("delete from custody_meta where name='key-check'");
      db.close();
    }
    const calls: boolean[] = [];
    expect(
      () =>
        new SecretCustody(rig.file, rig.home, {
          forget() {},
          key: (_id, create) => {
            calls.push(create);
            throw new Error("ausente");
          },
        }),
    ).toThrow("E-CUSTODY-KEY");
    expect(calls).toEqual([false]);
  }
});

it("otra identidad rechaza el mismo registro aun si el proveedor repite la llave", () => {
  const first = custodyRig(),
    second = custodyRig();
  const keys = { forget() {}, key: () => new Uint8Array(32).fill(13) };
  const a = new SecretCustody(first.file, first.home, keys);
  const ref = a.keep("SINTETICO");
  a.close();
  const b = new SecretCustody(second.file, second.home, keys);
  b.importLegacy(ref, "OTRO");
  b.close();
  const source = new DatabaseSync(first.file),
    target = new DatabaseSync(second.file);
  const payload = source.prepare("select payload from custody_material where ref=?").get(ref)?.payload;
  if (typeof payload !== "string") throw new Error("fixture");
  target.prepare("update custody_material set payload=? where ref=?").run(payload, ref);
  source.close();
  target.close();
  expect(() => new SecretCustody(second.file, second.home, keys)).toThrow("E-CUSTODY-INTEGRITY");
});

it("si se borra la identidad de una custodia con material no inventa otra ni pide crear llave", () => {
  const rig = custodyRig(),
    store = rig.open();
  store.keep("SINTETICO");
  store.close();
  const db = new DatabaseSync(rig.file);
  db.exec("delete from custody_meta");
  db.close();
  let calls = 0;
  expect(
    () =>
      new SecretCustody(rig.file, rig.home, {
        forget() {},
        key: () => {
          calls++;
          return new Uint8Array(32);
        },
      }),
  ).toThrow("E-CUSTODY-INTEGRITY");
  expect(calls).toBe(0);
});
