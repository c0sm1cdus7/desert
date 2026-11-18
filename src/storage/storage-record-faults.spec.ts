import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { recordFiles, storageNotices, type RecordFiles } from "./storage-notices.ts";
import { journalTexts } from "../texts/journal.texts.ts";
const warning = { name: "ventas", reason: "versión del cálculo cambiada · ñandú 🧉" };
const failure = (code: string) => Object.assign(new Error(code), { code });
const log = (home: string) => join(home, "storage-notices.jsonl");
const lines = (home: string) =>
  readFileSync(log(home), "utf8")
    .split("\n")
    .filter(line => line !== "");
/** Every way the file operations of the record can fail; the record never throws and says the first cause. */
const faults: [string, (files: RecordFiles) => Partial<RecordFiles>, string][] = [
  [
    "open fails",
    () => ({
      openSync: () => {
        throw failure("EACCES");
      },
    }),
    "EACCES",
  ],
  [
    "stat fails",
    () => ({
      fstatSync: () => {
        throw failure("EIO");
      },
    }),
    "EIO",
  ],
  [
    "write fails",
    () => ({
      writeSync: () => {
        throw failure("ENOSPC");
      },
    }),
    "ENOSPC",
  ],
  ["write moves nothing", () => ({ writeSync: () => 0 }), journalTexts.incompleteRecord],
  [
    "write fails after a first fragment",
    files => {
      let calls = 0;
      return {
        writeSync: (fd, bytes, offset) => {
          if (calls++ > 0) throw failure("EIO");
          return files.writeSync(fd, bytes, offset, 8);
        },
      };
    },
    "EIO",
  ],
  [
    "close fails after writing",
    files => ({
      closeSync: fd => {
        files.closeSync(fd);
        throw failure("EIO");
      },
    }),
    "EIO",
  ],
  [
    "close fails after another failure keeps the first cause",
    files => ({
      writeSync: () => {
        throw failure("ENOSPC");
      },
      closeSync: fd => {
        files.closeSync(fd);
        throw failure("EIO");
      },
    }),
    "ENOSPC",
  ],
];
it.each(faults)("%s: the opening goes on and says why the record was not kept", (_, fault, cause) => {
  const home = mkdtempSync(join(tmpdir(), "record-"));
  const notices = storageNotices(home, { ...recordFiles, ...fault(recordFiles) });
  expect(() => notices.warn(warning)).not.toThrow();
  expect(() => notices.warn(warning)).not.toThrow();
  expect(notices.read()).toHaveLength(2);
  expect(notices.unsaved()).toEqual([cause]);
});
it("completes a line written in short pieces, multi-byte text included", () => {
  const home = mkdtempSync(join(tmpdir(), "record-"));
  const files: RecordFiles = {
    ...recordFiles,
    writeSync: (fd, bytes, offset, length) => recordFiles.writeSync(fd, bytes, offset, Math.min(3, length)),
  };
  const notices = storageNotices(home, files);
  notices.warn(warning);
  notices.warn(warning);
  expect(notices.unsaved()).toEqual([]);
  expect(lines(home).map((line): unknown => JSON.parse(line))).toEqual([
    { code: journalTexts.rebuildCode, ...warning },
    { code: journalTexts.rebuildCode, ...warning },
  ]);
});
it("starts on its own line after a fragment an earlier opening left cut", () => {
  const home = mkdtempSync(join(tmpdir(), "record-"));
  let cut = true;
  const files: RecordFiles = {
    ...recordFiles,
    writeSync: (fd, bytes, offset, length) => {
      if (!cut) return recordFiles.writeSync(fd, bytes, offset, length);
      cut = false;
      recordFiles.writeSync(fd, bytes, offset, 8);
      throw failure("EIO");
    },
  };
  const first = storageNotices(home, files);
  first.warn(warning);
  expect(first.unsaved()).toEqual(["EIO"]);
  const second = storageNotices(home, files);
  second.warn(warning);
  expect(second.unsaved()).toEqual([]);
  const [fragment, whole, ...rest] = lines(home);
  expect(fragment).toBe(`{"code":`);
  expect(JSON.parse(whole ?? "")).toEqual({ code: journalTexts.rebuildCode, ...warning });
  expect(rest).toEqual([]);
});
