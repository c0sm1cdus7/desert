// Reuse SQLite writer exclusion while atomic private metadata preserves recovery across process exits.
import { journalTexts } from "../texts/journal.texts.ts";
import { DatabaseSync } from "node:sqlite";
import { constants, renameSync, rmSync, closeSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { isRecord } from "../fields/json-values.ts";
import {
  checkName,
  configurationLimit,
  createPrivate,
  openPrivate,
  optionalPrivate,
  readPrivate,
  writePrivate,
} from "./redemption-files.ts";
export type RedemptionPhase = "reserved" | "uncertain" | "confirmed";
export function redemptionReservation(file: string) {
  const path = `${file}.desert-redemption-lock`;
  const metadata = `${path}.recovery`;
  const database = openDatabase(path);
  try {
    database.exec(journalTexts.writerLeaseSql);
    const row: unknown = readMetadata(metadata);
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
function openDatabase(path: string) {
  // SQLite takes a filename; the caller has already reserved its private containing directory.
  const fd = openPrivate(path, constants.O_RDWR | constants.O_CREAT, configurationLimit);
  try {
    checkName(fd, path);
    const database = new DatabaseSync(path);
    try {
      checkName(fd, path);
      return database;
    } catch (error) {
      database.close();
      throw error;
    }
  } finally {
    closeSync(fd);
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
function saveMetadata(file: string, row: { path: string; attempt: string; phase: RedemptionPhase }) {
  const pending = `${file}.${randomUUID()}.pending`;
  const fd = openPrivate(pending, createPrivate, configurationLimit);
  try {
    writePrivate(fd, JSON.stringify(row), configurationLimit);
    checkName(fd, pending);
    renameSync(pending, file);
  } finally {
    closeSync(fd);
  }
}
function recoveryPhase(row: unknown): RedemptionPhase {
  if (isRecord(row) && row.phase === "confirmed") return "confirmed";
  if (isRecord(row) && row.phase === "reserved") return "reserved";
  return "uncertain";
}
