// A local rejection must preserve the owner's OS lock against a later real process.
import { once } from "node:events";
import { symlinkSync } from "node:fs";
import { join } from "node:path";
import { Worker } from "node:worker_threads";
import { expect, it } from "vitest";
import { contender } from "../../tests/support/storage-process.ts";
import { home, open, sale, watch, fold } from "../../tests/support/storage-rig.ts";
import { journalKept, journalReader } from "./journal-store.ts";
import { shop } from "../../tests/support/shop.ts";
import { journalTexts } from "../texts/journal.texts.ts";

it.each(["same", "alias", "worker", "maintenance", "reader"])(
  "keeps exclusion after a rejected %s and rejects a subsequent process without a sequence gap",
  async mode => {
    const root = home();
    const file = join(root, "journal.sqlite");
    const alias = join(root, "alias.sqlite");
    const owner = open(file);
    const state = watch(owner);
    owner.append(sale("before"), 0);
    symlinkSync(file, alias);
    if (mode === "worker") {
      const code = `
        import { parentPort } from 'node:worker_threads';
        import { SqliteJournal } from '${new URL("./journal-store.ts", import.meta.url).href}';
        import { shop } from '${new URL("../../tests/support/shop.ts", import.meta.url).href}';
        try { new SqliteJournal(${JSON.stringify(file)}, shop).close(); parentPort.postMessage('opened'); }
        catch (error) { parentPort.postMessage(error.message); }
      `;
      const worker = new Worker(new URL(`data:text/javascript,${encodeURIComponent(code)}`));
      try {
        expect(await once(worker, "message")).toEqual([journalTexts.locked]);
        await once(worker, "exit");
      } finally {
        await worker.terminate();
      }
    } else if (mode === "reader") journalReader(file, shop).close();
    else
      expect(() => (mode === "maintenance" ? journalKept(file) : open(mode === "alias" ? alias : file))).toThrow(
        journalTexts.locked,
      );
    const child = contender(file, root, "later");
    try {
      expect(await child.next()).toBe("ready");
      child.send("open");
      const result = await child.next();
      await child.stop();
      expect(result).toBe(journalTexts.locked);
      expect(owner.append(sale("after"), 1).seq).toBe(2);
      expect(state()).toEqual(["before", "after"]);
      expect(owner.replay([], fold)).toEqual(state());
    } finally {
      await child.stop(true);
    }
  },
);
