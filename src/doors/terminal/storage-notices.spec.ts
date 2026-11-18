import "../../../tests/support/upgrade-vault.ts";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
import { home, seed, open, program } from "../../../tests/support/upgrade-support.ts";
import { unpackFixture, packFixture } from "../../../tests/support/snapshot-fixture.ts";
function oldSnapshots(path: string) {
  const db = new DatabaseSync(join(path, "journal.sqlite"));
  try {
    for (const row of db.prepare("select name, state from snapshots").all()) {
      if (!(row.state instanceof Uint8Array) || typeof row.name !== "string")
        throw new Error("Missing fixture snapshot");
      const saved: unknown = unpackFixture(row.state);
      if (!saved || typeof saved !== "object") throw new Error("Invalid fixture snapshot");
      db.prepare("update snapshots set state = ? where name = ?").run(packFixture({ ...saved, version: 2 }), row.name);
    }
  } finally {
    db.close();
  }
}
it.each(["version", "format"])(
  "shows rebuild inside a real terminal, preserves data and never writes Node warnings (%s)",
  async mode => {
    const path = home();
    await seed(path);
    if (mode === "format") oldSnapshots(path);
    const version = mode === "version" ? "shop/2" : "shop/1";
    for (let attempt = 0; attempt < 2; attempt++) {
      const terminal = realTerminal([process.execPath, "tests/support/storage-terminal.ts", path, version]);
      try {
        if (attempt === 0) {
          await terminal.until("Reconstruido");
          expect(terminal.screen().join("\n")).toContain("Estado de la casa");
          terminal.press("\r");
        }
        await terminal.until("Menú");
        await terminal.rest(80);
        expect(terminal.written()).not.toMatch(/StorageNotice|SAVED_FOLD_REBUILT|trace-warnings|Warning:|Saved fold/);
        if (attempt === 1) expect(terminal.written()).not.toContain("Reconstruido");
      } finally {
        await terminal.close();
      }
    }
    const house = open(path, program(version));
    try {
      expect(house.tools.state().tools.sales.get("s1")).toEqual({ total: 10, paid: 0, by: "ana" });
      expect(house.storageNotices()).toEqual([]);
      expect(
        house.journal.replay<string[]>([], (all, event) =>
          event.kind === "sale-registered" ? [...all, event.by] : all,
        ),
      ).toEqual(["ana"]);
      expect(readFileSync(join(path, "storage-notices.jsonl"), "utf8")).toContain("SAVED_FOLD_REBUILT");
    } finally {
      house.close();
    }
  },
  15000,
);
