import { afterEach, expect, it, vi } from "vitest";
import { hkdfSync } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RootHouseKeys } from "./root-house-keys.ts";
const homes: string[] = [],
  providers: RootHouseKeys[] = [];
afterEach(() => {
  vi.restoreAllMocks();
  providers.splice(0).forEach(provider => provider.dispose());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
function fixture() {
  const home = mkdtempSync(join(tmpdir(), "root-keys-"));
  homes.push(home);
  const root = Buffer.alloc(32, 71);
  const keys = new RootHouseKeys(root, home);
  providers.push(keys);
  return { root, home, keys, file: join(home, "custody-keys.json") };
}
it("deriva HKDF-SHA256 estable por cuenta, copia raíz y entrega préstamos nuevos", () => {
  const { keys, root } = fixture();
  const expected = Buffer.from(hkdfSync("sha256", root, "desert.house-custody.hkdf.v1", "house", 32));
  root.fill(0);
  const first = keys.key("house", true),
    second = keys.key("house", false);
  expect(Buffer.from(first).equals(expected)).toBe(true);
  expect(first === second).toBe(false);
  first.fill(0);
  expect(Buffer.from(second).equals(expected)).toBe(true);
  expect(Buffer.from(keys.key("other", true)).equals(expected)).toBe(false);
  second.fill(0);
  expected.fill(0);
});
it.each([0, 31, 33, 64])("rechaza raíz de %i bytes sin mostrarla", length => {
  const { home } = fixture();
  expect(() => new RootHouseKeys(Buffer.alloc(length, 71), home)).toThrow("E-CUSTODY-KEY");
});
it("relee cuentas y anclas públicas atómicas con modo 0600 y olvida solo la casa pedida", () => {
  const { root, home, keys, file } = fixture();
  for (const account of ["house", "house-secret-one", "other", "other-secret-one"]) keys.key(account, true).fill(0);
  const head = { count: 1, authentication: "a".repeat(64) };
  keys.anchor("house", head);
  head.count = 9;
  expect(statSync(file).mode & 0o777).toBe(0o600);
  expect(readdirSync(home)).toEqual(["custody-keys.json"]);
  const bytes = readFileSync(file);
  expect(bytes.includes(root)).toBe(false);
  expect(bytes.includes(Buffer.from(root.toString("hex")))).toBe(false);
  const next = new RootHouseKeys(root, home);
  providers.push(next);
  root.fill(0);
  expect(next.has("house-secret-one")).toBe(true);
  expect(next.head("house")?.count).toBe(1);
  const copy = next.head("house");
  if (!copy) throw new Error("fixture");
  Reflect.set(copy, "count", 8);
  expect(next.head("house")?.count).toBe(1);
  next.forget("house-secret-one");
  expect(keys.has("house-secret-one")).toBe(false);
  expect(() => next.key("house-secret-one", false)).toThrow("E-CUSTODY-KEY");
  next.forgetHouse("house", ["other", "../other"]);
  expect(keys.has("house")).toBe(false);
  expect(keys.head("house")).toBeUndefined();
  expect(keys.has("other-secret-one")).toBe(true);
  next.forgetHouse("house");
});
it("no transforma un índice corrupto en cuentas nuevas ni revela su contenido", () => {
  const { root, keys, file } = fixture();
  writeFileSync(file, root);
  expect(() => keys.key("house", true)).toThrow("E-CUSTODY-KEY");
  expect(readFileSync(file).equals(root)).toBe(true);
  root.fill(0);
});
it("borra su copia privada al disponer y no vuelve a derivar ni modificar cuentas", () => {
  const copy = vi.spyOn(Buffer, "from");
  const { keys, root } = fixture();
  const owned = copy.mock.results.flatMap(result =>
    result.type === "return" && Buffer.isBuffer(result.value) && result.value.equals(root) ? [result.value] : [],
  );
  expect(owned.length).toBeGreaterThan(0);
  keys.dispose();
  keys.dispose();
  expect(owned.every(bytes => bytes.every(byte => byte === 0))).toBe(true);
  expect(() => keys.key("house", true)).toThrow("E-CUSTODY-KEY");
  expect(() => keys.forgetHouse("house")).toThrow("E-CUSTODY-KEY");
  root.fill(0);
});
