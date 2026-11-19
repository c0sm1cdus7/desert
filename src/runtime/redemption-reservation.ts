// Reuse SQLite writer exclusion while atomic private metadata preserves recovery across process exits.
import { journalTexts } from "../texts/journal.texts.ts";
import { redemptionDatabase } from "./redemption-sqlite.ts";
import { renameSync, rmSync, closeSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isRecord } from "../fields/json-values.ts";
import {
  checkName,
  configurationLimit,
  createPrivate,
  openPrivate,
  optionalPrivate,
  readPrivate,
  removeChecked,
  writePrivate,
} from "./redemption-files.ts";
export type RedemptionPhase = "reserved" | "uncertain" | "confirmed";
export function redemptionReservation(file: string, checkDirectory: () => void) {
  const path = `${file}.desert-redemption-lock`;
  const metadata = `${path}.recovery`;
  const database = redemptionDatabase(path, checkDirectory);
  try {
    database.exec(journalTexts.redemptionRecoverySql, true);
    database.exec(journalTexts.redemptionLeaseSql);
    database.exec(journalTexts.redemptionWriterSql);
    const row: unknown = readMetadata(metadata);
    return {
      check: database.check,
      recovery: isRecord(row) && typeof row.path === "string" ? row.path : undefined,
      attempt: isRecord(row) && typeof row.attempt === "string" ? row.attempt : undefined,
      phase: recoveryPhase(row),
      record(path: string, attempt: string, phase: RedemptionPhase = "reserved") {
        database.check();
        saveMetadata(metadata, { path, attempt, phase }, checkDirectory);
        database.check();
      },
      clear() {
        database.check();
        rmSync(metadata, { force: true });
        database.check();
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
function readMetadata(file: string): unknown {
  const fd = optionalPrivate(file, configurationLimit);
  if (fd === undefined) return undefined;
  try {
    const row: unknown = JSON.parse(readPrivate(fd, configurationLimit));
    checkName(fd, file);
    return row;
  } finally {
    closeSync(fd);
  }
}
function saveMetadata(
  file: string,
  row: { path: string; attempt: string; phase: RedemptionPhase },
  checkDirectory: () => void,
) {
  const pending = `${file}.${randomUUID()}.pending`;
  const fd = openPrivate(pending, createPrivate, configurationLimit);
  try {
    writePrivate(fd, JSON.stringify(row), configurationLimit);
    checkName(fd, pending);
    checkDirectory();
    renameSync(pending, file);
    checkName(fd, file);
    checkDirectory();
  } catch (error) {
    removeChecked(fd, file, checkDirectory);
    throw error;
  } finally {
    removeChecked(fd, pending, checkDirectory);
    closeSync(fd);
  }
}
function recoveryPhase(row: unknown): RedemptionPhase {
  if (isRecord(row) && row.phase === "confirmed") return "confirmed";
  if (isRecord(row) && row.phase === "reserved") return "reserved";
  return "uncertain";
}
