import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { expect, it } from "vitest";
import { inspect } from "node:util";
import { MacOSHouseKeys } from "../macos/macos-house-keys.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
it("crear usa entrada estándar separada: ningún argumento contiene la llave (a6)", () => {
  const { saved, calls, command } = fakeKeychain();
  const provider = new MacOSHouseKeys(command);
  const first = provider.key("house-a", true),
    second = provider.key("house-b", true);
  for (const key of [first, second])
    expect(calls.flatMap(call => call.args).some(arg => arg.includes(Buffer.from(key).toString("base64")))).toBe(false);
  expect(provider.key("house-a", false)).toEqual(first);
  expect(first).not.toEqual(second);
  expect(calls.filter(call => call.args.includes("desert.house-custody.v3")).flatMap(call => call.args)).not.toContain(
    "-U",
  );
  expect(saved.has("desert.house-custody.v3/house-a")).toBe(true);
  provider.forget("house-a");
  expect(() => provider.key("house-a", false)).toThrow("E-CUSTODY-KEY");
  expect(provider.key("house-b", false)).toEqual(second);
});
it("fallas del comando nunca llevan su línea, entrada, salida ni causa (a6)", () => {
  const marker = "ERROR_SINTETICO_DEL_COMANDO";
  for (const throwing of [true, false]) {
    const provider = new MacOSHouseKeys((_file, args, input) => {
      if (args[0] === "find-generic-password") return { status: 44, stdout: Buffer.alloc(0) };
      if (throwing) throw new Error(`${marker} ${args.join(" ")} ${Buffer.from(input).toString()}`);
      return { status: 1, stdout: Buffer.from(marker) };
    });
    try {
      provider.key("house-a", true);
      expect.fail("debía fallar");
    } catch (error) {
      expect(error).toMatchObject({ code: "E-CUSTODY-KEY", cause: undefined });
      expect(inspect(error) + JSON.stringify(error)).not.toContain(marker);
      expect(inspect(error)).not.toContain("add-generic-password");
    }
  }
});
it("el proveedor puede olvidar una casa sin afectar a otra (a2)", () => {
  const keys = new MemoryHouseKeys(),
    first = keys.key("a", true),
    second = keys.key("b", true);
  keys.forget("a");
  keys.forget("a");
  expect(() => keys.key("a", false)).toThrow("E-CUSTODY-KEY");
  expect(keys.key("b", false)).toEqual(second);
  expect(keys.key("a", true)).not.toEqual(first);
});
