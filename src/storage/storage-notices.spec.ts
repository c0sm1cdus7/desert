import "../../tests/support/upgrade-vault.ts";
import { join } from "node:path";
import { linkSync, mkdirSync, mkdtempSync, readFileSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { describe, expect, it, vi } from "vitest";
import { home, open, program, seed, matches, type House } from "../../tests/support/upgrade-support.ts";
import { localPorts } from "../runtime/house-runtime.ts";
import { journalTexts } from "../texts/journal.texts.ts";
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
describe("the record of openings never stops an opening and never writes outside the house", () => {
  const log = (path: string) => join(path, "storage-notices.jsonl");
  const facts = (house: House) => house.journal.replay(0, n => n + 1);
  const cases: [string, (path: string, outside: string) => void, string][] = [
    ["a record that cannot be written", path => writeFileSync(log(path), "", { mode: 0o400 }), "EACCES"],
    ["a record that is a link elsewhere", (path, outside) => symlinkSync(outside, log(path)), "ELOOP"],
    ["a record that is a hard link", (path, outside) => linkSync(outside, log(path)), journalTexts.notOwnRecord],
    ["a record that is a folder", path => mkdirSync(log(path)), "EISDIR"],
  ];
  it.each(cases)(
    "%s: the house opens, rebuilds, keeps its facts and says why the record was not kept",
    async (_, make, cause) => {
      const path = home();
      await seed(path);
      const before = open(path);
      const count = facts(before);
      before.close();
      const outside = join(mkdtempSync(join(tmpdir(), "outside-")), "foreign.txt");
      writeFileSync(outside, "SYNTHETIC-DATA-ONLY\n");
      make(path, outside);
      const current = program("shop/2", 2);
      const house = open(path, current);
      try {
        expect(house.storageNotices()).toHaveLength(2);
        expect(house.storageUnsaved()).toEqual([cause]);
        expect(localPorts(house, "ana", { recentLines: 20 }).openingNotices?.()).toEqual([
          journalTexts.rebuilt,
          journalTexts.unsavedRecord(cause),
        ]);
        matches(house, current);
        expect(facts(house)).toBe(count + 1);
      } finally {
        house.close();
      }
      expect(readFileSync(outside, "utf8")).toBe("SYNTHETIC-DATA-ONLY\n");
      const again = open(path, current);
      try {
        expect(again.storageNotices()).toEqual([]);
        expect(facts(again)).toBe(count + 2);
      } finally {
        again.close();
      }
    },
  );
});
