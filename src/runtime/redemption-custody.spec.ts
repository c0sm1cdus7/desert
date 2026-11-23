import { redemptionHome } from "../../tests/support/redemption-home.ts";
import { everySaid } from "../fields/phrases.ts";
// Reject unsafe local custody before contacting a house and preserve suspect recovery for its owner.
import { afterEach, expect, it, vi } from "vitest";
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { redeemToFile } from "./redeem-door.ts";
import { reserveDestination } from "./redemption-destination.ts";
import { doorTexts } from "../texts/doors.texts.ts";
const homes: string[] = [];
const material = "f".repeat(43);
function setup() {
  const home = redemptionHome("/tmp/desert-custody-");
  homes.push(home);
  const file = join(home, "destination");
  const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ key: material }))));
  vi.stubGlobal("fetch", send);
  return { home, file, send };
}
afterEach(() => {
  vi.unstubAllGlobals();
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
function corrupt(path: string, mode: string, limit = 1_048_576) {
  if (mode === "symlink" || mode === "dangling") {
    renameSync(path, `${path}.original`);
    symlinkSync(mode === "symlink" ? `${path}.original` : `${path}.absent`, path);
  } else if (mode === "hardlink") linkSync(path, `${path}.other`);
  else if (mode === "directory") {
    rmSync(path);
    mkdirSync(path, { mode: 0o700 });
  } else if (mode === "oversized") writeFileSync(path, "x".repeat(limit + 1));
  else if (mode === "content") writeFileSync(path, "not-a-candidate");
  else if (mode === "fifo") {
    rmSync(path);
    expect(spawnSync("mkfifo", ["-m", "600", path], { env: {} }).status).toBe(0);
  } else chmodSync(path, Number.parseInt(mode, 8));
}
it.each(["symlink", "dangling", "hardlink", "directory", "fifo", "oversized", "644", "660", "604"])(
  "rejects a %s destination before sending anything",
  async mode => {
    const { file, send } = setup();
    writeFileSync(file, JSON.stringify({ synthetic: material }), { mode: 0o600 });
    corrupt(file, mode);
    let message = "";
    try {
      await redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" });
    } catch (error) {
      message = error instanceof Error ? error.message : "unknown";
    }
    expect(message).toBe(everySaid(doorTexts.destination));
    expect(message.includes(material)).toBe(false);
    expect(send).not.toHaveBeenCalled();
  },
);
it.each(["symlink", "dangling", "hardlink", "directory", "fifo", "content", "oversized", "644", "660", "604"])(
  "retains a %s recovery and explains how to repair it before sending",
  async mode => {
    const { home, file, send } = setup();
    const destination = reserveDestination({ file });
    const candidate = destination.prepare();
    destination.close();
    const recovery = readdirSync(home).find(name => /^\.desert-redemption-[a-f0-9-]+$/.test(name));
    if (!recovery) throw new Error("Missing recovery fixture");
    const path = join(home, recovery);
    corrupt(path, mode, 44);
    let message = "";
    try {
      await redeemToFile("http://localhost", "ABCD-2345", { file });
    } catch (error) {
      message = error instanceof Error ? error.message : "unknown";
    }
    expect(message).toBe(everySaid(doorTexts.unsafeRecovery));
    expect(message.includes(candidate) || message.includes(material)).toBe(false);
    expect(lstatSync(path).isSymbolicLink()).toBe(mode === "symlink" || mode === "dangling");
    expect(existsSync(`${file}.desert-redemption-lock.recovery`)).toBe(true);
    expect(send).not.toHaveBeenCalled();
  },
);
it.each(["symlink", "722", "702", "770"])("rejects a %s containing directory before reserving", async mode => {
  const { home, send } = setup();
  const directory = join(home, "private");
  mkdirSync(directory, { mode: 0o700 });
  if (mode === "symlink") {
    renameSync(directory, `${directory}.original`);
    symlinkSync(`${directory}.original`, directory);
  } else chmodSync(directory, Number.parseInt(mode, 8));
  const file = join(directory, "destination");
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(
    everySaid(doorTexts.destination),
  );
  expect(send).not.toHaveBeenCalled();
  expect(readdirSync(directory)).toHaveLength(0);
});
it("does not remove an empty recovery with unsafe permissions", () => {
  const { home, file } = setup();
  const destination = reserveDestination({ file });
  destination.prepare();
  destination.close();
  const recovery = readdirSync(home).find(name => /^\.desert-redemption-[a-f0-9-]+$/.test(name));
  if (!recovery) throw new Error("Missing recovery fixture");
  const path = join(home, recovery);
  writeFileSync(path, "");
  chmodSync(path, 0o644);
  expect(() => reserveDestination({ file })).toThrow(everySaid(doorTexts.unsafeRecovery));
  expect(existsSync(path)).toBe(true);
  expect(existsSync(`${file}.desert-redemption-lock.recovery`)).toBe(true);
});
it("refuses a recovery path outside the verified directory", () => {
  const { home, file } = setup();
  const other = join(home, "other");
  mkdirSync(other, { mode: 0o700 });
  const outside = join(other, ".desert-redemption-abcd");
  writeFileSync(outside, `${material}\n`, { mode: 0o600 });
  writeFileSync(`${file}.desert-redemption-lock.recovery`, JSON.stringify({ path: outside }), { mode: 0o600 });
  expect(() => reserveDestination({ file })).toThrow(everySaid(doorTexts.unsafeRecovery));
  expect(readFileSync(outside, "utf8").trim() === material).toBe(true);
});
it.each(["symlink", "hardlink", "644", "oversized"])("does not trust %s recovery metadata", mode => {
  const { file } = setup();
  const metadata = `${file}.desert-redemption-lock.recovery`;
  writeFileSync(metadata, "{}", { mode: 0o600 });
  corrupt(metadata, mode);
  expect(() => reserveDestination({ file })).toThrow(everySaid(doorTexts.destination));
  expect(lstatSync(metadata).isSymbolicLink()).toBe(mode === "symlink");
});
it("clears recovery metadata so another name can be added to the same configuration", async () => {
  const { home, file, send } = setup();
  await redeemToFile("http://localhost", "ABCD-2345", { file, name: "first" });
  await redeemToFile("http://localhost", "EFGH-6789", { file, name: "second" });
  expect(send).toHaveBeenCalledTimes(2);
  expect(readFileSync(file, "utf8").includes('"first"')).toBe(true);
  expect(readFileSync(file, "utf8").includes('"second"')).toBe(true);
  expect(readdirSync(home).some(name => name.startsWith(".desert-redemption-"))).toBe(false);
  expect(existsSync(`${file}.desert-redemption-lock.recovery`)).toBe(false);
});
it("retires only a verified empty recovery and leaves no stale metadata on a destination conflict", () => {
  const { home, file } = setup();
  const first = reserveDestination({ file });
  first.prepare();
  first.close();
  const recovery = readdirSync(home).find(name => /^\.desert-redemption-[a-f0-9-]+$/.test(name));
  if (!recovery) throw new Error("Missing recovery fixture");
  const path = join(home, recovery);
  writeFileSync(path, "");
  writeFileSync(file, "editor", { mode: 0o600 });
  expect(() => reserveDestination({ file })).toThrow(everySaid(doorTexts.destination));
  expect(existsSync(path)).toBe(false);
  expect(existsSync(`${file}.desert-redemption-lock.recovery`)).toBe(false);
  rmSync(file);
  const resumed = reserveDestination({ file });
  try {
    expect(resumed.prepare().length).toBe(43);
  } finally {
    resumed.close();
  }
});
