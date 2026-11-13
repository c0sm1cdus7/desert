import "../../tests/support/upgrade-vault.ts";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home, open, program, seed, matches } from "../../tests/support/upgrade-support.ts";
import { SqliteJournal } from "../adapters/storage/journal-store.ts";
import { storageNotices } from "../adapters/storage/storage-notices.ts";
import type { Shop } from "../../tests/support/shop.ts";
import { houseProjections } from "./house-projections.ts";
it("keeps rebuild notices on the opening instance and never as facts", async () => {
  const path = home();
  await seed(path);
  const current = program("shop/2", 2);
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
  } finally {
    house.close();
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
      expect(notices.read()).toHaveLength(2);
    } finally {
      journal.close();
    }
  }
});
