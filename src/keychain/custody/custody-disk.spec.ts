import { processKeys } from "../../../tests/support/custody-provider.ts";
import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { custodyRig, custodyScope } from "../../../tests/support/custody-rig.ts";
import { containing } from "../../../tests/support/custody-files.ts";
import { SecretCustody } from "./secret-custody.ts";
const marker = "SYNTHETIC_DISK_MARKER_".repeat(20);
function cut(file: string, home: string, point: string) {
  const child = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../../../tests/support/custody-cut.ts", import.meta.url)), file, home, point],
    { encoding: "utf8" },
  );
  expect(child.stderr).not.toContain("Error:");
  expect(child.signal).toBe("SIGKILL");
}
for (const wal of [false, true])
  it(`retiring cleans ALL files before compacting: SIGKILL (${wal ? "WAL" : "DELETE"}, a4)`, () => {
    const rig = custodyRig(),
      db = new DatabaseSync(rig.file);
    if (wal) db.exec("pragma journal_mode=WAL");
    db.exec("create table secrets (id text primary key, value text not null unique)");
    for (let index = 0; index < 40; index++)
      db.prepare("insert into secrets values (?,?)").run(`secret:${randomUUID()}`, `${marker}${index}`);
    db.close();
    cut(rig.file, rig.home, "retire");
    expect(containing(rig.home, marker)).toEqual([]);
    const reopened = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
    try {
      expect(reopened.ids()).toHaveLength(40);
      expect(containing(rig.home, marker)).toEqual([]);
    } finally {
      reopened.close();
    }
    expect(containing(rig.home, marker)).toEqual([]);
  });
for (const point of ["open", "closed", "purge", "released"])
  it(`releasing and purging erases material and ciphertext from ALL files: ${point} (a8/a9)`, () => {
    const rig = custodyRig(),
      store = new SecretCustody(rig.file, rig.home, processKeys(rig.home)),
      session = store.begin(custodyScope);
    const refs = { key: session.capture(Buffer.from(marker)) };
    session.replace("signing", refs, 0);
    expect(containing(rig.home, marker)).toEqual([]);
    store.close();
    const db = new DatabaseSync(rig.file),
      payload = db.prepare("select payload from custody_material").get()?.payload;
    db.close();
    if (typeof payload !== "string") throw new Error("fixture");
    const ciphertext = payload.split(".")[3];
    if (!ciphertext) throw new Error("fixture");
    expect(containing(rig.home, ciphertext).length).toBeGreaterThan(0);
    if (point === "purge" || point === "released") cut(rig.file, rig.home, point);
    else {
      const reopened = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
      try {
        reopened.begin(custodyScope).release("signing", 1);
        expect(containing(rig.home, marker)).toEqual([]);
        expect(containing(rig.home, ciphertext)).toEqual([]);
        expect(containing(rig.home, Buffer.from(ciphertext, "base64"))).toEqual([]);
      } finally {
        reopened.close();
      }
    }
    expect(containing(rig.home, marker)).toEqual([]);
    expect(containing(rig.home, ciphertext)).toEqual([]);
    expect(containing(rig.home, Buffer.from(ciphertext, "base64"))).toEqual([]);
  });

for (const point of ["copy", "before-retire", "compact", "adopted"])
  it(`adoption cut at ${point}: resumes the originals without leaving text after retirement`, () => {
    const rig = custodyRig(),
      db = new DatabaseSync(rig.file);
    db.exec("create table secrets (id text primary key, value text not null unique)");
    for (let index = 0; index < 3; index++)
      db.prepare("insert into secrets values (?,?)").run(`secret:${randomUUID()}`, `${marker}${index}`);
    db.close();
    cut(rig.file, rig.home, point);
    const beforeRetirement = point === "copy" || point === "before-retire";
    expect(containing(rig.home, marker).length > 0).toBe(beforeRetirement);
    const recovered = new SecretCustody(rig.file, rig.home, processKeys(rig.home));
    try {
      expect(recovered.ids()).toHaveLength(3);
      expect(containing(rig.home, marker)).toEqual([]);
    } finally {
      recovered.close();
    }
    expect(containing(rig.home, marker)).toEqual([]);
  });
