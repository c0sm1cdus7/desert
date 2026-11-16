// flip.mjs, plus the immediately preceding format, rebuilt exactly once.
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { serialize } from "node:v8";
import { expect, it } from "vitest";
import { home, open, sale, watch } from "../../tests/support/storage-rig.ts";
it.each(["byte", "legacy"])("rebuilds a %s snapshot with a visible reason, then reuses it", mode => {
  const file = join(home(), "journal.sqlite");
  const first = open(file);
  watch(first);
  first.append(sale("sale3"), 0);
  first.close();
  const db = new DatabaseSync(file);
  try {
    const row = db.prepare("select state from snapshots where name='sales'").get();
    if (!(row?.state instanceof Uint8Array)) throw new Error("Missing fold");
    let bytes = Buffer.from(row.state);
    if (mode === "byte") {
      const at = bytes.indexOf("sale3");
      expect(at).toBeGreaterThan(0);
      bytes[at + 4] = "7".charCodeAt(0);
    } else {
      const journal = db.prepare("select id from journal_identity").get()?.id;
      bytes = serialize({ version: 3, seq: 1, state: ["sale3"], identity: "", journal });
    }
    db.prepare("update snapshots set state=?").run(bytes);
  } finally {
    db.close();
  }
  const next = open(file);
  expect(watch(next)()).toEqual(["sale3"]);
  expect(next.restoration().reused).toBe(false);
  expect(next.restoration().warnings).toHaveLength(1);
  expect(next.restoration().warnings[0]?.reason).toMatch(mode === "byte" ? /checksum/ : /checksum|format/);
  next.close();
  const again = open(file);
  expect(watch(again)()).toEqual(["sale3"]);
  expect(again.restoration()).toEqual({ reused: true, warnings: [] });
});
