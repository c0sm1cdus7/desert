import { expect, it, vi } from "vitest";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { CustodyDatabase } from "./custody-database.ts";
for (const action of ["cancel", "replace", "releaseRetention", "discardLegacy"])
  it(`the physical error also arrives through ${action}, without a purge receipt`, () => {
    const rig = custodyRig(),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = {
      key:
        action === "discardLegacy" ? store.keep(Buffer.from("SYNTHETIC")) : session.capture(Buffer.from("SYNTHETIC")),
    };
    if (action === "replace" || action === "releaseRetention") session.replace("signing", refs, 0);
    if (action === "releaseRetention") {
      store.retain(refs.key, "history");
      session.release("signing", 1);
    }
    const next = action === "replace" ? { key: session.capture(Buffer.from("NEW")) } : refs;
    const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
      throw new Error("disk");
    });
    const work = () => {
      if (action === "cancel") session.cancel();
      if (action === "replace") session.replace("signing", next, 1);
      if (action === "releaseRetention") store.releaseRetention(refs.key, "history");
      if (action === "discardLegacy") store.discardLegacy(refs.key);
    };
    expect(work).toThrow(expect.objectContaining({ code: "E-CUSTODY-CLEANUP" }));
    expect(store.facts().filter(f => f.kind === "credential-cleanup-pending")).toHaveLength(1);
    expect(store.facts().filter(f => f.kind === "credential-purged")).toHaveLength(0);
    fail.mockRestore();
    store.collect();
    expect(store.ids()).toEqual(action === "replace" ? [next.key] : []);
  });
it("the reserved use keeps its result and reopening retries the cleanup", async () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("SYNTHETIC")) };
  session.replace("signing", refs, 0);
  let finish = () => {};
  const work = store.adapter(session, ["signing"]).use(
    refs,
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  session.release("signing", 1);
  const fail = vi.spyOn(CustodyDatabase.prototype, "remove").mockImplementation(() => {
    throw new Error("disk");
  });
  finish();
  await expect(work).resolves.toBeUndefined();
  expect(store.facts().some(f => f.kind === "credential-purged")).toBe(false);
  store.close();
  fail.mockRestore();
  const recovered = rig.open();
  expect(recovered.ids()).toEqual([]);
  expect(recovered.facts().some(f => f.kind === "credential-purged")).toBe(true);
});
