// Reuse SQLite writer exclusion while atomic private metadata preserves recovery across process exits.
import { journalTexts } from "../texts/journal.texts.ts";
import { DatabaseSync } from "node:sqlite";
import {
  chmodSync,
  lstatSync,
  readFileSync,
  writeFileSync,
  renameSync,
  rmSync,
  openSync,
  fsyncSync,
  closeSync,
} from "node:fs";
import { isRecord } from "../fields/json-values.ts";
function regular(file: string) {
  const stat = lstatSync(file, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || stat.isSymbolicLink() || stat.nlink !== 1)) throw new Error("reservation-path");
  return stat;
}
export type RedemptionPhase = "reserved" | "uncertain" | "confirmed";
export function redemptionReservation(file: string) {
  const path = `${file}.desert-redemption-lock`;
  const metadata = `${path}.recovery`;
  regular(path);
  const database = new DatabaseSync(path);
  try {
    chmodSync(path, 0o600);
    database.exec(journalTexts.writerLeaseSql);
    const row: unknown = regular(metadata) ? JSON.parse(readFileSync(metadata, "utf8")) : undefined;
    return {
      recovery: isRecord(row) && typeof row.path === "string" ? row.path : undefined,
      attempt: isRecord(row) && typeof row.attempt === "string" ? row.attempt : undefined,
      phase: recoveryPhase(row),
      record(path: string, attempt: string, phase: RedemptionPhase = "reserved") {
        saveMetadata(metadata, { path, attempt, phase });
      },
      clear() {
        rmSync(metadata, { force: true });
      },
      close() {
        database.close();
      },
    };
  } catch (error) {
    database.close();
    throw error;
  }
}
function saveMetadata(file: string, row: { path: string; attempt: string; phase: RedemptionPhase }) {
  const pending = `${file}.pending`;
  regular(pending);
  rmSync(pending, { force: true });
  writeFileSync(pending, JSON.stringify(row), { mode: 0o600, flag: "wx" });
  const fd = openSync(pending, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(pending, file);
}

function recoveryPhase(row: unknown): RedemptionPhase {
  if (isRecord(row) && row.phase === "confirmed") return "confirmed";
  if (isRecord(row) && row.phase === "reserved") return "reserved";
  return "uncertain";
}
