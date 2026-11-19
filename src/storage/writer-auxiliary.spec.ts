import { shop } from "../../tests/support/shop.ts";
import { copyJournal } from "../checks/kept/copy-journal.ts";
import { privateDatabase } from "./home.ts";
import { journalReader } from "./journal-store.ts";
// SQLite can also open journal/WAL/SHM siblings while acquiring a sidecar: none may alias another file.
import { linkSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { contender } from "../../tests/support/storage-process.ts";
import { home, open, sale, watch } from "../../tests/support/storage-rig.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { WriterLeaseUnavailable } from "./writer-lease.ts";
it.each(["-journal", "-wal", "-shm"])("refuses aliased sidecar sibling %s before SQLite opens it", async suffix => {
  const root = home();
  const victimFile = join(root, "victim.sqlite");
  const victim = open(victimFile);
  watch(victim);
  victim.append(sale("before"), 0);
  const otherFile = join(home(), "other.sqlite");
  symlinkSync(`${victimFile}.writer.sqlite`, `${otherFile}.writer.sqlite${suffix}`);
  expect(() => open(otherFile)).toThrow(WriterLeaseUnavailable);
  const child = contender(victimFile, root, "after-alias");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe(journalTexts.locked);
    expect(victim.append(sale("after"), 1).seq).toBe(2);
  } finally {
    await child.stop(true);
  }
});
it.each(["-journal", "-wal", "-shm"])("refuses hardlinked sidecar sibling %s", suffix => {
  const file = join(home(), "journal.sqlite");
  const other = join(home(), "other.sqlite");
  open(other).close();
  linkSync(`${other}.writer.sqlite`, `${file}.writer.sqlite${suffix}`);
  expect(() => open(file)).toThrow(WriterLeaseUnavailable);
});

it.each(["writer", "reader", "copy", "private"])("the %s door refuses aliased database siblings", async door => {
  const root = home();
  const victimFile = join(root, "victim.sqlite");
  const victim = open(victimFile);
  watch(victim);
  const candidate = join(home(), "journal.sqlite");
  open(candidate).close();
  symlinkSync(`${victimFile}.writer.sqlite`, `${candidate}-wal`);
  const attempt = () => {
    if (door === "reader") {
      journalReader(candidate, shop).close();
      return;
    }
    if (door === "copy") {
      copyJournal(candidate, join(home(), "copy.sqlite"));
      return;
    }
    if (door === "private") {
      privateDatabase(candidate).close();
      return;
    }
    open(candidate).close();
  };
  expect(attempt).toThrow(/regular files/);
  const child = contender(victimFile, root, door);
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toBe(journalTexts.locked);
    expect(victim.append(sale("owned"), 0).seq).toBe(1);
  } finally {
    await child.stop(true);
  }
});
