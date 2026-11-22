import { expect, it, vi } from "vitest";
import { createDecipheriv } from "node:crypto";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { SecretCustody } from "./secret-custody.ts";
it("a stolen key opens only its own secret; the record's key opens none", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = [session.capture(Buffer.from("one")), session.capture(Buffer.from("two"))];
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
it("opening and binding ask for no secret keys; a use asks only for its own and erases every copy", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("one")) };
  session.replace("signing", refs, 0);
  store.keep(Buffer.from("two"));
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
    expect(Buffer.from(values.key ?? []).toString()).toBe("one");
    expect(copies.every(copy => copy.every(byte => byte === 0))).toBe(true);
    return 1;
  });
  expect(accounts.filter(account => account.includes("-secret-"))).toEqual([
    expect.stringContaining(refs.key.slice(7)),
  ]);
  expect(copies.every(copy => copy.every(byte => byte === 0))).toBe(true);
});
it("a partial failure preparing a pair erases the first material without calling the adapter", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { a: session.capture(Buffer.from("one")), b: session.capture(Buffer.from("two")) };
  session.replace("signing", refs, 0);
  const decrypt = vi.spyOn(CustodyCipher.prototype, "open"),
    key = rig.keys.key.bind(rig.keys);
  vi.spyOn(rig.keys, "key").mockImplementation((account, create) => {
    if (account.endsWith(refs.b.slice(7))) throw new Error("failed");
    return key(account, create);
  });
  const body = vi.fn();
  await expect(store.adapter(session, ["signing"]).use(refs, body)).rejects.toThrow();
  expect(body).not.toHaveBeenCalled();
  const buffers = decrypt.mock.results.flatMap(result => (result.type === "return" ? [result.value] : []));
  expect(buffers).toHaveLength(1);
  expect(buffers[0]?.every(byte => byte === 0)).toBe(true);
});
it("M18: closing during use erases what was lent immediately and at the end", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
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
it("a denied ingress erases its buffer and a late missing provider says what is missing", () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home),
    session = store.begin(custodyScope);
  const value = Buffer.from("invented");
  expect(() => session.capture(value)).toThrow(/E-CUSTODY-PROVIDER.*secretKeys/u);
  expect(value.every(byte => byte === 0)).toBe(true);
  store.close();
});
it("a cancelled session takes in no more material and erases the rejected input", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope),
    input = Buffer.from("synthetic");
  session.cancel();
  expect(() => session.capture(input)).toThrow("E-CUSTODY-DENIED");
  expect(input.every(byte => byte === 0)).toBe(true);
  expect(store.ids()).toEqual([]);
});
