import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { CustodyDatabase } from "./custody-database.ts";

it("p3: opening decrypts no material", () => {
  const rig = custodyRig(),
    store = rig.open();
  for (let i = 0; i < 3; i++) store.keep(Buffer.from(`invented-${i}`));
  store.close();
  const decrypt = vi.spyOn(CustodyCipher.prototype, "open");
  rig.open();
  expect(decrypt).not.toHaveBeenCalled();
});
it("p3/M18: only bytes lent during a use; they are erased even after a rejection", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const input = Buffer.from("invented"),
    refs = { key: session.capture(input) };
  session.replace("signing", refs, 0);
  let borrowed: Uint8Array | undefined;
  await expect(
    store.adapter(session, ["signing"]).use(refs, material => {
      expect(material.key).toBeInstanceOf(Uint8Array);
      borrowed = material.key;
      throw new Error("failed");
    }),
  ).rejects.toThrow("E-CUSTODY-ADAPTER");
  expect(borrowed?.every(byte => byte === 0)).toBe(true);
  expect(input.every(byte => byte === 0)).toBe(true);
});
it("p2: erasing something else neither masks the acknowledgement nor prevents reopening", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("signature")) };
  session.replace("signing", refs, 0);
  const other = store.begin({ ...custodyScope, tool: "other" });
  other.replace("old", { key: other.capture(Buffer.from("other")) }, 0);
  vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disk");
  });
  expect(() => other.release("old", 1)).toThrow("E-CUSTODY-CLEANUP");
  await expect(store.adapter(session, ["signing"]).use(refs, () => "ACKNOWLEDGEMENT")).resolves.toBe("ACKNOWLEDGEMENT");
  store.close();
  expect(() => rig.open()).not.toThrow();
});
it("p1: trimming the last revocation is detected before recovering material", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("signature")) };
  session.replace("signing", refs, 0);
  store.retain(refs.key, "history");
  session.release("signing", 1);
  store.close();
  const db = new DatabaseSync(rig.file);
  db.exec("drop trigger custody_no_delete; delete from custody_facts where seq=(select max(seq) from custody_facts)");
  db.close();
  expect(() => rig.open()).toThrow(/renglones|copia vieja/u);
});
it("p11: opening makes a linear number of material reads", () => {
  const rig = custodyRig(),
    store = rig.open();
  for (let i = 0; i < 30; i++) store.keep(Buffer.from(`invented-${i}`));
  store.close();
  const reads = vi.spyOn(CustodyDatabase.prototype, "rows");
  rig.open();
  const read = reads.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length;
  expect(read).toBeLessThanOrEqual(30 * 8);
});
