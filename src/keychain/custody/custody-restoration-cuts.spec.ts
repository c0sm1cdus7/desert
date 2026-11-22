import { expect, it, vi } from "vitest";
import { copyFileSync } from "node:fs";
import { join } from "node:path";
import { custodyHead, custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./secret-custody.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { maintainCustody } from "./custody-maintenance.ts";
function restored() {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const missing = session.capture(Buffer.from("previous")),
    stable = session.capture(Buffer.from("stable"));
  session.replace("signing", { key: missing }, 0);
  session.replace("ticket", { key: stable }, 0);
  const head = custodyHead(store.facts());
  store.close();
  const backup = join(rig.home, "backup.sqlite");
  copyFileSync(rig.file, backup);
  const next = rig.open();
  next.begin(custodyScope).release("signing", 1);
  next.close();
  copyFileSync(backup, rig.file);
  return { ...rig, missing, stable, head };
}
for (const method of ["appendBatch", "remove", "anchor"] as const)
  for (const after of [false, true])
    it(`resumes the acceptance interrupted ${after ? "after" : "before"} ${method}`, async () => {
      const rig = restored();
      let calls = 0;
      const point = () => {
        if (++calls === 1) throw new Error("invented cut");
      };
      const wrap =
        <A extends unknown[], R>(body: (...args: A) => R) =>
        (...args: A): R => {
          if (!after) point();
          const result = body(...args);
          if (after) point();
          return result;
        };
      if (method === "anchor") {
        const anchor = rig.keys.anchor.bind(rig.keys);
        vi.spyOn(rig.keys, "anchor").mockImplementation(wrap(anchor));
      } else if (method === "remove") {
        const spy = vi.spyOn(CustodyDatabase.prototype, "remove");
        spy.mockImplementation(function (this: CustodyDatabase, ref) {
          spy.mockRestore();
          return wrap((ref: Parameters<typeof this.remove>[0]) => this.remove(ref))(ref);
        });
      } else {
        const spy = vi.spyOn(CustodyDatabase.prototype, "appendBatch");
        spy.mockImplementation(function (this: CustodyDatabase, facts) {
          spy.mockRestore();
          return wrap((facts: Parameters<typeof this.appendBatch>[0]) => this.appendBatch(facts))(facts);
        });
      }
      try {
        SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, rig.head);
      } catch {
        /* simulated cut */
      }
      expect(calls).toBeGreaterThan(0);
      vi.restoreAllMocks();
      const review = maintainCustody(rig.file, rig.home, rig.keys, undefined, { operation: "review" });
      if (review.forgotten) throw new Error("expected review");
      SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, review.head);
      const store = rig.open(),
        session = store.begin(custodyScope);
      expect(session.current("signing")).toBeUndefined();
      expect(store.ids()).not.toContain(rig.missing);
      expect(store.facts().filter(fact => fact.kind === "credential-unusable")).toHaveLength(1);
      expect(store.facts().filter(fact => fact.kind === "credential-purged")).toHaveLength(1);
      await expect(store.adapter(session, ["ticket"]).use({ key: rig.stable }, () => "ack")).resolves.toBe("ack");
    });
it("verifies before accepting: tampering with a row neither moves the anchor nor purges material", () => {
  const rig = restored();
  const db = new CustodyDatabase(rig.file);
  db.db.exec(
    "drop trigger custody_no_update; update custody_facts set body=replace(body, 'vault', 'other') where seq=1",
  );
  db.close();
  const anchor = vi.spyOn(rig.keys, "anchor"),
    remove = vi.spyOn(CustodyDatabase.prototype, "remove");
  expect(() => SecretCustody.acceptRestoredCopy(rig.file, rig.home, rig.keys, rig.head)).toThrow("E-CUSTODY-INTEGRITY");
  expect(anchor).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
it("acceptance finishes purging before moving the anchor", () => {
  const rig = restored(),
    anchored: string[][] = [];
  const anchor = rig.keys.anchor.bind(rig.keys);
  vi.spyOn(rig.keys, "anchor").mockImplementation((house, head) => {
    anchored.push([String(head.count)]);
    anchor(house, head);
  });
  const result = maintainCustody(rig.file, rig.home, rig.keys, undefined, { operation: "accept", head: rig.head });
  if (result.forgotten) throw new Error("expected acceptance");
  expect(anchored).toEqual([[String(result.head.count)]]);
  expect(result.cleanupPending).toBe(false);
});
