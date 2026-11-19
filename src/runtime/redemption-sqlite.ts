// SQLite reopens names natively. Check the pinned database and sidecars before any SQL or recovery material.
import { DatabaseSync } from "node:sqlite";
import { closeSync, constants, fstatSync, lstatSync } from "node:fs";
import { isRecord } from "../fields/json-values.ts";
import { checkName, checkPrivate, configurationLimit, openPrivate, optionalPrivate } from "./redemption-files.ts";

function auxiliaries(path: string) {
  const opened = new Map<string, number>();
  const check = (retired = false) => {
    for (const suffix of ["-wal", "-shm", "-journal"]) {
      const name = `${path}${suffix}`;
      const previous = opened.get(name);
      if (previous !== undefined && retired && retiredAuxiliary(previous, name)) {
        closeSync(previous);
        opened.delete(name);
        continue;
      }
      if (previous !== undefined) {
        checkPrivate(previous, configurationLimit);
        checkName(previous, name);
      } else {
        const fd = optionalPrivate(name, configurationLimit);
        if (fd !== undefined) {
          opened.set(name, fd);
          checkName(fd, name);
        }
      }
    }
  };
  return {
    check,
    close: () => {
      for (const fd of opened.values()) closeSync(fd);
      opened.clear();
    },
  };
}

export function redemptionDatabase(path: string, checkDirectory: () => void) {
  checkDirectory();
  const fd = openPrivate(path, constants.O_RDWR | constants.O_CREAT, configurationLimit);
  const sidecars = auxiliaries(path);
  let database: DatabaseSync | undefined;
  const check = (retired = false) => {
    checkDirectory();
    checkPrivate(fd, configurationLimit);
    checkName(fd, path);
    sidecars.check(retired);
  };
  const release = () => {
    sidecars.close();
    closeSync(fd);
  };
  try {
    check();
    database = new DatabaseSync(path);
    check();
    return checkedDatabase(database, check, release);
  } catch (error) {
    try {
      database?.close();
    } finally {
      release();
    }
    throw error;
  }
}
function checkedDatabase(database: DatabaseSync, check: (retired?: boolean) => void, release: () => void) {
  return {
    exec(sql: string, retired = false) {
      check();
      database.exec(sql);
      check(retired);
    },
    check: () => check(),
    close() {
      try {
        try {
          check();
        } finally {
          database.close();
        }
        check(true);
      } finally {
        release();
      }
    },
  };
}

// SQLite may retire a hot journal during recovery, or sidecars at close. A replacement is never retirement.
function retiredAuxiliary(fd: number, path: string) {
  if (fstatSync(fd).nlink !== 0) return false;
  try {
    lstatSync(path);
    return false;
  } catch (error) {
    if (isRecord(error) && error.code === "ENOENT") return true;
    throw error;
  }
}
