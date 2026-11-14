import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { importLegacyKeys } from "./custody/legacy-key-provider.ts";
import { MemoryKeys } from "../../../tests/support/legacy-keys.ts";
import { randomUUID } from "node:crypto";
import type { SecretRef } from "./custody/custody-contract.ts";
it("el manifiesto no resucita una referencia purgada ni deja filas con ids inválidos", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const ref = session.capture(Buffer.from("inventado"));
  session.cancel();
  expect(() => store.importLegacy(ref, Buffer.from("inventado"))).toThrow("E-CUSTODY-DENIED");
  expect(() => store.importLegacy("secret:inventada", Buffer.from("inventado"))).toThrow("E-CUSTODY-LEGACY");
  expect(store.ids()).toEqual([]);
  const next = store.begin(custodyScope);
  expect(next.capture(Buffer.from("otro"))).toMatch(/^secret:/u);
});
it("reconectar tras liberar conserva revisión y rechaza una confirmación anterior al borrado", () => {
  const rig = custodyRig(),
    store = rig.open(),
    first = store.begin(custodyScope);
  first.replace("signing", { key: first.capture(Buffer.from("anterior")) }, first.revision("signing"));
  first.release("signing", 1);
  store.close();
  const reopened = rig.open(),
    session = reopened.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("renovado")) };
  expect(session.current("signing")).toBeUndefined();
  expect(session.revision("signing")).toBe(2);
  expect(() => session.replace("signing", refs, 0)).toThrow("E-CUSTODY-CONFLICT");
  session.replace("signing", refs, session.revision("signing"));
  expect(session.current("signing")).toEqual({ revision: 3, refs });
});
it("una retención histórica conserva bytes pero no concede usos, y se libera por propósito", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("sintetico")) };
  session.replace("signing", refs, 0);
  store.retain(refs.key, "pedido-pendiente");
  store.retain(refs.key, "archivo-historico");
  session.release("signing", 1);
  await expect(store.adapter(session, ["signing"]).use(refs, () => true)).rejects.toThrow();
  store.close();
  const reopened = rig.open();
  expect(reopened.ids()).toEqual([refs.key]);
  reopened.releaseRetention(refs.key, "pedido-pendiente");
  expect(reopened.ids()).toEqual([refs.key]);
  reopened.releaseRetention(refs.key, "archivo-historico");
  expect(reopened.ids()).toEqual([]);
});
it("dos reemplazos de una revisión ganan una sola vez y el rechazado se recoge al cancelar", async () => {
  const store = custodyRig().open(),
    a = store.begin(custodyScope),
    b = store.begin(custodyScope);
  const first = { key: a.capture(Buffer.from("uno")) },
    second = { key: b.capture(Buffer.from("dos")) };
  const results = await Promise.allSettled([
    Promise.resolve().then(() => a.replace("signing", first, 0)),
    Promise.resolve().then(() => b.replace("signing", second, 0)),
  ]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  b.cancel();
  expect(store.ids()).toEqual([first.key]);
});
it("otra herramienta, objeto, identidad, sesión o casa no usa ni vincula lo ajeno", async () => {
  const store = custodyRig().open(),
    a = store.begin(custodyScope);
  const refs = { key: a.capture(Buffer.from("uno")) };
  const otherSession = store.begin(custodyScope);
  expect(() => otherSession.replace("signing", refs, 0)).toThrow();
  a.replace("signing", refs, 0);
  for (const changed of [{ tool: "other" }, { target: "other" }, { actor: "other" }]) {
    const b = store.begin({ ...custodyScope, ...changed });
    expect(() => b.replace("signing", refs, 0)).toThrow();
    await expect(store.adapter(b, ["signing"]).use(refs, () => true)).rejects.toThrow();
  }
  const another = custodyRig().open(),
    b = another.begin(custodyScope);
  await expect(another.adapter(b, ["signing"]).use(refs, () => true)).rejects.toThrow();
});
it("cancelar durante un uso corta usos nuevos y recoge cuando termina la reserva", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope),
    adapter = store.adapter(session, []);
  const refs = { key: adapter.capture(Buffer.from("sintetico")) };
  let finish = () => {};
  const work = adapter.use(
    refs,
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  session.cancel();
  expect(store.ids()).toHaveLength(1);
  await expect(adapter.use(refs, () => true)).rejects.toThrow();
  finish();
  await work;
  expect(store.ids()).toEqual([]);
});
it("el manifiesto de KeyStore importa a la custodia común sin inferir nombres y se puede retomar", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    provider = new MemoryKeys();
  const ref: SecretRef = `secret:${randomUUID()}`;
  await provider.set("provider-id", "MATERIAL_SINTETICO");
  await provider.set("sin-manifiesto", "OTRO_SINTETICO");
  const manifest = [{ provider: "provider-id", ref }];
  const bytes = {
    get: async (id: string) => {
      const value = await provider.get(id);
      return value === undefined ? undefined : Buffer.from(value);
    },
    remove: (id: string) => provider.remove(id),
  };
  await importLegacyKeys(store, bytes, manifest);
  expect(await provider.get("provider-id")).toBeUndefined();
  expect(await provider.get("sin-manifiesto")).toBe("OTRO_SINTETICO");
  await importLegacyKeys(store, bytes, manifest);
  store.adopt(custodyScope, "signing", { key: ref });
  expect(
    await store
      .adapter(store.begin(custodyScope), ["signing"])
      .use({ key: ref }, value => Buffer.from(value.key ?? []).toString("utf8") === "MATERIAL_SINTETICO"),
  ).toBe(true);
});
