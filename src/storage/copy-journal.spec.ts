import { join } from "node:path";
import { expect, it } from "vitest";
import { contender } from "../../tests/support/storage-process.ts";
import { fold, home, open, sale, watch } from "../../tests/support/storage-rig.ts";
import { copyJournal } from "../checks/kept/copy-journal.ts";
import { journalTexts } from "../texts/journal.texts.ts";

it("copies a live journal through SQLite including its WAL, without disturbing the owner's exclusion", async () => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const copy = join(home(), "journal.sqlite");
  const owner = open(file);
  const state = watch(owner);
  owner.append(sale("before"), 0);
  copyJournal(file, copy);
  expect(watch(open(copy))()).toEqual(["before"]);
  const child = contender(file, root, "copy");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe(journalTexts.locked);
    await child.stop();
    expect(owner.append(sale("after"), 1).seq).toBe(2);
    expect(owner.replay([], fold)).toEqual(state());
  } finally {
    await child.stop(true);
  }
});
