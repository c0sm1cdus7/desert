import { afterEach, expect, it } from "vitest";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { SecretCustody } from "./custody/secret-custody.ts";
import { CustodyDatabase } from "./custody/custody-database.ts";
import { MemoryHouseKeys, type HouseKeyProvider } from "./custody/house-keys.ts";
import { MacOSHouseKeys } from "./custody/macos-house-keys.ts";
const paths: string[] = [];
const stores: SecretCustody[] = [];
const keys = new MemoryHouseKeys();
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
function open(path: string, provider: HouseKeyProvider = keys) {
  const custody = new SecretCustody(join(path, "fixture.sqlite"), path, provider);
  stores.push(custody);
  return custody;
}
it("el disco solo guarda cifrado privado y una copia de carpeta no trae la llave", () => {
  const path = home(),
    custody = open(path),
    session = custody.begin(scope);
  const refs = { key: session.capture("MARCADOR_INVENTADO_MULTILINEA\nSIN_VALOR") };
  session.replace("signing", refs, 0);
  custody.close();
  for (const file of readdirSync(path)) {
    expect(readFileSync(join(path, file)).includes(Buffer.from("MARCADOR_INVENTADO"))).toBe(false);
    expect(statSync(join(path, file)).mode & 0o777).toBe(0o600);
  }
  const copied = home();
  cpSync(join(path, "fixture.sqlite"), join(copied, "fixture.sqlite"));
  expect(() => open(copied, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
  expect(open(copied).ids()).toEqual([refs.key]);
  expect(() => open(path, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
});
it("una llave perdida no se regenera aunque ya se hayan borrado todos los materiales", () => {
  const path = home(),
    store = open(path),
    session = store.begin(scope);
  session.capture("sintetico");
  session.cancel();
  expect(store.ids()).toEqual([]);
  store.close();
  expect(() => open(path, new MemoryHouseKeys())).toThrow("E-CUSTODY-KEY");
});
it("mover o alterar un registro rompe la autenticación aunque la llave sea la misma", () => {
  const path = home(),
    custody = open(path);
  const first = custody.keep("uno"),
    second = custody.keep("dos");
  custody.close();
  const db = new CustodyDatabase(join(path, "fixture.sqlite"));
  const payload = db.rows().find(row => row.ref === first)?.payload;
  expect(typeof payload).toBe("string");
  if (typeof payload !== "string") throw new Error("fixture");
  db.put(second, payload);
  db.close();
  expect(() => open(path)).toThrow("E-CUSTODY-INTEGRITY");
});
it("el proveedor macOS usa solo el comando inyectado, no sobrescribe y cierra errores", () => {
  const saved = new Map<string, string>();
  const calls: string[][] = [];
  const provider = new MacOSHouseKeys((file, args, input) => {
    expect(file).toBe("/usr/bin/security");
    calls.push([...args]);
    const account = args[args.indexOf("-a") + 1] ?? "";
    if (args[0] === "find-generic-password")
      return { status: saved.has(account) ? 0 : 44, stdout: saved.get(account) ?? "" };
    const command = input.trim().split(" ");
    saved.set(command[command.indexOf("-a") + 1] ?? "", command.at(-1) ?? "");
    return { status: 0, stdout: "" };
  });
  expect(() => provider.key("a", false)).toThrow("E-CUSTODY-KEY");
  const first = provider.key("a", true);
  expect(provider.key("a", false)).toEqual(first);
  expect(provider.key("b", true)).not.toEqual(first);
  expect(calls.every(args => !args.includes("-U"))).toBe(true);
  expect(() =>
    new MacOSHouseKeys(() => {
      throw new Error("SINTETICO");
    }).key("a", true),
  ).toThrow("E-CUSTODY-KEY");
  expect(() => new MacOSHouseKeys(() => ({ status: 36, stdout: "SINTETICO" })).key("a", true)).toThrow("E-CUSTODY-KEY");
});
