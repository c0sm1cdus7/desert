import { expect, it } from "vitest";
import { environmentRootKey } from "./environment-key.ts";
import { safeKeyFailure } from "../../tests/support/key-errors.ts";
it("lee solo el entorno recibido y devuelve 32 bytes borrables", () => {
  const synthetic = Buffer.alloc(32, 71);
  const bytes = environmentRootKey({ HOUSE_ROOT: synthetic.toString("hex").toUpperCase() }, "HOUSE_ROOT");
  expect(bytes.equals(synthetic)).toBe(true);
  bytes.fill(0);
  synthetic.fill(0);
});
it.each([undefined, "", "a".repeat(63), "a".repeat(65), "g".repeat(64), " a".repeat(32)])(
  "rechaza una variable ausente o mal formada sin incluir su valor (%#)",
  value => {
    let error: unknown;
    try {
      environmentRootKey({ HOUSE_ROOT: value }, "HOUSE_ROOT");
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(Error);
    expect(error instanceof Error && error.message.includes("HOUSE_ROOT")).toBe(true);
    if (value) expect(error instanceof Error && error.message.includes(value)).toBe(false);
  },
);
it("una llave conocida inválida no aparece como texto, bytes ni causa del error", () => {
  const root = Buffer.alloc(32, 71);
  for (const value of [root.toString("hex") + "!", root.toString("base64url"), root.toString("utf8")])
    safeKeyFailure(() => environmentRootKey({ ROOT: value }, "ROOT"), root, "ROOT");
  root.fill(0);
});
