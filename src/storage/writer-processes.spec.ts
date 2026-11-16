// A rejected child cannot disturb its owner; the OS releases ownership even without a close.
import { mkdirSync, existsSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { journalKept } from "./journal-store.ts";
import { journalTexts } from "../texts/journal.texts.ts";
import { contender } from "../../tests/support/storage-process.ts";
import { home, open, fold } from "../../tests/support/storage-rig.ts";

async function releaseAcquiring(children: ReturnType<typeof contender>[], results: unknown[], root: string) {
  expect(results).toEqual(children.map(() => "acquiring"));
  children.forEach((_, n) => writeFileSync(join(root, `${n}.go`), ""));
  return Promise.all(children.map(c => c.next()));
}

it.each([
  { mode: "plain", alias: false },
  { mode: "lease", alias: false },
  { mode: "plain", alias: true },
  { mode: "lease", alias: true },
])(
  "exactly one process wins simultaneous acquisition ($mode, alias=$alias)",
  async ({ mode, alias }) => {
    // The barrier stops every child immediately before SQLite takes the writer lease; plain starts vary scheduling.
    const rounds = mode === "lease" ? 3 : 12;
    for (let round = 0; round < rounds; round++) {
      const root = home();
      const file = join(root, "journal.sqlite");
      const link = join(home(), "alias");
      symlinkSync(root, link, "dir");
      const other = join(link, "journal.sqlite");
      const children = Array.from({ length: mode === "lease" ? 2 : 4 }, (_, n) =>
        contender(alias && n % 2 ? other : file, root, String(n), mode),
      );
      try {
        expect(await Promise.all(children.map(c => c.next()))).toEqual(children.map(() => "ready"));
        children.forEach(c => c.send("open"));
        let results = await Promise.all(children.map(c => c.next()));
        if (mode === "lease") results = await releaseAcquiring(children, results, root);
        expect(results.filter(r => r === "opened")).toHaveLength(1);
        expect(results.filter(r => r === journalTexts.locked)).toHaveLength(children.length - 1);
        const owner = children[results.indexOf("opened")];
        if (!owner) throw new Error("No owner");
        expect(existsSync(join(root, "journal.lock"))).toBe(false);
        await Promise.all(children.filter(c => c !== owner).map(c => c.stop()));
        expect(existsSync(join(root, "journal.lock"))).toBe(false);
        owner.send("write");
        expect(await owner.next()).toBe("wrote");
        await owner.stop();
        const journal = open(file);
        expect(journal.replay([], fold)).toEqual(
          Array.from({ length: 101 }, (_, n) => `${results.indexOf("opened")}${n}`),
        );
        journal.close();
      } finally {
        await Promise.all(children.map(c => c.stop(true)));
      }
    }
  },
  60_000,
);

it.each([false, true])(
  "SIGKILL releases a real owner; alias=%s reopens as a full fold",
  async alias => {
    const root = home();
    const real = join(root, "real");
    mkdirSync(real);
    const link = join(root, "alias");
    symlinkSync(real, link, "dir");
    const file = join(real, "journal.sqlite");
    const other = join(link, "journal.sqlite");
    const owner = contender(alias ? other : file, root, "owner");
    const rejected = contender(alias ? file : other, root, "rejected");
    try {
      expect(await owner.next()).toBe("ready");
      expect(await rejected.next()).toBe("ready");
      owner.send("open");
      expect(await owner.next()).toBe("opened");
      rejected.send("open");
      expect(await rejected.next()).toBe(journalTexts.locked);
      await rejected.stop();
      owner.send("write");
      expect(await owner.next()).toBe("wrote");
      await owner.stop(true);
      const next = open(alias ? file : other);
      const count = next.watch("sales", 0, (n, e) => n + Number(e.kind === "sale-registered"));
      next.restore();
      expect(count()).toBe(101);
      next.close();
      journalKept(file);
      const rebuilt = open(file);
      const full = rebuilt.watch("sales", 0, (n, e) => n + Number(e.kind === "sale-registered"));
      rebuilt.restore();
      expect(full()).toBe(count());
      expect(rebuilt.replay([], fold)).toEqual(Array.from({ length: 101 }, (_, n) => `owner${n}`));
    } finally {
      await owner.stop(true);
      await rejected.stop(true);
    }
  },
  30_000,
);
