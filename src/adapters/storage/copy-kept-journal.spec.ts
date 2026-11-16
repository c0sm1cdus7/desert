import { expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { copyFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { home } from "../../../tests/support/storage-rig.ts";
import { copyKeptJournal } from "./copy-kept-journal.ts";
it("conserva evidencia con WAL pendiente sin abrir ni alterar sus auxiliares originales", () => {
  const source = join(home(), "journal.sqlite");
  const writer = new DatabaseSync(source);
  const folder = home(),
    kept = join(folder, "kept.sqlite");
  try {
    writer.exec("pragma journal_mode=wal; create table evidence(value); insert into evidence values (42)");
    for (const suffix of ["", "-wal", "-shm"]) copyFileSync(`${source}${suffix}`, `${kept}${suffix}`);
  } finally {
    writer.close();
  }
  const before = readdirSync(folder).map(name => [name, readFileSync(join(folder, name))]);
  const copy = join(home(), "copy.sqlite");
  copyKeptJournal(kept, copy);
  expect(statSync(copy).mode & 0o777).toBe(0o600);
  expect(statSync(`${copy}-wal`).mode & 0o777).toBe(0o600);
  const db = new DatabaseSync(copy);
  try {
    expect(db.prepare("select value from evidence").get()?.value).toBe(42);
  } finally {
    db.close();
  }
  expect(readdirSync(folder).map(name => [name, readFileSync(join(folder, name))])).toEqual(before);
});
