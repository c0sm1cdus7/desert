import { keyProviders } from "../../../tests/support/key-providers.ts";
import { describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./secret-custody.ts";
import { CustodyDatabase } from "./custody-database.ts";
describe.each(keyProviders)("$name", provider => {
  for (const after of [false, true])
    it(`a cut ${after ? "after" : "before"} anchoring recovers an addition`, () => {
      const rig = custodyRig(provider.open),
        store = rig.open(),
        session = store.begin(custodyScope);
      const refs = { key: session.capture(Buffer.from("invented")) };
      const anchor = rig.keys.anchor.bind(rig.keys);
      const fail = vi.spyOn(rig.keys, "anchor").mockImplementation((house, head) => {
        if (after) anchor(house, head);
        throw new Error("cut");
      });
      expect(() => session.replace("signing", refs, 0)).not.toThrow();
      expect(store.anchorPending()).toBe(true);
      store.close();
      fail.mockRestore();
      const again = rig.open();
      expect(again.begin(custodyScope).current("signing")?.refs).toEqual(refs);
    });
  it("two additions ahead of the anchor are not accepted as a simple cut", () => {
    const rig = custodyRig(provider.open),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    const head = vi.spyOn(rig.keys, "head");
    session.replace("one", refs, 0);
    session.replace("two", refs, 0);
    const house = head.mock.calls[0]?.[0];
    if (!house) throw new Error("fixture");
    rig.keys.anchor(house, { count: 0, authentication: "" });
    expect(() => store.facts()).toThrow("E-CUSTODY-ROLLBACK");
    store.close();
    expect(() => rig.open()).toThrow("E-CUSTODY-ROLLBACK");
  });
  for (const shape of ["empty", "empty-plus-marker", "prefix", "missing", "different"])
    it(`the anchor detects ${shape}; it does not modify the rejected record`, () => {
      const rig = custodyRig(provider.open),
        store = rig.open(),
        session = store.begin(custodyScope);
      const refs = { key: session.capture(Buffer.from("invented")) };
      session.replace("one", refs, 0);
      session.replace("two", refs, 0);
      store.close();
      const db = new DatabaseSync(rig.file);
      db.exec("drop trigger custody_no_delete");
      if (shape === "empty" || shape === "empty-plus-marker") db.exec("delete from custody_facts");
      if (shape === "empty-plus-marker") db.exec("delete from custody_meta where name='key-check'");
      if (shape === "prefix") db.exec("delete from custody_facts where seq=2");
      const house = String(db.prepare("select value from custody_meta where name='house-id'").get()?.value);
      db.close();
      if (shape === "missing") vi.spyOn(rig.keys, "head").mockReturnValue(undefined);
      if (shape === "different") rig.keys.anchor(house, { count: 2, authentication: "a".repeat(64) });
      expect(() => rig.open()).toThrow(
        shape === "missing" ? "E-CUSTODY-KEY" : /E-CUSTODY-ROLLBACK.*anchor expects.*bindings/u,
      );
    });
  it("accepting a restore verifies everything before moving the anchor", () => {
    const rig = custodyRig(provider.open),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    session.replace("signing", refs, 0);
    const head = custodyHead(store.facts());
    store.close();
    const db = new CustodyDatabase(rig.file),
      house = db.identity();
    db.remove(refs.key);
    db.close();
    const before = rig.keys.head(house);
    expect(() => SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, head)).toThrow("E-CUSTODY-MISSING");
    expect(rig.keys.head(house)).toEqual(before);
  });
  it("a batch of several bindings is one recoverable addition and admits no cut prefix", () => {
    const rig = custodyRig(provider.open),
      store = rig.open(),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from("invented")) };
    const anchor = vi.spyOn(rig.keys, "anchor").mockImplementation(() => {
      throw new Error("cut");
    });
    expect(() =>
      store.deferCleanup(() => {
        store.confirm(session, "one", 0, refs);
        store.confirm(session, "two", 0, refs);
      }),
    ).not.toThrow();
    expect(store.anchorPending()).toBe(true);
    store.close();
    anchor.mockRestore();
    const recovered = rig.open();
    expect(recovered.facts()).toHaveLength(2);
    expect(recovered.begin(custodyScope).current("two")?.refs).toEqual(refs);
    recovered.close();
    const db = new DatabaseSync(rig.file);
    db.exec("drop trigger custody_no_delete; delete from custody_facts where seq=2");
    db.close();
    expect(() => rig.open()).toThrow("E-CUSTODY-INTEGRITY");
  });
  it("receipts of the retired version do not hide the missing material of the current binding", () => {
    const rig = custodyRig(provider.open),
      store = rig.open(),
      session = store.begin(custodyScope);
    session.replace("signing", { key: session.capture(Buffer.from("one")) }, 0);
    const refs = { key: session.capture(Buffer.from("two")) };
    session.replace("signing", refs, 1);
    store.close();
    const db = new CustodyDatabase(rig.file);
    db.remove(refs.key);
    db.close();
    expect(() => rig.open()).toThrow("E-CUSTODY-MISSING");
  });
});
