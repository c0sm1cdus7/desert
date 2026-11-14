import { afterEach, expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync, readFileSync, renameSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { socketHouse, doorKeys } from "../../../tests/support/socket-house.ts";
import { serveHouse } from "./serve.ts";
let fixture: Awaited<ReturnType<typeof socketHouse>> | undefined;
afterEach(async () => {
  await fixture?.close();
  fixture = undefined;
});
it("rejects an overlong macOS socket path verbatim, never shortening it", async () => {
  fixture = await socketHouse("stream");
  const path = `${fixture.home}/${"ñ".repeat(60)}`;
  await expect(serveHouse(fixture.house(), path, doorKeys)).rejects.toThrow(`${path}/casa.sock`);
});
it("a closed writer cannot remove a previous socket or pid", async () => {
  fixture = await socketHouse("stream");
  const path = `${fixture.home}/casa.sock`;
  writeFileSync(path, "old socket marker");
  writeFileSync(`${fixture.home}/casa.pid`, "old pid marker");
  fixture.house().close();
  await expect(serveHouse(fixture.house(), fixture.home, doorKeys)).rejects.toThrow();
  expect(readFileSync(path, "utf8")).toBe("old socket marker");
  expect(readFileSync(`${fixture.home}/casa.pid`, "utf8")).toBe("old pid marker");
});

it("a lost writer lease cannot clean an existing socket", async () => {
  const f = await socketHouse("stream");
  const path = `${f.home}/casa.sock`;
  try {
    writeFileSync(path, "old socket marker");
    renameSync(`${f.home}/journal.sqlite.writer.sqlite`, `${f.home}/old-writer.sqlite`);
    await expect(serveHouse(f.house(), f.home, doorKeys)).rejects.toMatchObject({ name: "WriterLeaseLost" });
    expect(existsSync(path)).toBe(true);
    expect(readFileSync(path, "utf8")).toBe("old socket marker");
  } finally {
    await f.close().catch((error: unknown) => {
      expect(error).toMatchObject({ name: "WriterLeaseLost" });
    });
  }
});

it("a writer for another home cannot remove this home's socket", async () => {
  const f = await socketHouse("stream");
  const other = mkdtempSync("/tmp/casa-other-");
  const path = `${other}/casa.sock`;
  try {
    writeFileSync(path, "another house socket");
    await expect(serveHouse(f.house(), other, doorKeys)).rejects.toThrow();
    expect(existsSync(path)).toBe(true);
  } finally {
    await f.close();
    rmSync(other, { recursive: true, force: true });
  }
});

it("g02: startup failure does not claim a successfully closed house", async () => {
  fixture = await socketHouse("stream");
  mkdirSync(`${fixture.home}/casa.sock`);
  const output = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  try {
    await expect(serveHouse(fixture.house(), fixture.home, doorKeys)).rejects.toThrow();
    expect(output.mock.calls.flat().join("")).not.toContain("Casa cerrada");
  } finally {
    output.mockRestore();
  }
});
