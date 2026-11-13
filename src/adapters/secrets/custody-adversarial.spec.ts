import { expect, it, vi } from "vitest";
import { inspect } from "node:util";
import { createCipheriv } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody/custody-cipher.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
import { SecretCustody } from "./custody/secret-custody.ts";
import { SecretVault } from "./secret-vault.ts";
import { Redactor } from "./redact.ts";
import type { Shop } from "../../../tests/support/shop.ts";
class InspectableRedactor extends Redactor<Shop> {
  dictionary() {
    return this.active.getStore()?.refs;
  }
}
const material = "MARCADOR_ADVERSARIO_SINTETICO";
for (const length of [0, 1, 3, 4, 8, 12, 15, 17])
  it(`rechaza etiqueta de ${length} bytes antes de abrir (a9)`, () => {
    const cipher = new CustodyCipher("house", { forget() {}, key: () => new Uint8Array(32).fill(17) });
    const envelope = cipher.seal("ref", material, true).split(".");
    envelope[2] = Buffer.from(envelope[2] ?? "", "base64")
      .subarray(0, length)
      .toString("base64");
    if (length === 17) envelope[2] = Buffer.alloc(17).toString("base64");
    expect(() => cipher.open("ref", envelope.join("."))).toThrow("E-CUSTODY-INTEGRITY");
    cipher.close();
  });
for (const length of [8, 16])
  it(`rechaza nonce de ${length} bytes aun con etiqueta válida (a9)`, () => {
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
    const cipher = new CustodyCipher("house", { forget() {}, key: () => Uint8Array.from(key) });
    expect(() => cipher.open("ref", envelope)).toThrow("E-CUSTODY-INTEGRITY");
    cipher.close();
  });
it("dos escrituras y una reapertura no repiten nonce, aun con el mismo material (a9)", () => {
  const rig = custodyRig(),
    store = rig.open();
  store.keep(material);
  store.keep(material);
  store.close();
  const again = rig.open();
  again.keep(material);
  again.close();
  const db = new CustodyDatabase(rig.file);
  const nonces = db.rows().map(row => row.payload?.split(".")[1]);
  db.close();
  expect(nonces).toHaveLength(3);
  expect(new Set(nonces).size).toBe(3);
});
it("la copia del proveedor se pone en cero después de cargarla, incluso si es inválida (a3)", () => {
  for (const length of [32, 16]) {
    const copy = new Uint8Array(length).fill(17);
    const cipher = new CustodyCipher("house", { forget() {}, key: () => copy });
    if (length === 32) expect(cipher.open("ref", cipher.seal("ref", material, true))).toBe(material);
    else expect(() => cipher.seal("ref", material, true)).toThrow("E-CUSTODY-KEY");
    expect([...copy].every(byte => byte === 0)).toBe(true);
    cipher.close();
  }
});
it("custodia, bóveda y diccionario activo no entregan material ni llave a JSON o inspect (a1/a3)", () => {
  const rig = custodyRig();
  const key = new Uint8Array(32).fill(117);
  const store = new SecretCustody(rig.file, rig.home, { forget() {}, key: () => Uint8Array.from(key) });
  store.keep(material);
  const hidden = (object: unknown) => {
    const output = JSON.stringify(object) + inspect(object, { depth: null, showHidden: true, customInspect: false });
    expect(output).not.toContain(material);
    expect(output).not.toContain('"0":117');
    expect(output).not.toContain("117, 117");
    expect(output).not.toContain("75 75 75");
  };
  const cipher = new CustodyCipher("house", { forget() {}, key: () => Uint8Array.from(key) });
  cipher.seal("ref", material, true);
  hidden(cipher);
  cipher.close();
  hidden(store);
  store.close();
  const vault = new SecretVault<Shop>(rig.file, Type.Object({}), { forget() {}, key: () => Uint8Array.from(key) });
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
it("el borrado fallido informa error tipado y deja pendiente sin volver a autorizar (a8)", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(material) };
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
