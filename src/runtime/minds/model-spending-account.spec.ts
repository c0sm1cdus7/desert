// Exercises durable host balances, exclusive ownership and pending reservations without a provider.
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";
import { effect } from "../../house/facts.ts";
import { budgetTransaction, reserveModelCall, settleModelCall } from "./mind-call-budget.ts";
import { billingAccount } from "./mind-billing.ts";
import { openModelSpendingAccount } from "./model-spending-account.ts";
const folders: string[] = [];
const accounts: ReturnType<typeof openModelSpendingAccount>[] = [];
const cap = 10_000_000_000;
const prior = 1_020_000_000;
function fixture() {
  const folder = mkdtempSync(join(tmpdir(), "model-account-"));
  folders.push(folder);
  const home = join(folder, "house");
  mkdirSync(home);
  const config = { file: join(folder, "models.sqlite"), openingNanoUsd: prior };
  const open = (name = "host", limit = cap, opening = prior) => {
    const account = openModelSpendingAccount(home, { ...config, openingNanoUsd: opening }, name, limit);
    accounts.push(account);
    return account;
  };
  return { folder, home, config, open };
}
afterEach(() => {
  accounts.splice(0).forEach(account => account.close());
  folders.splice(0).forEach(folder => rmSync(folder, { recursive: true, force: true }));
});
function reserve(account: ReturnType<typeof openModelSpendingAccount>, call: string, maximumNanoUsd: number) {
  const { billing } = account;
  return reserveModelCall(
    budgetTransaction(billing.bus, billing.calls, name => billingAccount(billing, name)),
    cap,
    { call, turn: call, number: 1, account: "host", maximumNanoUsd, by: "mind:notes" },
  );
}
it("counts opening once through replay, snapshot removal and a rebuilt house", async () => {
  const f = fixture();
  const first = f.open();
  expect(await reserve(first, "paid", 8_000_000_000)).toBe(true);
  first.billing.bus.emit(effect("model-call-started", { call: "paid" }, "mind:notes"));
  first.billing.bus.emit(
    settleModelCall("paid", 8_000_000_000, { input: 10, output: 16000, cacheRead: 0, cacheWrite: 0 }, "mind:notes"),
  );
  first.close();
  rmSync(f.home, { recursive: true });
  mkdirSync(f.home);
  const db = new DatabaseSync(f.config.file);
  expect(db.prepare("select count(*) as count from events where kind = 'model-account-opened'").get()?.count).toBe(1);
  db.exec("delete from snapshots");
  db.close();
  const reopened = f.open();
  expect(billingAccount(reopened.billing, "host")).toEqual({ spentNanoUsd: 9_020_000_000, reservedNanoUsd: 0 });
  expect(await reserve(reopened, "too-much", 980_000_001)).toBe(false);
  expect(await reserve(reopened, "exact", 980_000_000)).toBe(true);
});
it.each(["reserved", "started", "uncertain"] as const)("keeps a %s call charged across reopening", async status => {
  const f = fixture();
  const first = f.open();
  expect(await reserve(first, "pending", cap - prior)).toBe(true);
  if (status !== "reserved") first.billing.bus.emit(effect("model-call-started", { call: "pending" }, "mind:notes"));
  if (status === "uncertain") first.billing.bus.emit(effect("model-call-uncertain", { call: "pending" }, "mind:notes"));
  first.close();
  const reopened = f.open();
  expect(await reserve(reopened, "extra", 1)).toBe(false);
  expect(billingAccount(reopened.billing, "host")).toEqual({ spentNanoUsd: prior, reservedNanoUsd: cap - prior });
});
it("serializes competing reservations and rolls back a failed transaction", async () => {
  const account = fixture().open();
  expect(await Promise.all([reserve(account, "one", 5e9), reserve(account, "two", 5e9)])).toEqual([true, false]);
  expect(() =>
    account.billing.bus.together(() => {
      account.billing.bus.emit(effect("model-call-cancelled", { call: "one" }, "mind:notes"));
      throw new Error("rollback");
    }),
  ).toThrow("rollback");
  expect(billingAccount(account.billing, "host").reservedNanoUsd).toBe(5e9);
});
it("refuses a second writer and rejects changes to the durable opening", () => {
  const f = fixture();
  const first = f.open();
  expect(() => f.open()).toThrow();
  first.close();
  expect(() => f.open("another")).toThrow("billing.opening-mismatch");
  expect(() => f.open("host", cap + 1)).toThrow("billing.opening-mismatch");
  expect(() => f.open("host", cap, 0)).toThrow("billing.opening-mismatch");
  expect(billingAccount(f.open().billing, "host").spentNanoUsd).toBe(prior);
});
it("rejects relative paths and paths inside the house including symbolic aliases", () => {
  const f = fixture();
  for (const file of [":memory:", "models.sqlite", join(f.home, "models.sqlite")])
    expect(() => openModelSpendingAccount(f.home, { ...f.config, file }, "host", cap)).toThrow("billing.");
  const alias = join(f.folder, "alias");
  symlinkSync(f.home, alias);
  expect(() =>
    openModelSpendingAccount(f.home, { ...f.config, file: join(alias, "models.sqlite") }, "host", cap),
  ).toThrow("billing.outside-house");
});
it("enforces the signed cap even when a caller bypasses the reservation helper", () => {
  const account = fixture().open();
  expect(() =>
    account.billing.bus.emit(
      effect(
        "model-call-reserved",
        {
          call: "over",
          turn: "over",
          number: 1,
          account: "host",
          maximumNanoUsd: cap,
        },
        "mind:notes",
      ),
    ),
  ).toThrow("billing.cap");
  expect(account.billing.calls().size).toBe(0);
});
