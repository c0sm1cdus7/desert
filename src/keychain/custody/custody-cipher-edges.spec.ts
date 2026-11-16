import { expect, it, vi } from "vitest";
import { custodyRig } from "../../../tests/support/custody-rig.ts";
import { CustodyCipher } from "./custody-cipher.ts";
vi.mock("node:crypto", async original => ({ ...(await original<typeof import("node:crypto")>()) }));
it("la custodia encierra errores del proveedor y borra incluso una llave de tamaño inválido", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys),
    invalid = Buffer.alloc(31, 17);
  const providerKey = vi.spyOn(rig.keys, "key").mockImplementation(() => {
    throw new Error("detalle privado del proveedor");
  });
  expect(() => cipher.prepare(false)).toThrow(/^E-CUSTODY-KEY/u);
  try {
    cipher.prepare(false);
  } catch (error) {
    expect(String(error)).not.toContain("detalle privado");
    expect(error instanceof Error && error.cause).toBeUndefined();
  }
  providerKey.mockReturnValue(invalid);
  expect(() => cipher.prepare(false)).toThrow("E-CUSTODY-KEY");
  expect(invalid.every(byte => byte === 0)).toBe(true);
});
it("cerrar durante una primitiva sincrónica borra la llave activa y no retiene llaves ya devueltas", async () => {
  const crypto = await import("node:crypto"),
    native = crypto.createHmac;
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys);
  cipher.prepare(true);
  const key = rig.keys.key.bind(rig.keys);
  const returned: Uint8Array[] = [];
  vi.spyOn(rig.keys, "key").mockImplementation((account, create) => {
    const value = key(account, create);
    returned.push(value);
    return value;
  });
  cipher.sign("first");
  const old = returned[0];
  if (!old) throw new Error("fixture");
  const oldFill = vi.spyOn(old, "fill");
  vi.spyOn(crypto, "createHmac").mockImplementation((algorithm, material, options) => {
    const active = returned.at(-1);
    if (!active) throw new Error("fixture");
    const activeFill = vi.spyOn(active, "fill");
    cipher.close();
    expect(active.every(byte => byte === 0)).toBe(true);
    cipher.close();
    expect(activeFill).toHaveBeenCalledTimes(1);
    return native(algorithm, material, options);
  });
  cipher.sign("second");
  expect(oldFill).not.toHaveBeenCalled();
  const current = returned[1];
  if (!current) throw new Error("fixture");
  const currentFill = vi.spyOn(current, "fill").mockClear();
  cipher.close();
  expect(currentFill).not.toHaveBeenCalled();
});
for (const [version, nonceLength, tagLength] of [
  [1, 12, 16],
  [2, 11, 16],
  [2, 12, 15],
] as const)
  it("rechaza la estructura incompatible de un sobre aun con autenticación válida", () => {
    const rig = custodyRig(),
      cipher = new CustodyCipher("house", rig.keys);
    cipher.prepare(true);
    const envelope = [
      String(version),
      Buffer.alloc(nonceLength).toString("base64"),
      Buffer.alloc(tagLength).toString("base64"),
      "",
    ].join(".");
    const signed = `${envelope}.${cipher.sign(JSON.stringify(["ref", envelope]))}`;
    expect(() => cipher.check("ref", signed)).toThrow("E-CUSTODY-INTEGRITY");
  });
it("usar no saltea la autenticación del sobre aunque el cifrado AES siga intacto", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys);
  cipher.prepare(true);
  const envelope = cipher.seal("ref", Buffer.from("sintetico"), true);
  const pieces = envelope.split(".");
  pieces[4] = "0".repeat(64);
  expect(() => cipher.open("ref", pieces.join("."))).toThrow("E-CUSTODY-INTEGRITY");
});
it("un sobre autenticado cuyo GCM no verifica devuelve el error cerrado de integridad", () => {
  const rig = custodyRig(),
    cipher = new CustodyCipher("house", rig.keys);
  cipher.prepare(true);
  const pieces = cipher.seal("ref", Buffer.from("sintetico"), true).split(".");
  pieces[2] = Buffer.alloc(16).toString("base64");
  const envelope = pieces.slice(0, 4).join(".");
  const signed = `${envelope}.${cipher.sign(JSON.stringify(["ref", envelope]))}`;
  expect(() => cipher.open("ref", signed)).toThrow("E-CUSTODY-INTEGRITY");
});
