import { DatabaseSync } from "node:sqlite";
import { expect, it, vi } from "vitest";
import { custodyRig } from "../../../tests/support/custody-rig.ts";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
import { CustodyCipher } from "./custody-cipher.ts";
it("descifrar borra también los fragmentos nativos que concatena, no solamente el resultado prestado", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys);
  cipher.prepare(true);
  const input = Buffer.from("sintetico"),
    envelope = cipher.seal("ref", input, true);
  expect(input.every(byte => byte === 0)).toBe(true);
  const concat = vi.spyOn(Buffer, "concat");
  const result = cipher.open("ref", envelope);
  expect(Buffer.from(result).toString()).toBe("sintetico");
  expect(concat.mock.calls).toHaveLength(1);
  expect(concat.mock.calls[0]?.[0][1]?.byteLength).toBe(0);
  for (const part of concat.mock.calls[0]?.[0] ?? []) expect(part.every(byte => byte === 0)).toBe(true);
  result.fill(0);
});
it("adoptar una fila borra tanto el BLOB de SQLite como el búfer de comparación", () => {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file),
    marker = "sintetico-de-adopcion-".repeat(7);
  db.exec("create table secrets(id text primary key, value text)");
  db.prepare("insert into secrets values (?,?)").run("secret:00000000-0000-0000-0000-000000000001", marker);
  db.close();
  const copies = vi.spyOn(Uint8Array, "from"),
    opened = vi.spyOn(CustodyCipher.prototype, "open");
  rig.open();
  const sources = copies.mock.calls
    .map(args => args[0])
    .filter(value => value instanceof Uint8Array && value.byteLength === marker.length);
  expect(sources).toHaveLength(1);
  for (const source of sources) if (source instanceof Uint8Array) expect(source.every(byte => byte === 0)).toBe(true);
  expect(opened.mock.results).toHaveLength(1);
  for (const result of opened.mock.results)
    if (result.type === "return") expect(result.value.every(byte => byte === 0)).toBe(true);
});
it("el proveedor borra el aleatorio y la codificación temporal de una llave recién creada", async () => {
  const codec = await import("../../../tests/support/retired-macos/keychain-bytes.ts");
  const encoded = vi.spyOn(codec, "encodeKey"),
    fake = fakeKeychain();
  new MacOSHouseKeys(fake.command).key("house", true);
  const raw = encoded.mock.calls[0]?.[0],
    buffer = encoded.mock.results[0];
  expect(raw?.every(byte => byte === 0)).toBe(true);
  expect(buffer?.type).toBe("return");
  if (buffer?.type === "return") expect(buffer.value.every(byte => byte === 0)).toBe(true);
});
it("leer una llave borra la copia de stdout que valida como base64", () => {
  const stdout = Buffer.from(Buffer.alloc(32, 17).toString("base64"));
  const copies = vi.spyOn(Buffer, "from");
  const key = new MacOSHouseKeys(() => ({ status: 0, stdout })).key("house", false);
  expect(key.every(byte => byte === 17)).toBe(true);
  expect(copies.mock.results).toHaveLength(1);
  for (const result of copies.mock.results)
    if (result.type === "return") expect(result.value.every(byte => byte === 0)).toBe(true);
  key.fill(0);
});
