vi.mock("node:fs", { spy: true });
import { fork } from "node:child_process";
import { once } from "node:events";
import * as fs from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { home, open } from "../../tests/support/storage-rig.ts";
import { sqliteFiles } from "./sqlite-files.ts";
it("treats a neighboring inode being unlinked as absent", () => {
  const file = join(home(), "journal.sqlite");
  const owner = open(file);
  owner.close();
  const entry = fs.lstatSync(file, { bigint: true });
  entry.nlink = 0n;
  const stat = vi.spyOn(fs, "lstatSync").mockReturnValue(entry);
  try {
    expect(sqliteFiles(file)).toBeUndefined();
  } finally {
    stat.mockRestore();
  }
});
const counts = (message: unknown) => {
  if (!message || typeof message !== "object") throw new Error("Missing race counts");
  const opened: unknown = Reflect.get(message, "opened");
  const rejected: unknown = Reflect.get(message, "rejected");
  expect(Reflect.get(message, "errors")).toEqual([]);
  if (typeof opened !== "number" || typeof rejected !== "number") throw new Error("Invalid race counts");
  expect(opened + rejected).toBe(400);
  return { opened, rejected };
};
it("counts 3200 simultaneous opens/closes in real processes with only typed contention", async () => {
  let attempts = 0;
  let totalOpened = 0;
  let totalRejected = 0;
  for (let round = 0; round < 4; round++) {
    const file = join(home(), "journal.sqlite");
    const children = Array.from({ length: 2 }, () =>
      fork(new URL("../../tests/support/storage-fight.ts", import.meta.url), [file, "400"], {
        execArgv: [],
        stdio: ["ignore", "ignore", "ignore", "ipc"],
      }),
    );
    try {
      await Promise.all(children.map(child => once(child, "message")));
      const done = Promise.all(children.map(child => once(child, "message")));
      children.forEach(child => child.send("go"));
      for (const [message] of await done) {
        const { opened, rejected } = counts(message);
        totalOpened += opened;
        totalRejected += rejected;
        attempts += opened + rejected;
      }
    } finally {
      children.forEach(child => {
        if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
      });
    }
  }
  expect(attempts).toBe(3200);
  expect(totalOpened).toBeGreaterThan(0);
  expect(totalRejected).toBeGreaterThan(0);
  process.stdout.write(`Race: ${attempts} attempts, ${totalOpened} opened, ${totalRejected} typed rejections\n`);
}, 60_000);
