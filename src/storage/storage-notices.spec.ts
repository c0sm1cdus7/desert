import "../../tests/support/upgrade-vault.ts";
import { join } from "node:path";
import { readFileSync, statSync } from "node:fs";
import { expect, it, vi } from "vitest";
import { home, open, program, seed, matches } from "../../tests/support/upgrade-support.ts";
import { SqliteJournal } from "./journal-store.ts";
import { storageNotices } from "./storage-notices.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { houseProjections } from "../runtime/house-projections.ts";
it("keeps rebuild notices on the opening instance and never as facts", async () => {
  const path = home();
  await seed(path);
  const current = program("shop/2", 2);
  const warning = vi.spyOn(process, "emitWarning");
  const house = open(path, current);
  try {
    expect(house.storageNotices()).toHaveLength(2);
    expect(house.storageNotices().every(w => w.reason.includes("calculation version changed"))).toBe(true);
    expect(
      house.journal.replay(
        0,
        (n, e) => n + Number(e.kind === "tool-entry" && !!e.data.diagnostic?.startsWith("SAVED_FOLD_REBUILT")),
      ),
    ).toBe(0);
    matches(house, current);
    expect(warning).not.toHaveBeenCalled();
    const log = join(path, "storage-notices.jsonl");
    expect(
      readFileSync(log, "utf8")
        .trim()
        .split("\n")
        .map((line): unknown => JSON.parse(line)),
    ).toEqual(house.storageNotices().map(notice => ({ code: "SAVED_FOLD_REBUILT", ...notice })));
    expect(statSync(log).mode & 0o777).toBe(0o600);
  } finally {
    house.close();
    warning.mockRestore();
  }
  const again = open(path, current);
  try {
    expect(again.storageNotices()).toEqual([]);
  } finally {
    again.close();
  }
});
it("ten storage openings, alternating identities, preserve exactly the same facts", async () => {
  const path = home();
  await seed(path);
  let before: unknown;
  for (let attempt = 0; attempt < 10; attempt++) {
    const notices = storageNotices();
    const current = program();
    const journal = new SqliteJournal(join(path, "journal.sqlite"), current.words, notices.warn);
    try {
      const facts = journal.replay<unknown[]>([], (all, e) => [...all, e]);
      before ??= facts;
      houseProjections<Shop>(journal, { ...current, by: attempt % 2 ? "shop" : "ana" });
      expect(journal.replay<unknown[]>([], (all, e) => [...all, e])).toEqual(before);
      expect(notices.read()).toEqual([]);
      if (attempt >= 2) expect(journal.restoration().reused).toBe(true);
    } finally {
      journal.close();
    }
  }
});
