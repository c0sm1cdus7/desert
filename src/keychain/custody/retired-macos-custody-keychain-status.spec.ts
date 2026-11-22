import { expect, it } from "vitest";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
it("refuses a runner that does not return a buffer before reading its answer", () => {
  const malformed = Buffer.alloc(0);
  Object.setPrototypeOf(malformed, null);
  const provider = new MacOSHouseKeys(() => ({ status: 0, stdout: malformed }));
  expect(() => provider.has("house")).toThrow("E-CUSTODY-KEY");
});
it("a write with an error status is not accepted even if it left a readable item", () => {
  const fake = fakeKeychain();
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    return { ...result, status: args[0] === "-i" ? 1 : result.status };
  });
  expect(() => provider.key("house", true)).toThrow("E-CUSTODY-KEY");
});
it("also wipes the non-empty answers of write, presence query and delete", () => {
  const fake = fakeKeychain(),
    outputs: Uint8Array[] = [];
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    if (!args.includes("-w")) {
      const stdout = Buffer.from("SYNTHETIC_METADATA");
      outputs.push(stdout);
      return { ...result, stdout };
    }
    return result;
  });
  provider.key("house", true).fill(0);
  provider.anchor("house", { count: 0, authentication: "" });
  expect(provider.has("house")).toBe(true);
  provider.forget("house");
  expect(outputs.length).toBeGreaterThanOrEqual(4);
  expect(outputs.every(output => output.every(byte => byte === 0))).toBe(true);
});
it("a readable index with an error status is not accepted as a valid anchor", () => {
  const fake = fakeKeychain();
  const working = new MacOSHouseKeys(fake.command);
  working.anchor("house", { count: 1, authentication: "a".repeat(64) });
  const failing = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    return { ...result, status: 1 };
  });
  expect(() => failing.head("house")).toThrow("E-CUSTODY-KEY");
});
it("delete with a status other than success or absence fails with a closed error", () => {
  const stdout = Buffer.from("SYNTHETIC"),
    provider = new MacOSHouseKeys(() => ({ status: 1, stdout }));
  expect(() => provider.forget("house")).toThrow("E-CUSTODY-KEY");
  expect(stdout.every(byte => byte === 0)).toBe(true);
});
for (const index of [
  null,
  1,
  {},
  { accounts: {} },
  { accounts: [1] },
  { accounts: [], head: null },
  { accounts: [], head: { count: -1, authentication: "" } },
  { accounts: [], head: { count: 1.5, authentication: "" } },
  { accounts: [], head: { count: 0, authentication: 1 } },
])
  it("refuses an invalid structure of the external index with a closed error", () => {
    const stdout = Buffer.from(Buffer.from(JSON.stringify(index)).toString("hex"));
    const provider = new MacOSHouseKeys(() => ({ status: 0, stdout }));
    expect(() => provider.head("house")).toThrow("E-CUSTODY-KEY");
    expect(stdout.every(byte => byte === 0)).toBe(true);
  });
it("a key of valid size with an error status is not lent", () => {
  const stdout = Buffer.from(Buffer.alloc(32, 17).toString("base64"));
  const provider = new MacOSHouseKeys(() => ({ status: 1, stdout }));
  expect(() => provider.key("house", false)).toThrow("E-CUSTODY-KEY");
  expect(stdout.every(byte => byte === 0)).toBe(true);
});
it("create also wipes the initial absence answer before reading again", () => {
  const fake = fakeKeychain(),
    outputs: Uint8Array[] = [];
  const provider = new MacOSHouseKeys((file, args, input, options) => {
    const result = fake.command(file, args, input, options);
    const stdout = result.status === 44 ? Buffer.from("SYNTHETIC_ABSENCE") : result.stdout;
    outputs.push(stdout);
    return { ...result, stdout };
  });
  provider.key("house", true).fill(0);
  expect(outputs.every(output => output.every(byte => byte === 0))).toBe(true);
});
it("resuming the creation of an already registered account does not add it to the index again", () => {
  const fake = fakeKeychain(),
    provider = new MacOSHouseKeys(fake.command);
  provider.key("house", true).fill(0);
  provider.forget("house");
  fake.calls.length = 0;
  provider.key("house", true).fill(0);
  expect(fake.calls.filter(call => call.args[0] === "-i")).toHaveLength(1);
});
it("forgetting a house removes its key from the registry as well as the secret keys", () => {
  const fake = fakeKeychain(),
    provider = new MacOSHouseKeys(fake.command);
  for (const account of ["house", "house-secret-one", "other"]) provider.key(account, true).fill(0);
  provider.anchor("house", { count: 1, authentication: "a".repeat(64) });
  provider.forgetHouse("house");
  expect(provider.has("house")).toBe(false);
  expect(provider.has("house-secret-one")).toBe(false);
  expect(provider.has("other")).toBe(true);
  expect(provider.head("house")).toBeUndefined();
});
