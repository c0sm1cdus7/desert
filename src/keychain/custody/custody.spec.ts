import { afterEach, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecretCustody } from "./secret-custody.ts";
import { MemoryHouseKeys } from "./house-keys.ts";
const homes: string[] = [];
const opened: SecretCustody[] = [];
afterEach(() => {
  opened.splice(0).forEach(store => store.close());
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
const scope = { actor: "ana", tool: "vault", target: "organization:test" };
function rig() {
  const home = mkdtempSync(join(tmpdir(), "custody-synthetic-"));
  homes.push(home);
  const file = join(home, "fixture.sqlite"),
    keys = new MemoryHouseKeys();
  const open = () => {
    const store = new SecretCustody(file, home, keys);
    opened.push(store);
    return store;
  };
  return { file, home, keys, open };
}
it("ingresa por pregunta o adaptador, vincula un par y conserva solo referencias públicas", async () => {
  const r = rig(),
    store = r.open(),
    session = store.begin(scope);
  const adapter = store.adapter(session, ["signing", "backup"]);
  const refs = {
    certificate: session.capture(Buffer.from("CERTIFICADO_SINTETICO\nSIN_VALIDEZ")),
    privateKey: adapter.capture(Buffer.from("MATERIAL_SINTETICO\nNO_ES_LLAVE")),
  };
  expect(await adapter.use(refs, material => (material.privateKey?.length ?? 0) > 0)).toBe(true);
  session.replace("signing", refs, 0);
  session.cancel();
  store.close();
  const reopened = r.open(),
    next = reopened.begin(scope);
  expect(next.current("signing")).toEqual({ revision: 1, refs });
  expect(await reopened.adapter(next, ["signing"]).use(refs, values => (values.certificate?.length ?? 0) > 0)).toBe(
    true,
  );
  expect(JSON.stringify(reopened.facts())).not.toContain("MATERIAL_SINTETICO");
  expect(readFileSync(r.file).includes(Buffer.from("MATERIAL_SINTETICO"))).toBe(false);
  next.release("signing", 1);
  expect(reopened.ids()).toEqual([]);
  expect(reopened.facts().map(fact => fact.kind)).toContain("credential-purged");
});
it("cancelar y reiniciar liberan provisionales y nunca habilitan referencias inventadas o ajenas", async () => {
  const r = rig(),
    store = r.open(),
    session = store.begin(scope);
  const refs = { key: session.capture(Buffer.from("x")) };
  const other = store.begin({ ...scope, actor: "bea" });
  await expect(store.adapter(other, ["signing"]).use(refs, () => true)).rejects.toThrow("E-CUSTODY-DENIED");
  session.cancel();
  expect(store.ids()).toEqual([]);
  const abandoned = store.begin(scope).capture(Buffer.from(""));
  store.close();
  const reopened = r.open(),
    next = reopened.begin(scope);
  expect(reopened.ids()).toEqual([]);
  await expect(reopened.adapter(next, ["signing"]).use({ key: abandoned }, () => true)).rejects.toThrow();
});
it("reemplazo compara revisión, conserva vínculos compartidos y drena un uso iniciado", async () => {
  const r = rig(),
    store = r.open(),
    session = store.begin(scope);
  const old = { key: session.capture(Buffer.from("anterior")) },
    fresh = { key: session.capture(Buffer.from("siguiente")) };
  session.replace("signing", old, 0);
  session.replace("backup", old, 0);
  const adapter = store.adapter(session, ["signing"]);
  let finish = () => {};
  const pending = adapter.use(
    old,
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  session.replace("signing", fresh, 1);
  expect(() => session.replace("signing", old, 1)).toThrow("E-CUSTODY-CONFLICT");
  await expect(adapter.use(old, () => true)).rejects.toThrow("E-CUSTODY-DENIED");
  session.release("backup", 1);
  expect(store.ids()).toContain(old.key);
  finish();
  await pending;
  expect(store.ids()).not.toContain(old.key);
  session.release("signing", 2);
  expect(store.ids()).toEqual([]);
  expect(() => session.replace("signing", fresh, 0)).toThrow("E-CUSTODY-CONFLICT");
});
it("texto que parece referencia se captura de nuevo y errores del adaptador cruzan cerrados", async () => {
  const r = rig(),
    store = r.open(),
    session = store.begin(scope);
  const raw = "secret:00000000-0000-0000-0000-000000000000",
    ref = session.capture(Buffer.from(raw));
  expect(ref).not.toBe(raw);
  await expect(
    store.adapter(session, []).use({ key: ref }, material => {
      throw new Error(Buffer.from(material.key ?? []).toString("utf8"));
    }),
  ).rejects.toMatchObject({ message: "E-CUSTODY-ADAPTER", cause: undefined });
});
