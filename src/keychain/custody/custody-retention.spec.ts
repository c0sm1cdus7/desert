import { expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { copyFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { SecretCustody } from "./secret-custody.ts";
import { CustodyDatabase } from "./custody-database.ts";
import { containing } from "../../../tests/support/custody-files.ts";
it("p9: legacy with rows and no provider fails before creating tables or changing bytes", () => {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  db.exec("create table secrets(id text primary key, value text)");
  db.prepare("insert into secrets values (?,?)").run("secret:00000000-0000-0000-0000-000000000001", "invented");
  db.close();
  const before = readdirSync(rig.home).map(name => [name, readFileSync(join(rig.home, name))]);
  expect(() => new SecretCustody(rig.file, rig.home)).toThrow("E-CUSTODY-PROVIDER");
  expect(readdirSync(rig.home).map(name => [name, readFileSync(join(rig.home, name))])).toEqual(before);
});
it("the per-house format of unjoined commits is rejected and not converted", () => {
  const rig = custodyRig(),
    db = new CustodyDatabase(rig.file);
  db.identity();
  db.saveKeyCheck("1.ancient");
  db.close();
  const before = readFileSync(rig.file);
  expect(() => rig.open()).toThrow(/E-CUSTODY-FORMAT.*no se convierte/u);
  expect(readFileSync(rig.file)).toEqual(before);
});
it("M7c: compacting removes the legacy free pages, not only the table", () => {
  const rig = custodyRig(),
    db = new DatabaseSync(rig.file);
  db.exec("create table secrets(id text primary key, value text)");
  for (let n = 0; n < 8; n++)
    db.prepare("insert into secrets values (?,?)").run(
      `secret:00000000-0000-0000-0000-${String(n).padStart(12, "0")}`,
      `SYNTHETIC${n}`.repeat(16000),
    );
  db.close();
  rig.open().close();
  const after = new DatabaseSync(rig.file);
  expect(Number(after.prepare("pragma freelist_count").get()?.freelist_count)).toBeLessThanOrEqual(2);
  expect(after.prepare("select name from sqlite_master where name='secrets'").get()).toBeUndefined();
  after.close();
  expect(containing(rig.home, "SYNTHETIC")).toEqual([]);
});
it("p11: recovering many provisionals does not repeat walks per material either", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  for (let n = 0; n < 50; n++) session.capture(Buffer.from(`invented-${n}`));
  store.close();
  const rows = vi.spyOn(CustodyDatabase.prototype, "rows"),
    facts = vi.spyOn(CustodyDatabase.prototype, "facts");
  expect(rig.open().ids()).toEqual([]);
  const reads =
    rows.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length +
    facts.mock.results.flatMap(result => (result.type === "return" ? result.value : [])).length;
  expect(reads).toBeLessThanOrEqual(50 * 20);
});
it("forgetting warns about copies; only with acceptance does it erase every key", () => {
  const rig = custodyRig(),
    copy = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  store.close();
  copyFileSync(rig.file, copy.file);
  const again = rig.open();
  expect(again.forgetWarning()).toMatch(/ilegibles.*otras copias.*misma carpeta/u);
  expect(() => again.forgetHouse("yes")).toThrow("E-CUSTODY-DENIED");
  again.forgetHouse(again.forgetWarning());
  expect(() => new SecretCustody(copy.file, copy.home, rig.keys)).toThrow("E-CUSTODY-KEY");
  expect(() => rig.open()).toThrow("E-CUSTODY-KEY");
});
it("a key that could not be erased stays pending, erases no other reference and is retried", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  const fail = vi.spyOn(rig.keys, "forget").mockImplementation(() => {
    throw new Error("keychain");
  });
  expect(() => session.release("signing", 1)).toThrow("E-CUSTODY-CLEANUP");
  expect(store.cleanupPending()).toBe(true);
  expect(store.facts().some(f => f.kind === "credential-purged")).toBe(false);
  store.close();
  const reopened = rig.open();
  expect(reopened.cleanupPending()).toBe(true);
  fail.mockRestore();
  reopened.collect();
  expect(reopened.cleanupPending()).toBe(false);
  expect(reopened.facts().some(f => f.kind === "credential-purged")).toBe(true);
});
it("opening verifies the presence of each secret key without recreating it", () => {
  const rig = custodyRig(),
    store = rig.open();
  const ref = store.keep(Buffer.from("invented"));
  store.close();
  const db = new CustodyDatabase(rig.file),
    house = db.identity();
  db.close();
  rig.keys.forget(`${house}-secret-${ref.slice(7)}`);
  const key = vi.spyOn(rig.keys, "key");
  expect(() => rig.open()).toThrow("E-CUSTODY-KEY");
  expect(key.mock.calls.every(args => !args[1])).toBe(true);
});
it("an empty house without a provider has no cleanup failure and needs no keychain", () => {
  const rig = custodyRig(),
    store = new SecretCustody(rig.file, rig.home);
  try {
    expect(store.cleanupPending()).toBe(false);
    expect(() => store.collect()).not.toThrow();
    expect(store.cleanupPending()).toBe(false);
  } finally {
    store.close();
  }
});
it("the purge keeps the binding's scope and does not repeat receipts on collect or reopen", () => {
  const rig = custodyRig(),
    store = rig.open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  session.replace("signing", refs, 0);
  const bound = store.facts().find(fact => fact.kind === "credential-bound");
  session.release("signing", 1);
  expect(store.ids()).toEqual([]);
  const receipts = store.facts().filter(fact => fact.kind === "credential-purged");
  expect(receipts).toHaveLength(1);
  expect(receipts[0]).toMatchObject({ ...custodyScope, slot: "signing", revision: 1, cause: bound?.id });
  const facts = store.facts();
  store.collect();
  store.collect();
  expect(store.facts()).toEqual(facts);
  store.close();
  expect(rig.open().facts()).toEqual(facts);
});
it("collecting a closed house rejects the operation without touching its storage again", () => {
  const store = custodyRig().open();
  store.close();
  expect(() => store.collect()).toThrow("E-CUSTODY-DENIED");
});
it("a failure before writing maintenance intents does not mask the result either and stays visible", async () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  const refs = { key: session.capture(Buffer.from("invented")) };
  let restore = () => {};
  await expect(
    store.adapter(session, []).use(refs, () => {
      const failure = vi.spyOn(CustodyDatabase.prototype, "rows").mockImplementation(() => {
        throw new Error("storage");
      });
      restore = () => {
        failure.mockRestore();
      };
      return "ack";
    }),
  ).resolves.toBe("ack");
  expect(store.cleanupPending()).toBe(true);
  restore();
  store.collect();
  expect(store.cleanupPending()).toBe(false);
});
it("finishing a loan after close does not invent a pending cleanup", () => {
  const store = custodyRig().open(),
    session = store.begin(custodyScope);
  store.close();
  store.finish(session);
  expect(store.cleanupPending()).toBe(false);
});
