import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { type Shop, shopShown } from "../../tests/support/shop.ts";
import { packFixture, unpackFixture } from "../../tests/support/snapshot-fixture.ts";
import "../../tests/support/upgrade-vault.ts";
import { copyJournal } from "../checks/kept/copy-journal.ts";
import { keptChecks } from "../checks/kept/kept-journals.ts";
import { startState } from "../house/state.ts";

import { home, kept, legacy, program, seed } from "../../tests/support/upgrade-support.ts";
it.each(["legacy", "stale"])("refuses to certify a manual version with only %s evidence", async mode => {
  const path = home();
  if (mode === "legacy") legacy(path, "19a0b47");
  else await seed(path, program("shop/0", 1));
  const checks = keptChecks(program("shop/1", 2), shopShown, kept(path));
  const failures: string[] = [];
  for (const check of checks) await check.run().catch((error: unknown) => failures.push(String(error)));
  expect(failures.some(error => /evidence|evidencia/.test(error))).toBe(true);
  expect(checks.some(check => /REBUILT/.test(check.report?.() ?? ""))).toBe(true);
});
it("does not accept a manual version with no kept journals", async () => {
  const failures: string[] = [];
  for (const check of keptChecks(program(), shopShown, home()))
    await check.run().catch((error: unknown) => failures.push(String(error)));
  expect(failures.some(error => /evidence|evidencia/.test(error))).toBe(true);
});

it("requires reuse somewhere, and reports obsolete and reusable journals individually", async () => {
  const old = home();
  legacy(old, "19a0b47");
  const current = home();
  await seed(current);
  const folder = kept(old, "old.sqlite");
  copyJournal(join(current, "journal.sqlite"), join(folder, "fresh.sqlite"));
  const checks = keptChecks(program(), shopShown, folder);
  for (const check of checks) await check.run();
  const reports = checks.map(check => check.report?.());
  expect(reports).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/fresh.sqlite: REUSED/),
      expect.stringMatching(/old.sqlite: REBUILT/),
    ]),
  );
});

it("a saved initial state at sequence zero is not evidence of previous calculations", async () => {
  const path = home();
  await seed(path);
  const folder = kept(path);
  const current = program();
  const db = new DatabaseSync(join(folder, "shop.sqlite"));
  try {
    for (const row of db.prepare("select name, state from snapshots").all()) {
      if (!(row.state instanceof Uint8Array) || typeof row.name !== "string") throw new Error("Missing fixture");
      const saved: unknown = unpackFixture(row.state);
      if (typeof saved !== "object" || saved === null) throw new Error("Missing envelope");
      const state = row.name.includes(":clock:") ? new Map() : startState<Shop>(current.slices, "shop");
      db.prepare("update snapshots set state = ? where name = ?").run(
        packFixture({ ...saved, seq: 0, state }),
        row.name,
      );
    }
  } finally {
    db.close();
  }
  const checks = keptChecks(current, shopShown, folder);
  const failures: string[] = [];
  for (const check of checks) await check.run().catch((error: unknown) => failures.push(String(error)));
  expect(failures).toEqual([expect.stringMatching(/no evidence/)]);
});
