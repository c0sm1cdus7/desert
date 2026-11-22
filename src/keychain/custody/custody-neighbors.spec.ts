import { randomUUID } from "node:crypto";
import { expect, it } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { MemoryKeys } from "../../../tests/support/legacy-keys.ts";
import { importLegacyKeys } from "../../../tests/support/retired-macos/legacy-key-provider.ts";
import type { SecretRef } from "./custody-contract.ts";
it("the manifest does not revive a purged reference nor leave rows with invalid ids", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const ref = session.capture(Buffer.from("invented"));
  session.cancel();
  expect(() => store.importLegacy(ref, Buffer.from("invented"))).toThrow("E-CUSTODY-DENIED");
  expect(() => store.importLegacy("secret:invented", Buffer.from("invented"))).toThrow("E-CUSTODY-LEGACY");
  expect(store.ids()).toEqual([]);
  const next = store.begin(custodyScope);
  expect(next.capture(Buffer.from("other"))).toMatch(/^secret:/u);
});
it("reconnecting after a release keeps the revision and rejects a confirmation older than the deletion", () => {
  const rig = custodyRig(),
    store = rig.open(),
    first = store.begin(custodyScope);
  first.replace("signing", { key: first.capture(Buffer.from("previous")) }, first.revision("signing"));
  first.release("signing", 1);
  store.close();
  const reopened = rig.open(),
    session = reopened.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("renewed")) };
  expect(session.current("signing")).toBeUndefined();
  expect(session.revision("signing")).toBe(2);
  expect(() => session.replace("signing", refs, 0)).toThrow("E-CUSTODY-CONFLICT");
  session.replace("signing", refs, session.revision("signing"));
  expect(session.current("signing")).toEqual({ revision: 3, refs });
});
it("a historical retention keeps bytes but grants no uses, and is released by purpose", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("synthetic")) };
  session.replace("signing", refs, 0);
  store.retain(refs.key, "pending-order");
  store.retain(refs.key, "historical-archive");
  session.release("signing", 1);
  await expect(store.adapter(session, ["signing"]).use(refs, () => true)).rejects.toThrow();
  store.close();
  const reopened = rig.open();
  expect(reopened.ids()).toEqual([refs.key]);
  reopened.releaseRetention(refs.key, "pending-order");
  expect(reopened.ids()).toEqual([refs.key]);
  reopened.releaseRetention(refs.key, "historical-archive");
  expect(reopened.ids()).toEqual([]);
});
it("two replacements of one revision win only once and the rejected one is collected on cancel", async () => {
  const store = custodyRig().open(),
    a = store.begin(custodyScope),
    b = store.begin(custodyScope);
  const first = { key: a.capture(Buffer.from("one")) },
    second = { key: b.capture(Buffer.from("two")) };
  const results = await Promise.allSettled([
    Promise.resolve().then(() => a.replace("signing", first, 0)),
    Promise.resolve().then(() => b.replace("signing", second, 0)),
  ]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  b.cancel();
  expect(store.ids()).toEqual([first.key]);
});
it("another tool, object, identity, session or house neither uses nor binds what is not its own", async () => {
  const store = custodyRig().open(),
    a = store.begin(custodyScope);
  const refs = { key: a.capture(Buffer.from("one")) };
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
it("cancelling during a use cuts off new uses and collects when the reservation ends", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope),
    adapter = store.adapter(session, []);
  const refs = { key: adapter.capture(Buffer.from("synthetic")) };
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
it("the KeyStore manifest imports into shared custody without inferring names and can be resumed", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    provider = new MemoryKeys();
  const ref: SecretRef = `secret:${randomUUID()}`;
  await provider.set("provider-id", "SYNTHETIC_MATERIAL");
  await provider.set("no-manifest", "OTHER_SYNTHETIC");
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
  expect(await provider.get("no-manifest")).toBe("OTHER_SYNTHETIC");
  await importLegacyKeys(store, bytes, manifest);
  store.adopt(custodyScope, "signing", { key: ref });
  expect(
    await store
      .adapter(store.begin(custodyScope), ["signing"])
      .use({ key: ref }, value => Buffer.from(value.key ?? []).toString("utf8") === "SYNTHETIC_MATERIAL"),
  ).toBe(true);
});
