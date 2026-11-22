import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fakeKeychain } from "../../../tests/support/fake-keychain.ts";
import { keyProviders } from "../../../tests/support/key-providers.ts";
import { MacOSHouseKeys } from "../../../tests/support/retired-macos/macos-house-keys.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { MemoryHouseKeys, type HouseKeyProvider } from "./house-keys.ts";
import { SecretCustody } from "./secret-custody.ts";
const paths: string[] = [];
const stores: SecretCustody[] = [];
const scope = { actor: "ana", tool: "vault", target: "test" };
afterEach(() => {
  stores.splice(0).forEach(store => store.close());
  paths.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
});
function home() {
  const path = mkdtempSync(join(tmpdir(), "custody-encryption-"));
  paths.push(path);
  return path;
}
describe.each(keyProviders)("$name", providerCase => {
  let keys: HouseKeyProvider | undefined;
  beforeEach(() => {
    keys = undefined;
  });
  function open(path: string, provider?: HouseKeyProvider) {
    keys ??= providerCase.open(path);
    const custody = new SecretCustody(join(path, "fixture.sqlite"), path, provider ?? keys);
    stores.push(custody);
    return custody;
  }
  it("the disk holds only private ciphertext and a copy of the folder does not bring the key", () => {
    const path = home(),
      custody = open(path),
      session = custody.begin(scope);
    const refs = { key: session.capture(Buffer.from("INVENTED_MULTILINE_MARKER\nNO_VALUE")) };
    session.replace("signing", refs, 0);
    custody.close();
    for (const file of readdirSync(path)) {
      expect(readFileSync(join(path, file)).includes(Buffer.from("INVENTED_MULTILINE_MARKER"))).toBe(false);
      expect(statSync(join(path, file)).mode & 0o777).toBe(0o600);
    }
    const copied = home();
    cpSync(join(path, "fixture.sqlite"), join(copied, "fixture.sqlite"));
    expect(() => open(copied, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
    expect(open(copied).ids()).toEqual([refs.key]);
    expect(() => open(path, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
  });
  it("a lost key is not regenerated even after every material has been erased", () => {
    const path = home(),
      store = open(path),
      session = store.begin(scope);
    session.capture(Buffer.from("synthetic"));
    session.cancel();
    expect(store.ids()).toEqual([]);
    store.close();
    expect(() => open(path, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
  });
  it("moving or altering a record breaks authentication even with the same key", () => {
    const path = home(),
      custody = open(path);
    const first = custody.keep(Buffer.from("one")),
      second = custody.keep(Buffer.from("two"));
    custody.close();
    const db = new CustodyDatabase(join(path, "fixture.sqlite"));
    const payload = db.rows().find(row => row.ref === first)?.payload;
    expect(typeof payload).toBe("string");
    if (typeof payload !== "string") throw new Error("fixture");
    db.put(second, payload);
    db.close();
    expect(() => open(path)).toThrow("E-CUSTODY-INTEGRITY");
  });
});
it("the macOS provider uses only the injected command, never overwrites and closes errors", () => {
  const { calls, command } = fakeKeychain();
  const provider = new MacOSHouseKeys(command);
  expect(() => provider.key("a", false)).toThrow("E-CUSTODY-KEY");
  const first = provider.key("a", true);
  expect(provider.key("a", false)).toEqual(first);
  expect(provider.key("b", true)).not.toEqual(first);
  expect(
    calls.filter(call => call.args.includes("desert.house-custody.v3")).every(call => !call.args.includes("-U")),
  ).toBe(true);
  expect(() =>
    new MacOSHouseKeys(() => {
      throw new Error("SYNTHETIC");
    }).key("a", true),
  ).toThrow("E-CUSTODY-KEY");
  expect(() => new MacOSHouseKeys(() => ({ status: 36, stdout: Buffer.from("SYNTHETIC") })).key("a", true)).toThrow(
    "E-CUSTODY-KEY",
  );
});
