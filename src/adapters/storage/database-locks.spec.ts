// Every caller (sidecar, journal and vault) uses this helper, so none may close a foreign descriptor.
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { home } from "../../../tests/support/storage-rig.ts";
import { privateDatabase } from "./home.ts";

it("keeps a SQLite transaction locked after a second private connection opens and closes", () => {
  const file = join(home(), "private.sqlite");
  const owner = privateDatabase(file);
  try {
    owner.exec("create table data (value integer); begin immediate");
    const local = privateDatabase(file);
    local.close();
    const child = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `
      import { DatabaseSync } from 'node:sqlite';
      const db = new DatabaseSync(process.argv[1]);
      try { db.exec('begin immediate'); process.stdout.write('opened'); }
      catch (error) { process.stdout.write(String(error.errcode)); }
      finally { db.close(); }
    `,
        file,
      ],
      { encoding: "utf8" },
    );
    expect(child.status, child.stderr).toBe(0);
    expect(child.stdout).toBe("5");
    owner.exec("insert into data values (1); commit");
    expect(owner.prepare("select * from data").all()).toEqual([{ value: 1 }]);
    expect(statSync(file).mode & 0o777).toBe(0o600);
  } finally {
    owner.close();
  }
});
