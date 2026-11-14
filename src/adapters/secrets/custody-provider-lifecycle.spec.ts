import { expect, it, vi } from "vitest";
import { custodyRig } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
import { MemoryHouseKeys } from "./custody/house-keys.ts";
import { MacOSHouseKeys } from "./custody/macos-house-keys.ts";
it("el proveedor en memoria borra su original al olvidar y copia ambos lados del ancla", () => {
  const provider = new MemoryHouseKeys(),
    copies = vi.spyOn(Uint8Array, "from");
  provider.key("house", true);
  provider.key("house-secret-one", true);
  provider.key("other", true);
  const original = copies.mock.calls[0]?.[0];
  expect(original instanceof Uint8Array && original.some(byte => byte !== 0)).toBe(true);
  const head = { count: 1, authentication: "a".repeat(64) };
  provider.anchor("house", head);
  head.count = 100;
  const returned = provider.head("house");
  if (!returned) throw new Error("fixture");
  expect(returned.count).toBe(1);
  Reflect.set(returned, "count", 200);
  expect(provider.head("house")?.count).toBe(1);
  provider.forgetHouse("house");
  expect(original instanceof Uint8Array && original.every(byte => byte === 0)).toBe(true);
  expect(provider.head("house")).toBeUndefined();
  expect(provider.has("house")).toBe(false);
  expect(provider.has("house-secret-one")).toBe(false);
  expect(provider.has("other")).toBe(true);
});
it("una base64 no canónica que ya produjo bytes también borra su llave parcial antes de fallar", () => {
  const canonical = Buffer.alloc(32, 17).toString("base64");
  const stdout = Buffer.from(canonical.slice(0, -2) + "F=");
  const allocated = vi.spyOn(Buffer, "alloc");
  expect(() => new MacOSHouseKeys(() => ({ status: 0, stdout })).key("house", false)).toThrow("E-CUSTODY-KEY");
  const sensitive = allocated.mock.results.flatMap(result =>
    result.type === "return" && [32, 44].includes(result.value.length) ? [result.value] : [],
  );
  expect(sensitive.length).toBeGreaterThanOrEqual(2);
  expect(sensitive.every(buffer => buffer.every(byte => byte === 0))).toBe(true);
});

it("una marca con registro vacío no permite abrir sin la llave autenticadora", () => {
  const rig = custodyRig(),
    db = new CustodyDatabase(rig.file),
    house = db.identity();
  db.saveKeyCheck("custody-v2");
  db.close();
  rig.keys.anchor(house, { count: 0, authentication: "" });
  expect(() => rig.open()).toThrow("E-CUSTODY-KEY");
});
