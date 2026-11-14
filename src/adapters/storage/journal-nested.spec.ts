import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";
import { join } from "node:path";
import { home, open, sale, watch } from "../../../tests/support/storage-rig.ts";
import { journalCauses } from "../../../tests/support/journal-causes.ts";
import type { ShopEvent } from "../../../tests/support/shop.ts";

it("each nested batch restores its own rows, folds and position, including a caught fold failure", () => {
  const file = join(home(), "journal.sqlite");
  const journal = open(file);
  const names = watch(journal);
  journal.watch("strict", 0, (count, event) => {
    if (event.kind === "sale-registered" && event.data.sale === "bad") throw new Error("bad fold");
    return count + 1;
  });
  journal.restore();
  journal.batch(() => {
    journal.append(sale("before"), 100);
    expect(() =>
      journal.batch(() => {
        journal.append(sale("inner"), 100);
        journal.batch(() => journal.append(sale("deep"), 100));
        throw new Error("inner");
      }),
    ).toThrow("inner");
    expect(names()).toEqual(["before"]);
    expect(() => journal.append(sale("bad"), 100)).toThrow("bad fold");
    expect(names()).toEqual(["before"]);
    expect(journal.append(sale("after"), 100).seq).toBe(2);
  });
  expect(names()).toEqual(["before", "after"]);
  const facts = journal.replay<ShopEvent[]>([], (all, e) => [...all, e]);
  journalCauses(facts);
  journal.close();
  const reopened = open(file);
  expect(watch(reopened)()).toEqual(["before", "after"]);
  expect(reopened.replay<ShopEvent[]>([], (all, e) => [...all, e])).toEqual(facts);
});

it("an outer rollback removes successful inner batches and permits retry in the same instance", () => {
  const journal = open(":memory:");
  const names = watch(journal);
  expect(() =>
    journal.batch(() => {
      journal.append(sale("outer"), 100);
      journal.batch(() => journal.append(sale("inner"), 100));
      throw new Error("outer");
    }),
  ).toThrow("outer");
  expect(names()).toEqual([]);
  expect(journal.append(sale("retry"), 100).seq).toBe(1);
  expect(names()).toEqual(["retry"]);
});

it("a process cut after the inner savepoint leaves only the previously committed history", () => {
  const file = join(home(), "journal.sqlite");
  const child = spawnSync(process.execPath, ["tests/support/journal-batch-cut.ts", file], { encoding: "utf8" });
  expect(child.error).toBeUndefined();
  expect(child.signal, child.stderr).toBe("SIGKILL");
  const journal = open(file);
  expect(watch(journal)()).toEqual(["committed"]);
  expect(journal.append(sale("after-cut"), 100).seq).toBe(2);
  journalCauses(journal.replay<ShopEvent[]>([], (all, event) => [...all, event]));
});
