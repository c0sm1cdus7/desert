import { afterEach, expect, it } from "vitest";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RootHouseKeys } from "./root-house-keys.ts";
import { SecretCustody } from "../custody/secret-custody.ts";
const homes: string[] = [],
  resources: { close(): void }[] = [],
  providers: RootHouseKeys[] = [];
afterEach(() => {
  resources.splice(0).forEach(resource => resource.close());
  providers.splice(0).forEach(keys => keys.dispose());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
function home() {
  const value = mkdtempSync(join(tmpdir(), "root-custody-"));
  homes.push(value);
  return value;
}
function open(path: string, fill = 71) {
  const root = Buffer.alloc(32, fill),
    keys = new RootHouseKeys(root, path);
  root.fill(0);
  providers.push(keys);
  const store = new SecretCustody(join(path, "fixture.sqlite"), path, keys);
  resources.push(store);
  return store;
}
it("reabrir con otra raíz falla; retroceder solo el diario se detecta y el disco entero es el límite aceptado", () => {
  const path = home(),
    backup = home();
  const first = open(path),
    session = first.begin({ actor: "ana", tool: "vault", target: "test" });
  const ref = session.capture(Buffer.from("MATERIAL_SINTETICO_UNO"));
  session.replace("one", { key: ref }, 0);
  first.close();
  cpSync(path, backup, { recursive: true });
  expect(() => open(path, 72)).toThrow("E-CUSTODY-INTEGRITY");
  const second = open(path);
  expect(second.ids()).toEqual([ref]);
  const nextSession = second.begin({ actor: "ana", tool: "vault", target: "test" });
  const next = nextSession.capture(Buffer.from("MATERIAL_SINTETICO_DOS"));
  nextSession.replace("two", { key: next }, 0);
  second.close();
  cpSync(join(backup, "fixture.sqlite"), join(path, "fixture.sqlite"));
  expect(() => open(path)).toThrow("E-CUSTODY-ROLLBACK");
  cpSync(join(backup, "custody-keys.json"), join(path, "custody-keys.json"));
  expect(open(path).ids()).toEqual([ref]);
});
