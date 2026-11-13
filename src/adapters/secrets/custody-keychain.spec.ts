import { expect, it } from "vitest";
import { inspect } from "node:util";
import { MacOSHouseKeys } from "./custody/macos-house-keys.ts";
import { MemoryHouseKeys } from "./custody/house-keys.ts";
it("crear usa entrada estándar separada: ningún argumento contiene la llave (a6)", () => {
  const saved = new Map<string, string>();
  const argumentsSeen: string[][] = [];
  const provider = new MacOSHouseKeys((file, args, input) => {
    expect(file).toBe("/usr/bin/security");
    argumentsSeen.push([...args]);
    const account = args[args.indexOf("-a") + 1] ?? "";
    if (args[0] === "find-generic-password")
      return { status: saved.has(account) ? 0 : 44, stdout: saved.get(account) ?? "" };
    if (args[0] === "delete-generic-password") {
      saved.delete(account);
      return { status: 0, stdout: "" };
    }
    // Accept both command shapes in the fake so the assertion below catches an argv leak directly.
    if (args[0] === "add-generic-password") {
      saved.set(account, args.at(-1) ?? "");
      return { status: 0, stdout: "" };
    }
    expect(args).toEqual(["-i"]);
    const match = /^add-generic-password -s desert.house-custody.v1 -a ([a-z0-9-]+) -w ([A-Za-z0-9+/=]+)\n$/u.exec(
      input,
    );
    expect(match).not.toBeNull();
    if (!match?.[1] || !match[2]) throw new Error("fixture");
    saved.set(match[1], match[2]);
    return { status: 0, stdout: "" };
  });
  const first = provider.key("house-a", true),
    second = provider.key("house-b", true);
  for (const key of [first, second])
    expect(argumentsSeen.flat().some(arg => arg.includes(Buffer.from(key).toString("base64")))).toBe(false);
  expect(provider.key("house-a", false)).toEqual(first);
  expect(first).not.toEqual(second);
  expect(argumentsSeen.flat()).not.toContain("-U");
  expect(saved.has("house-a")).toBe(true);
  provider.forget("house-a");
  expect(() => provider.key("house-a", false)).toThrow("E-CUSTODY-KEY");
  expect(provider.key("house-b", false)).toEqual(second);
});
it("fallas del comando nunca llevan su línea, entrada, salida ni causa (a6)", () => {
  const marker = "ERROR_SINTETICO_DEL_COMANDO";
  for (const throwing of [true, false]) {
    const provider = new MacOSHouseKeys((_file, args, input) => {
      if (args[0] === "find-generic-password") return { status: 44, stdout: "" };
      if (throwing) throw new Error(`${marker} ${args.join(" ")} ${input}`);
      return { status: 1, stdout: marker };
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
