import { stubKeys } from "../../../tests/support/custody-provider.ts";
import { expect, it, vi } from "vitest";
import { inspect } from "node:util";
import { createCipheriv } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody-cipher.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { SecretCustody } from "./secret-custody.ts";
import { SecretVault } from "../secret-vault.ts";
import { Redactor } from "../redact.ts";
import type { Shop } from "../../../tests/support/shop.ts";
class InspectableRedactor extends Redactor<Shop> {
  dictionary() {
    return this.active.getStore()?.refs;
  }
}
const material = "SYNTHETIC_ADVERSARY_MARKER";
for (const length of [0, 1, 3, 4, 8, 12, 15, 17])
  it(`rejects a ${length}-byte tag before opening (a9)`, () => {
    const cipher = new CustodyCipher("house", stubKeys({ forget() {}, key: () => new Uint8Array(32).fill(17) }));
    const envelope = cipher.seal("ref", Buffer.from(material), true).split(".");
    envelope[2] = Buffer.from(envelope[2] ?? "", "base64")
      .subarray(0, length)
      .toString("base64");
    if (length === 17) envelope[2] = Buffer.alloc(17).toString("base64");
    expect(() => cipher.open("ref", envelope.join("."))).toThrow("E-CUSTODY-INTEGRITY");
    cipher.close();
  });
for (const length of [8, 16])
  it(`rejects a ${length}-byte nonce even with a valid tag (a9)`, () => {
    const key = Buffer.alloc(32, 17),
      nonce = Buffer.alloc(length, 2);
    const native = createCipheriv("aes-256-gcm", key, nonce);
    native.setAAD(Buffer.from(JSON.stringify([1, "house", "ref"])));
    const bytes = Buffer.concat([native.update(material), native.final()]);
    const envelope = [
      "1",
      nonce.toString("base64"),
      native.getAuthTag().toString("base64"),
      bytes.toString("base64"),
    ].join(".");
    const cipher = new CustodyCipher("house", stubKeys({ forget() {}, key: () => Uint8Array.from(key) }));
    expect(() => cipher.open("ref", envelope)).toThrow("E-CUSTODY-INTEGRITY");
    cipher.close();
  });
it("two writes and a reopening never repeat a nonce, even with the same material (a9)", () => {
  const rig = custodyRig(),
    store = rig.open();
  store.keep(Buffer.from(material));
  store.keep(Buffer.from(material));
  store.close();
  const again = rig.open();
  again.keep(Buffer.from(material));
  again.close();
  const db = new CustodyDatabase(rig.file);
  const nonces = db.rows().map(row => row.payload?.split(".")[1]);
  db.close();
  expect(nonces).toHaveLength(3);
  expect(new Set(nonces).size).toBe(3);
});
it("the provider's copy is zeroed after loading it, even when it is invalid (a3)", () => {
  for (const length of [32, 16]) {
    const copies: Uint8Array[] = [];
    const cipher = new CustodyCipher(
      "house",
      stubKeys({
        forget() {},
        key: () => {
          const copy = new Uint8Array(length).fill(17);
          copies.push(copy);
          return copy;
        },
      }),
    );
    if (length === 32)
      expect(Buffer.from(cipher.open("ref", cipher.seal("ref", Buffer.from(material), true))).toString()).toBe(
        material,
      );
    else expect(() => cipher.seal("ref", Buffer.from(material), true)).toThrow("E-CUSTODY-KEY");
    expect(copies.length).toBeGreaterThan(0);
    expect(copies.every(copy => copy.every(byte => byte === 0))).toBe(true);
    cipher.close();
  }
});
it("custody, vault and the active dictionary hand neither material nor key to JSON or inspect (a1/a3)", () => {
  const rig = custodyRig();
  const key = new Uint8Array(32).fill(117);
  const store = new SecretCustody(rig.file, rig.home, stubKeys({ forget() {}, key: () => Uint8Array.from(key) }));
  store.keep(Buffer.from(material));
  const hidden = (object: unknown) => {
    const output = JSON.stringify(object) + inspect(object, { depth: null, showHidden: true, customInspect: false });
    expect(output).not.toContain(material);
    expect(output).not.toContain('"0":117');
    expect(output).not.toContain("117, 117");
    expect(output).not.toContain("75 75 75");
  };
  const cipher = new CustodyCipher("house", stubKeys({ forget() {}, key: () => Uint8Array.from(key) }));
  cipher.seal("ref", Buffer.from(material), true);
  hidden(cipher);
  cipher.close();
  hidden(store);
  store.close();
  const vault = new SecretVault<Shop>(
    rig.file,
    Type.Object({}),
    stubKeys({ forget() {}, key: () => Uint8Array.from(key) }),
  );
  const schema = Type.Object({ key: Type.String({ secret: true }) });
  try {
    vault.scope(schema, { key: material }, () => hidden(vault));
    const dictionary = new InspectableRedactor(Type.Object({}), () => "secret:fixture");
    dictionary.scope(schema, { key: material }, () => {
      hidden(dictionary);
      hidden(dictionary.dictionary());
    });
  } finally {
    vault.close();
  }
});
it("a failed deletion reports a typed error and leaves it pending without authorizing again (a8)", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from(material)) };
  session.replace("signing", refs, 0);
  vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error(material);
  });
  expect(() => session.release("signing", 1)).toThrow(expect.objectContaining({ code: "E-CUSTODY-CLEANUP" }));
  expect(session.current("signing")).toBeUndefined();
  expect(store.facts().filter(fact => fact.kind === "credential-cleanup-pending")).toHaveLength(1);
  expect(store.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(0);
  await expect(store.adapter(session, ["signing"]).use(refs, () => true)).rejects.toThrow("E-CUSTODY-DENIED");
});
