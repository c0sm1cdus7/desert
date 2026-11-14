// Read-only SQLite can accept BEGIN IMMEDIATE without taking an OS writer lock.
import { chmodSync, linkSync, mkdirSync, renameSync, rmSync, statSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { contender } from "../../../tests/support/storage-process.ts";
import { home, open, sale, watch } from "../../../tests/support/storage-rig.ts";
import { projectionVersion } from "../../programs/projection-version.ts";

it.each(["file", "directory", "symlink", "hardlink"])("refuses an unwritable or aliased sidecar: %s", mode => {
  const root = home();
  const file = join(root, "journal.sqlite");
  const sidecar = `${file}.writer.sqlite`;
  open(file).close();
  const original = statSync(sidecar).mode & 0o777;
  if (mode === "file") chmodSync(sidecar, 0o400);
  if (mode === "directory") chmodSync(root, 0o500);
  if (mode === "symlink" || mode === "hardlink") {
    renameSync(sidecar, join(home(), "other.sqlite"));
    const target = join(home(), "target.sqlite");
    open(target).close();
    if (mode === "symlink") symlinkSync(`${target}.writer.sqlite`, sidecar);
    else linkSync(`${target}.writer.sqlite`, sidecar);
  }
  try {
    expect(() => open(file)).toThrow(expect.objectContaining({ code: "WRITER_LEASE_UNAVAILABLE" }));
    if (mode === "file") expect(statSync(sidecar).mode & 0o777).toBe(0o400);
  } finally {
    chmodSync(root, 0o700);
    if (mode === "file") chmodSync(sidecar, original);
  }
});

it("does not let a fingerprint release exclusion, even with code ordered before the organization", async () => {
  const root = home();
  const folder = join(root, "org");
  mkdirSync(folder);
  const file = join(folder, "journal.sqlite");
  const owner = open(file);
  const state = watch(owner);
  owner.append(sale("before"), 0);
  expect(() => projectionVersion([root])).toThrow(/organization|journal/i);
  expect(() => projectionVersion([root], [".sqlite"])).toThrow(/organization|journal/i);
  const child = contender(file, root, "fingerprint");
  try {
    expect(await child.next()).toBe("ready");
    child.send("open");
    expect(await child.next()).toMatch(/already open/);
    expect(owner.append(sale("after"), 1).seq).toBe(2);
    expect(state()).toEqual(["before", "after"]);
  } finally {
    await child.stop(true);
  }
});

it("latches loss when an open organization is renamed", () => {
  const root = home();
  const folder = join(root, "org");
  mkdirSync(folder);
  const file = join(folder, "journal.sqlite");
  const owner = open(file);
  watch(owner);
  renameSync(folder, join(root, "moved"));
  expect(() => owner.append(sale("forbidden"), 0)).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  renameSync(join(root, "moved"), folder);
  expect(() => owner.close()).toThrow(expect.objectContaining({ code: "WRITER_LEASE_LOST" }));
  rmSync(`${file}.writer.sqlite`);
  open(file).close();
});
