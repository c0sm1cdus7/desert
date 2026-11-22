import { afterEach, expect, it, vi } from "vitest";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RootHouseKeys } from "./root-house-keys.ts";
import { readKeyMetadata } from "./key-metadata.ts";
import { safeKeyFailure } from "../../../tests/support/key-errors.ts";
vi.mock("node:fs", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return {
    ...actual,
    writeFileSync: vi.fn(actual.writeFileSync),
    fsyncSync: vi.fn(actual.fsyncSync),
    renameSync: vi.fn(actual.renameSync),
  };
});
const homes: string[] = [],
  providers: RootHouseKeys[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  providers.splice(0).forEach(keys => keys.dispose());
  homes.splice(0).forEach(home => fs.rmSync(home, { recursive: true, force: true }));
});
function fixture() {
  const home = fs.mkdtempSync(join(tmpdir(), "cloud-metadata-")),
    root = Buffer.alloc(32, 71);
  homes.push(home);
  const keys = new RootHouseKeys(root, home);
  providers.push(keys);
  return { home, root, keys, file: join(home, "custody-keys.json") };
}
it.each(["writeFileSync", "fsyncSync", "renameSync"] as const)(
  "a cut at %s keeps the previous document, cleans the temporary one and allows a retry",
  operation => {
    const { keys, home, root, file } = fixture();
    keys.key("house", true).fill(0);
    const before = fs.readFileSync(file);
    const fault = vi.spyOn(fs, operation).mockImplementationOnce(() => {
      throw new Error(root.toString("hex"));
    });
    safeKeyFailure(() => keys.key("house-secret-new", true), root);
    fault.mockRestore();
    expect(fs.readFileSync(file).equals(before)).toBe(true);
    expect(fs.readdirSync(home)).toEqual(["custody-keys.json"]);
    expect(keys.has("house-secret-new")).toBe(false);
    keys.key("house-secret-new", true).fill(0);
    expect(keys.has("house-secret-new")).toBe(true);
    expect(fs.statSync(file).mode & 0o777).toBe(0o600);
    root.fill(0);
  },
);
it.each([
  null,
  { version: 2, accounts: [], heads: [] },
  { version: 1, accounts: ["house", "house"], heads: [] },
  { version: 1, accounts: ["../house"], heads: [] },
  { version: 1, accounts: [], heads: [["house", { count: -1, authentication: "" }]] },
  { version: 1, accounts: [], heads: [["house", { count: 0, authentication: "a".repeat(64) }]] },
  { version: 1, accounts: [], heads: [["house", { count: 1, authentication: "" }]] },
  { version: 1, accounts: [], heads: [], extra: true },
])("rejects damaged documents without replacing them (%#)", value => {
  const { home, file, keys, root } = fixture();
  fs.writeFileSync(file, JSON.stringify(value));
  const before = fs.readFileSync(file);
  expect(() => readKeyMetadata(home)).toThrow("E-CUSTODY-KEY");
  safeKeyFailure(() => keys.key("house", true), root);
  expect(fs.readFileSync(file).equals(before)).toBe(true);
  root.fill(0);
});
it("no provider error exposes the root, the malformed account, the document or external causes", () => {
  const { keys, file, root } = fixture();
  const text = root.toString("utf8");
  for (const work of [
    () => keys.key(text, true),
    () => keys.has(text),
    () => keys.forget(text),
    () => keys.forgetHouse(text),
    () => keys.head(text),
    () => keys.anchor("house", { count: 0, authentication: text }),
    () => new RootHouseKeys(root.subarray(0, 31), text),
  ])
    safeKeyFailure(work, root);
  fs.writeFileSync(file, text);
  for (const work of [
    () => keys.key("house", true),
    () => keys.has("house"),
    () => keys.forget("house"),
    () => keys.forgetHouse("house"),
    () => keys.head("house"),
    () => keys.anchor("house", { count: 0, authentication: "" }),
  ])
    safeKeyFailure(work, root);
  root.fill(0);
});
