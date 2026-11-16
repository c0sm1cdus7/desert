import "../../../tests/support/fixture-vault.ts";
import { OutsideDefect } from "../../tools/outside.ts";
// Program startup and cleanup callbacks retain diagnostics even when no surface can be drawn yet.
import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { shopProgram, shop } from "../../../tests/support/shop.ts";
import { startHouse } from "../house-runtime.ts";
import { SqliteJournal } from "../../adapters/storage/journal-store.ts";
import type { Event } from "../../journal/events.ts";

for (const mode of ["start", "stop"] as const) {
  it(`${mode}: writes the program defect before closing resources`, () => {
    const home = mkdtempSync(join(tmpdir(), "desert-lifecycle-"));
    const fail = (): never => {
      throw new Error("lifecycle diagnostic");
    };
    const registry = shopProgram.registry.map(tool => ({
      ...tool,
      start: () => {
        if (mode === "start") fail();
        return fail;
      },
    }));
    const options = {
      ...shopProgram,
      registry,
      by: "shop",
      creation: { admin: "ana", assignments: [] },
    };
    try {
      if (mode === "start") expect(() => startHouse(home, options)).toThrow("OutsideDefect: lifecycle diagnostic");
      else {
        const house = startHouse(home, options);
        expect(house.close).toThrow(OutsideDefect);
      }
      const journal = new SqliteJournal(join(home, "journal.sqlite"), shop);
      try {
        const entries = journal.replay<Event[]>([], (all, event) =>
          event.kind === "tool-entry" ? [...all, event] : all,
        );
        expect(JSON.stringify(entries)).toContain("E-PROG-1");
        expect(JSON.stringify(entries)).toContain("lifecycle diagnostic");
      } finally {
        journal.close();
      }
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
}
