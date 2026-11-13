// A replay clock comes from a real fact, even when that fact happened at epoch zero; absence is never a clock.
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { effect } from "../../journal/events.ts";
import { journalKept, SqliteJournal } from "./journal-store.ts";
import { shop } from "../../../../tests/support/shop.ts";

it("rejects a journal with no last instant and preserves an actual zero instant", () => {
  const folder = mkdtempSync(join(tmpdir(), "desert-clock-"));
  const file = join(folder, "journal.sqlite");
  try {
    const empty = new SqliteJournal(file, shop);
    empty.close();
    expect(() => journalKept(file)).toThrow("A kept journal has no dated fact");
    const dated = new SqliteJournal(file, shop);
    dated.append(effect("boot", {}, "house"), 0);
    dated.close();
    expect(journalKept(file)).toEqual({ runner: "house", last: 0 });
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
