import { redemptionHome } from "../../tests/support/redemption-home.ts";
import { everySaid } from "../fields/phrases.ts";
// One-shot filesystem hooks replace checked names deterministically, without load races or real credentials.
import { afterEach, expect, it, vi } from "vitest";
import {
  constants,
  chownSync,
  existsSync,
  fstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { reserveDestination } from "./redemption-destination.ts";
import { redeemToFile } from "./redeem-door.ts";
import { doorTexts } from "../texts/doors.texts.ts";
import { isRecord } from "../fields/json-values.ts";
const hooks = vi.hoisted(() => {
  const state: {
    afterStat?: ((fd: number, path: string) => void) | undefined;
    foreignOwner?: string | undefined;
    specialMode?: string | undefined;
    opens: { path: string; flags: number | string }[];
    reads: number[];
    paths: Map<number, string>;
  } = { opens: [], reads: [], paths: new Map() };
  return state;
});
vi.mock("node:fs", async importOriginal => {
  const fs = await importOriginal<typeof import("node:fs")>();
  return {
    ...fs,
    openSync: vi.fn((...args: Parameters<typeof fs.openSync>) => {
      const fd = fs.openSync(...args);
      const path = String(args[0]);
      hooks.paths.set(fd, path);
      hooks.opens.push({ path, flags: args[1] });
      return fd;
    }),
    fstatSync: vi.fn((fd: number) => {
      const stat = fs.fstatSync(fd);
      const path = hooks.paths.get(fd) ?? "";
      hooks.afterStat?.(fd, path);
      if (path === hooks.foreignOwner) stat.uid += 1;
      if (path === hooks.specialMode) stat.mode |= 0o4000;
      return stat;
    }),
    readSync: vi.fn((fd: number, buffer: Buffer, offset: number, length: number, position: number) => {
      hooks.reads.push(fd);
      return fs.readSync(fd, buffer, offset, length, position);
    }),
  };
});
const homes: string[] = [];
const material = "f".repeat(43);
function setup() {
  const home = redemptionHome("/tmp/desert-descriptors-");
  homes.push(home);
  const file = join(home, "destination");
  const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ key: material }))));
  vi.stubGlobal("fetch", send);
  return { home, file, send };
}
function recovery(home: string) {
  const name = readdirSync(home).find(name => /^\.desert-redemption-[a-f0-9-]+$/.test(name));
  if (!name) throw new Error("Missing recovery fixture");
  return join(home, name);
}
afterEach(() => {
  hooks.afterStat = undefined;
  hooks.foreignOwner = undefined;
  hooks.specialMode = undefined;
  hooks.opens = [];
  hooks.reads = [];
  hooks.paths.clear();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
it.each(["destination", "recovery", "directory"])("rejects a foreign %s owner using descriptor stat", async kind => {
  const { home, file, send } = setup();
  let suspect = file;
  if (kind === "recovery") {
    const reserved = reserveDestination({ file });
    reserved.prepare();
    reserved.close();
    suspect = recovery(home);
  } else if (kind === "destination") writeFileSync(file, "{}", { mode: 0o600 });
  else suspect = home;
  const stat = statSync(suspect);
  try {
    chownSync(suspect, stat.uid + 1, stat.gid);
  } catch (error) {
    if (!isRecord(error) || (error.code !== "EPERM" && error.code !== "EACCES")) throw error;
    hooks.foreignOwner = suspect;
  }
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" })).rejects.toThrow(
    kind === "recovery" ? everySaid(doorTexts.unsafeRecovery) : everySaid(doorTexts.destination),
  );
  expect(send).not.toHaveBeenCalled();
  expect(existsSync(suspect)).toBe(true);
});
it.each(["destination", "recovery"])("does not read a replacement %s after fstat", async kind => {
  const { home, file, send } = setup();
  let path = file;
  if (kind === "recovery") {
    const reserved = reserveDestination({ file });
    reserved.prepare();
    reserved.close();
    path = recovery(home);
  } else writeFileSync(file, "{}", { mode: 0o600 });
  hooks.opens = [];
  hooks.reads = [];
  let checked = -1;
  hooks.afterStat = (fd, name) => {
    if (name !== path) return;
    hooks.afterStat = undefined;
    checked = fd;
    renameSync(path, `${path}.checked`);
    writeFileSync(path, material, { mode: 0o600 });
  };
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" })).rejects.toThrow();
  expect(checked >= 0).toBe(true);
  expect(send).not.toHaveBeenCalled();
  expect(readFileSync(path, "utf8") === material).toBe(true);
  expect(hooks.opens.filter(open => open.path === path)).toHaveLength(1);
  expect(hooks.reads.filter(fd => hooks.paths.get(fd) === path).every(fd => fd === checked)).toBe(true);
});
it.each(["regular", "symlink"])("keeps a %s replacement recovery untouched between resume and prepare", kind => {
  const { home, file } = setup();
  const first = reserveDestination({ file });
  const candidate = first.prepare();
  first.close();
  const path = recovery(home);
  const resumed = reserveDestination({ file });
  renameSync(path, `${path}.checked`);
  if (kind === "regular") writeFileSync(path, material, { mode: 0o600 });
  else {
    writeFileSync(`${path}.foreign`, material, { mode: 0o600 });
    symlinkSync(`${path}.foreign`, path);
  }
  try {
    expect(() => resumed.prepare()).toThrow(everySaid(doorTexts.unsafeRecovery));
    expect(readFileSync(path, "utf8") === material).toBe(true);
    expect(readFileSync(`${path}.checked`, "utf8").trim() === candidate).toBe(true);
  } finally {
    resumed.close();
  }
  expect(existsSync(path)).toBe(true);
});
it.each([false, true])("rejects a replaced recovery before saving (configuration=%s)", async configuration => {
  const { home, file } = setup();
  let path = "";
  vi.stubGlobal("fetch", () => {
    path = recovery(home);
    renameSync(path, `${path}.checked`);
    writeFileSync(path, "unrelated", { mode: 0o600 });
    return Promise.resolve(new Response(JSON.stringify({ key: material })));
  });
  await expect(
    redeemToFile("http://localhost", "ABCD-2345", { file, ...(configuration ? { name: "house" } : {}) }),
  ).rejects.toThrow();
  expect(readFileSync(path, "utf8") === "unrelated").toBe(true);
  expect(existsSync(file)).toBe(false);
});
it("rejects a replaced publication before writing material", async () => {
  const { file } = setup();
  let replacement = "";
  hooks.afterStat = (_fd, path) => {
    if (!path.endsWith(".publish")) return;
    hooks.afterStat = undefined;
    replacement = path;
    renameSync(path, `${path}.checked`);
    writeFileSync(path, "unrelated", { mode: 0o600 });
  };
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" })).rejects.toThrow();
  expect(replacement.length > 0).toBe(true);
  expect(readFileSync(replacement, "utf8") === "unrelated").toBe(true);
  expect(readFileSync(`${replacement}.checked`, "utf8").length).toBe(0);
  expect(existsSync(file)).toBe(false);
});
it("rejects a containing directory replaced after its stat", async () => {
  const { home, send } = setup();
  const directory = join(home, "private");
  mkdirSync(directory, { mode: 0o700 });
  hooks.afterStat = (_fd, path) => {
    if (path !== directory) return;
    hooks.afterStat = undefined;
    renameSync(path, `${path}.checked`);
    mkdirSync(path, { mode: 0o700 });
  };
  await expect(
    redeemToFile("http://localhost", "ABCD-2345", { file: join(directory, "destination") }),
  ).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
  expect(readdirSync(directory)).toHaveLength(0);
});
it("uses no-follow descriptors for every explicit opening, including publication and metadata", async () => {
  const { file } = setup();
  writeFileSync(file, "{}", { mode: 0o600 });
  await redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" });
  expect(hooks.opens.some(open => open.path.endsWith(".publish"))).toBe(true);
  expect(hooks.opens.every(open => typeof open.flags === "number" && (open.flags & constants.O_NOFOLLOW) !== 0)).toBe(
    true,
  );
  expect(fstatSync).toHaveBeenCalled();
});

// This filesystem strips setuid on chmod; the descriptor stat hook supplies the unsupported mode.
it.each(["destination", "recovery"])("rejects special mode bits on %s by descriptor", async kind => {
  const { home, file, send } = setup();
  let suspect = file;
  if (kind === "recovery") {
    const reserved = reserveDestination({ file });
    reserved.prepare();
    reserved.close();
    suspect = recovery(home);
  } else writeFileSync(file, "{}", { mode: 0o600 });
  hooks.specialMode = suspect;
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file, name: "house" })).rejects.toThrow(
    kind === "recovery" ? everySaid(doorTexts.unsafeRecovery) : everySaid(doorTexts.destination),
  );
  expect(send).not.toHaveBeenCalled();
  expect(existsSync(suspect)).toBe(true);
});
