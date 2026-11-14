import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import { SqliteJournal } from "../../src/adapters/storage/journal-store.ts";
import { shop, type ShopEvent } from "./shop.ts";

const homes: string[] = [];
const opened: { close(): void }[] = [];
export const home = () => {
  const path = mkdtempSync(join(tmpdir(), "desert-a03-"));
  homes.push(path);
  return path;
};
export const track = <T extends { close(): void }>(resource: T): T => {
  opened.push(resource);
  return resource;
};
export const open = (file: string) => track(new SqliteJournal(file, shop));
export const sale = (name: string) => shop.fact("sale-registered", { sale: name, total: 10 }, "ana");
export const fold = (names: readonly string[], event: ShopEvent): readonly string[] =>
  event.kind === "sale-registered" ? [...names, event.data.sale] : names;
export const watch = (journal: ReturnType<typeof open>, name = "sales") => {
  const state = journal.watch<readonly string[]>(name, [], fold);
  journal.restore();
  return state;
};
afterEach(() => {
  try {
    opened
      .splice(0)
      .reverse()
      .forEach(resource => resource.close());
  } finally {
    homes.splice(0).forEach(path => rmSync(path, { recursive: true, force: true }));
  }
});
