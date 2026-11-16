import "../../../tests/support/upgrade-vault.ts";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home, kept, program, seed } from "../../../tests/support/upgrade-support.ts";
import { SqliteJournal } from "../../storage/journal-store.ts";
import { keptUpgrade, upgradeEvidence } from "./kept-upgrade.ts";
import { renewKeptJournals } from "./renew-kept.ts";
it("renews manual kept folds without adding facts or effects and supplies reusable upgrade evidence", async () => {
  const source = home();
  await seed(source);
  const folder = kept(source);
  const current = program("shop/2", 2);
  const file = join(folder, "shop.sqlite");
  const read = () => {
    const journal = new SqliteJournal(file, current.words);
    try {
      return journal.replay<unknown[]>([], (all, e) => [...all, e]);
    } finally {
      journal.close();
    }
  };
  const before = read();
  await expect(upgradeEvidence([keptUpgrade(current, file, "shop")]).run()).rejects.toThrow(/no evidence/);
  expect(renewKeptJournals(current, folder)).toEqual(["shop.sqlite"]);
  expect(read()).toEqual(before);
  await expect(upgradeEvidence([keptUpgrade(current, file, "shop")]).run()).resolves.toBeUndefined();
});
it("rejects an empty renewal instead of claiming success", () => {
  expect(() => renewKeptJournals(program(), home())).toThrow(/keeps no journal/);
});
