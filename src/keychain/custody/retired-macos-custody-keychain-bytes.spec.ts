import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { decodeKey, encodeKey } from "../../../tests/support/retired-macos/keychain-bytes.ts";
import { keychainTimeout } from "../../../tests/support/retired-macos/keychain-command.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
it("the byte codec matches canonical base64 without creating text inside the provider", () => {
  for (let n = 0; n < 20; n++) {
    const key = randomBytes(32),
      encoded = encodeKey(key);
    expect(encoded).toEqual(Buffer.from(key.toString("base64")));
    expect(decodeKey(Buffer.concat([Buffer.from(" \n"), encoded, Buffer.from("\n")]))).toEqual(key);
  }
});
for (const output of [
  "",
  "%%%%",
  "ab".repeat(32),
  Buffer.alloc(31).toString("base64"),
  Buffer.alloc(33).toString("base64"),
  Buffer.alloc(32).toString("base64").slice(0, -1),
])
  it(`p4: salida malformada ${output.length} se rechaza y se borra`, () => {
    const stdout = Buffer.from(output);
    const provider = new MacOSHouseKeys(() => ({ status: 0, stdout }));
    expect(() => provider.key("house", false)).toThrow("E-CUSTODY-KEY");
    expect(stdout.every(byte => byte === 0)).toBe(true);
  });
it("p4: stdin and stdout are wiped, invalid accounts never reach the command, every request has a limit", () => {
  const { calls, command } = fakeKeychain(),
    outputs: Uint8Array[] = [];
  const provider = new MacOSHouseKeys((...args) => {
    const result = command(...args);
    outputs.push(result.stdout);
    return result;
  });
  for (const account of ["", "A", "a b", "a\nadd-generic-password", "a".repeat(129)]) {
    expect(() => provider.key(account, true)).toThrow("E-CUSTODY-KEY");
    expect(calls).toHaveLength(0);
  }
  const key = provider.key("house-secret-one", true);
  expect(calls.every(call => call.timeout === keychainTimeout)).toBe(true);
  expect(calls.every(call => call.input.every(byte => byte === 0))).toBe(true);
  expect(outputs.every(output => output.every(byte => byte === 0))).toBe(true);
  expect(calls.flatMap(call => call.args).join(" ")).not.toContain(Buffer.from(key).toString("base64"));
  provider.anchor("house", { count: 2, authentication: "a".repeat(64) });
  expect(provider.head("house")).toEqual({ count: 2, authentication: "a".repeat(64) });
  expect(provider.has("house-secret-one")).toBe(true);
  provider.key("other", true);
  provider.forgetHouse("house");
  expect(provider.has("house-secret-one")).toBe(false);
  expect(provider.has("other")).toBe(true);
  expect(provider.head("house")).toBeUndefined();
});
it("a timeout says how to go on and never returns the command's output", () => {
  const stdout = Buffer.from("SYNTHETIC");
  const provider = new MacOSHouseKeys(() => ({ status: null, stdout }));
  expect(() => provider.key("house", false)).toThrow(/unlock it and retry/u);
  expect(stdout.every(byte => byte === 0)).toBe(true);
});
it("an add that lied about success without saving invents neither a key nor an anchor", () => {
  const { command } = fakeKeychain();
  const provider = new MacOSHouseKeys((file, args, input, options) =>
    args[0] === "-i" ? { status: 0, stdout: Buffer.alloc(0) } : command(file, args, input, options),
  );
  expect(() => provider.key("house", true)).toThrow("E-CUSTODY-KEY");
  expect(() => provider.anchor("house", { count: 1, authentication: "a".repeat(64) })).toThrow("E-CUSTODY-KEY");
});
