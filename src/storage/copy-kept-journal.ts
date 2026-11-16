// Kept evidence is closed and immutable. Open only its private copy, never SQLite beside the original.
import { chmodSync, copyFileSync, existsSync } from "node:fs";
import { privateFileMode } from "./home.ts";
export function copyKeptJournal(source: string, target: string): void {
  copyFileSync(source, target);
  chmodSync(target, privateFileMode);
  // A conserved WAL is evidence too; SQLite rebuilds its shared-memory index beside the disposable copy.
  if (existsSync(`${source}-wal`)) {
    copyFileSync(`${source}-wal`, `${target}-wal`);
    chmodSync(`${target}-wal`, privateFileMode);
  }
}
