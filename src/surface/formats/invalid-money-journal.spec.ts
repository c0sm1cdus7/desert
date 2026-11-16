import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { realTerminal } from "../../checks/real-terminal.ts";
it("records one entry for one failed screen", async () => {
  const home = mkdtempSync(join(tmpdir(), "money-journal-"));
  const term = realTerminal([
    process.execPath,
    join(import.meta.dirname, "../../../tests/support/invalid-money-open.ts"),
    home,
  ]);
  try {
    await term.until("Menú");
    term.press("v");
    await term.until("[r] registrar");
    term.press("r");
    await term.until("Nombre de la venta");
    term.press("venta\r");
    await term.until("Error");
    await term.rest(300);
    const db = new DatabaseSync(join(home, "journal.sqlite"), { readOnly: true });
    try {
      expect(db.prepare("select count(*) as n from events where kind = 'tool-entry'").get()?.n).toBe(1);
    } finally {
      db.close();
    }
  } finally {
    term.press("\x1b");
    await term.rest(100);
    await term.close();
    rmSync(home, { recursive: true, force: true });
  }
}, 20000);
