import { expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fixture, home, time, has } from "../../tests/support/secret-rig.ts";
import fixtures from "../../tests/support/a01-history.json" with { type: "json" };
import { startHouse } from "./house-runtime.ts";

// Rows and encoded snapshots written by the starting commit, not by the new protection.
function previous(kind: "exposed" | "reference") {
  const path = home();
  const db = new DatabaseSync(join(path, "journal.sqlite"));
  db.exec(`pragma journal_mode = wal;
    create table events (seq integer primary key, id text not null unique, at integer not null,
    kind text not null, by text not null, cause text not null, data text not null, process text);
    create table snapshots (name text primary key, state blob not null);`);
  for (const row of fixtures[kind].events)
    db.prepare("insert into events values (?,?,?,?,?,?,?,?)").run(
      row.seq,
      row.id,
      row.at,
      row.kind,
      row.by,
      row.cause,
      row.data,
      row.process,
    );
  for (const row of fixtures[kind].snapshots)
    db.prepare("insert into snapshots values (?,?)").run(row.name, Buffer.from(row.state, "base64"));
  db.close();
  return path;
}
it("rechaza el registro anterior expuesto sin alterar sus bytes y nombra solo acción y posición", () => {
  const rig = fixture();
  const path = previous("exposed");
  const before = readFileSync(join(path, "journal.sqlite"));
  let failure: unknown;
  try {
    const opened = startHouse(path, rig.options, time);
    opened.close();
  } catch (error) {
    failure = error;
  }
  expect(failure).toMatchObject({ code: "E-SECRET-HISTORY" });
  expect(has(failure, "dato-anterior")).toBe(false);
  expect(String(failure)).toContain("vault/set");
  expect(String(failure)).toContain("/value");
  expect(readFileSync(join(path, "journal.sqlite")).equals(before)).toBe(true);
  expect(readdirSync(path).sort()).toEqual(["journal.sqlite", "journal.sqlite-shm", "journal.sqlite-wal"]);
  expect(readFileSync(join(path, "journal.sqlite-wal")).length).toBe(0);
});
it("abre el registro anterior con referencias y deja las cuentas revisadas y no revisables", () => {
  const rig = fixture();
  const path = previous("reference");
  const opened = startHouse(path, rig.options, time);
  opened.close();
  const mark: unknown = JSON.parse(readFileSync(join(path, "secret-protection.json"), "utf8"));
  expect(mark).toMatchObject({ version: 2, reviewedFacts: 0, reviewed: 1, unreviewable: 1 });
  const db = new DatabaseSync(join(path, "journal.sqlite"), { readOnly: true });
  expect(db.prepare("select * from events where seq <= 4").all()).toEqual(fixtures.reference.events);
  db.close();
  const again = startHouse(path, rig.options, time);
  again.close();
  expect(JSON.parse(readFileSync(join(path, "secret-protection.json"), "utf8"))).toEqual(mark);
});
