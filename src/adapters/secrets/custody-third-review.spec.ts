import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody/custody-cipher.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";

it("p3: abrir no descifra ningún material", () => {
  const rig = custodyRig(),
    store = rig.open();
  for (let i = 0; i < 3; i++) store.keep(Buffer.from(`inventado-${i}`));
  store.close();
  const decrypt = vi.spyOn(CustodyCipher.prototype, "open");
  rig.open();
  expect(decrypt).not.toHaveBeenCalled();
});
it("p3/M18: solo bytes prestados durante uso; se borran incluso después de rechazo", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const input = Buffer.from("inventado"),
    refs = { key: session.capture(input) };
  session.replace("signing", refs, 0);
  let borrowed: Uint8Array | undefined;
  await expect(
    store.adapter(session, ["signing"]).use(refs, material => {
      expect(material.key).toBeInstanceOf(Uint8Array);
      borrowed = material.key;
      throw new Error("falló");
    }),
  ).rejects.toThrow("E-CUSTODY-ADAPTER");
  expect(borrowed?.every(byte => byte === 0)).toBe(true);
  expect(input.every(byte => byte === 0)).toBe(true);
});
it("p2: borrar otra cosa no tapa el acuse ni impide reabrir", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("firma")) };
  session.replace("signing", refs, 0);
  const other = store.begin({ ...custodyScope, tool: "other" });
  other.replace("old", { key: other.capture(Buffer.from("otra")) }, 0);
  vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disco");
  });
  expect(() => other.release("old", 1)).toThrow("E-CUSTODY-CLEANUP");
  await expect(store.adapter(session, ["signing"]).use(refs, () => "ACUSE")).resolves.toBe("ACUSE");
  store.close();
  expect(() => rig.open()).not.toThrow();
});
it("p1: recortar la última revocación se detecta antes de recuperar material", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("firma")) };
  session.replace("signing", refs, 0);
  store.retain(refs.key, "history");
  session.release("signing", 1);
  store.close();
  const db = new DatabaseSync(rig.file);
  db.exec("drop trigger custody_no_delete; delete from custody_facts where seq=(select max(seq) from custody_facts)");
  db.close();
  expect(() => rig.open()).toThrow(/renglones|copia vieja/u);
});
it("p11: abrir hace una cantidad lineal de lecturas de materiales", () => {
  const rig = custodyRig(),
    store = rig.open();
  for (let i = 0; i < 30; i++) store.keep(Buffer.from(`inventado-${i}`));
  store.close();
  const reads = vi.spyOn(CustodyDatabase.prototype, "rows");
  rig.open();
  const read = reads.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length;
  expect(read).toBeLessThanOrEqual(30 * 8);
});
