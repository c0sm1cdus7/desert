import { expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { houseJournal } from "./house-journal.ts";
import { shop } from "../../../tests/support/shop.ts";
it("el registro de mantenimiento nunca permite vigilar o restaurar plegados", () => {
  const home = mkdtempSync(join(tmpdir(), "maintenance-folds-"));
  const journal = houseJournal(join(home, "journal.sqlite"), shop, undefined, "preserve");
  try {
    expect(() => journal.watch("other", 0, state => state)).toThrow("Maintenance cannot watch folds");
    expect(() => journal.restore()).toThrow("Maintenance cannot restore folds");
  } finally {
    journal.close();
    rmSync(home, { recursive: true, force: true });
  }
});
