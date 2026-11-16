import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { home, open, sale } from "../../tests/support/storage-rig.ts";

it("never saves folds after any failed restore, even after a successful retry and periodic save", () => {
  const file = join(home(), "journal.sqlite");
  const first = open(file);
  first.append(sale("first"), 0);
  first.close();
  const journal = open(file);
  let broken = true;
  journal.watch("count", 0, n => {
    if (broken) throw new Error("synthetic failure");
    return n + 1;
  });
  expect(() => journal.restore()).toThrow("synthetic failure");
  broken = false;
  journal.restore();
  for (let i = 0; i < 101; i++) journal.append(sale(`s${i}`), 0);
  journal.close();
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    expect(db.prepare("select * from snapshots").all()).toEqual([]);
  } finally {
    db.close();
  }
});
