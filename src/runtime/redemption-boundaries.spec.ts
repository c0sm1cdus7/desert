// Fictitious files and one-shot hooks cover the final name-operation boundaries, without load or extraction.
import { afterEach, expect, it, vi } from "vitest";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { redemptionHome } from "../../tests/support/redemption-home.ts";
import { redeemToFile } from "./redeem-door.ts";
import { reserveDestination } from "./redemption-destination.ts";
import { doorTexts } from "../texts/doors.texts.ts";
const hooks = vi.hoisted(() => {
  const state: {
    beforePublish?: ((source: string, target: string) => void) | undefined;
    afterPublish?: ((source: string, target: string) => void) | undefined;
    beforeDatabase?: ((path: string) => void) | undefined;
    afterSql?: (() => void) | undefined;
    foreign?: string | undefined;
    paths: Map<number, string>;
    sql: number;
  } = { paths: new Map(), sql: 0 };
  return state;
});
vi.mock("node:fs", async original => {
  const fs = await original<typeof import("node:fs")>();
  return {
    ...fs,
    openSync: (...args: Parameters<typeof fs.openSync>) => {
      const fd = fs.openSync(...args);
      hooks.paths.set(fd, String(args[0]));
      return fd;
    },
    fstatSync: (fd: number) => {
      const stat = fs.fstatSync(fd);
      if (hooks.paths.get(fd) === hooks.foreign) stat.uid += 1;
      return stat;
    },
    linkSync: (source: string, target: string) => {
      hooks.beforePublish?.(source, target);
      fs.linkSync(source, target);
      hooks.afterPublish?.(source, target);
    },
    renameSync: (source: string, target: string) => {
      hooks.beforePublish?.(source, target);
      fs.renameSync(source, target);
      hooks.afterPublish?.(source, target);
    },
  };
});
vi.mock("node:sqlite", async original => {
  const sqlite = await original<typeof import("node:sqlite")>();
  return {
    ...sqlite,
    DatabaseSync: class extends sqlite.DatabaseSync {
      constructor(path: string) {
        hooks.beforeDatabase?.(path);
        super(path);
      }
      override exec(sql: string) {
        hooks.sql++;
        super.exec(sql);
        hooks.afterSql?.();
      }
    },
  };
});
const homes: string[] = [];
function setup() {
  const home = redemptionHome("/tmp/desert-boundaries-");
  homes.push(home);
  const file = join(home, "destination");
  const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ key: "f".repeat(43) }))));
  vi.stubGlobal("fetch", send);
  return { home, file, send };
}
afterEach(() => {
  hooks.beforePublish = undefined;
  hooks.afterPublish = undefined;
  hooks.beforeDatabase = undefined;
  hooks.afterSql = undefined;
  hooks.foreign = undefined;
  hooks.paths.clear();
  hooks.sql = 0;
  vi.unstubAllGlobals();
  homes.splice(0).forEach(home => rmSync(home, { recursive: true, force: true }));
});
it.each(["group", "other", "link", "foreign"])(
  "rejects a %s ancestor before reserving or contacting the house",
  async kind => {
    const { home, send } = setup();
    const ancestor = join(home, "ancestor"),
      leaf = join(ancestor, "leaf");
    mkdirSync(leaf, { recursive: true, mode: 0o700 });
    if (kind === "link") {
      renameSync(ancestor, `${ancestor}.original`);
      symlinkSync(`${ancestor}.original`, ancestor);
    } else if (kind === "foreign") hooks.foreign = ancestor;
    else chmodSync(ancestor, kind === "group" ? 0o770 : 0o702);
    await expect(redeemToFile("http://localhost", "ABCD-2345", { file: join(leaf, "destination") })).rejects.toThrow(
      doorTexts.destination,
    );
    expect(send).not.toHaveBeenCalled();
    expect(hooks.sql).toBe(0);
    expect(readdirSync(leaf)).toEqual([]);
  },
);
it.each(["group", "link", "foreign"])("checks HOME itself (%s)", async kind => {
  const { home, file, send } = setup();
  if (kind === "group") chmodSync(home, 0o770);
  if (kind === "foreign") hooks.foreign = home;
  if (kind === "link") {
    const alias = `${home}.alias`;
    symlinkSync(home, alias);
    homes.push(alias);
    vi.stubEnv("HOME", alias);
  }
  const target = kind === "link" ? join(`${home}.alias`, "destination") : file;
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file: target })).rejects.toThrow(doorTexts.destination);
  expect(send).not.toHaveBeenCalled();
});
it("refuses a private destination outside HOME and says that is the reason", async () => {
  const { home, file, send } = setup();
  const inner = join(home, "home");
  mkdirSync(inner, { mode: 0o700 });
  vi.stubEnv("HOME", inner);
  // The destination folder itself is private (0700, own user): the refusal is only about being outside HOME.
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.outsideHome);
  expect(send).not.toHaveBeenCalled();
});
it("accepts a private HOME through the controlled system tmp alias", async () => {
  const { home, file } = setup();
  vi.stubEnv("HOME", home.replace(/^\/private\/tmp\//, "/tmp/"));
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).resolves.toBeUndefined();
});
it.each(["link", "configuration", "metadata"])("rejects substitution just before %s publication", async kind => {
  const { file, send } = setup();
  let replaced = false;
  hooks.beforePublish = (source, target) => {
    if (kind === "metadata" ? !target.endsWith(".recovery") : target !== file) return;
    hooks.beforePublish = undefined;
    renameSync(source, `${source}.checked`);
    writeFileSync(source, "unrelated", { mode: 0o600 });
    replaced = true;
  };
  const target = { file, ...(kind === "configuration" ? { name: "house" } : {}) };
  await expect(redeemToFile("http://localhost", "ABCD-2345", target)).rejects.toThrow();
  expect(replaced).toBe(true);
  if (kind === "metadata") expect(send).not.toHaveBeenCalled();
  else expect(readFileSync(file, "utf8")).toBe("unrelated");
});
it.each([false, true])("rejects substitution immediately after publication (configuration=%s)", async configuration => {
  const { file } = setup();
  hooks.afterPublish = (_source, target) => {
    if (target !== file) return;
    hooks.afterPublish = undefined;
    renameSync(target, `${target}.checked`);
    writeFileSync(target, "unrelated", { mode: 0o600 });
  };
  await expect(
    redeemToFile("http://localhost", "ABCD-2345", { file, ...(configuration ? { name: "house" } : {}) }),
  ).rejects.toThrow();
  expect(readFileSync(file, "utf8")).toBe("unrelated");
});
it("rejects substitution between the last check and native SQLite reopen before SQL or material", async () => {
  const { file, send, home } = setup();
  hooks.beforeDatabase = path => {
    hooks.beforeDatabase = undefined;
    renameSync(path, `${path}.checked`);
    writeFileSync(path, "", { mode: 0o600 });
  };
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.destination);
  expect(hooks.sql).toBe(0);
  expect(send).not.toHaveBeenCalled();
  expect(readdirSync(home).some(name => name.startsWith(".desert-redemption-"))).toBe(false);
});
for (const suffix of ["-wal", "-shm", "-journal"])
  it.each(["linked", "foreign", "writable"])(`rejects a %s SQLite ${suffix} before native reopen`, async kind => {
    const { home, file, send } = setup();
    const auxiliary = `${file}.desert-redemption-lock${suffix}`;
    const harmless = join(home, "harmless");
    writeFileSync(harmless, "", { mode: 0o600 });
    if (kind === "linked") symlinkSync(harmless, auxiliary);
    else writeFileSync(auxiliary, "", { mode: kind === "writable" ? 0o660 : 0o600 });
    if (kind === "foreign") hooks.foreign = auxiliary;
    const opened = vi.fn();
    hooks.beforeDatabase = opened;
    await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.destination);
    expect(opened).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(readFileSync(harmless, "utf8")).toBe("");
  });
it.each(["-wal", "-shm", "-journal"])("checks %s again after native reopen and before SQL", async suffix => {
  const { home, file, send } = setup();
  const harmless = join(home, "harmless");
  writeFileSync(harmless, "", { mode: 0o600 });
  hooks.beforeDatabase = path => {
    symlinkSync(harmless, `${path}${suffix}`);
  };
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.destination);
  expect(hooks.sql).toBe(0);
  expect(send).not.toHaveBeenCalled();
});
it("checks newly created journal ownership after SQL and before recovery material", () => {
  const { file, send, home } = setup();
  hooks.afterSql = () => {
    hooks.foreign = `${file}.desert-redemption-lock-journal`;
  };
  expect(() => reserveDestination({ file })).toThrow(doorTexts.destination);
  expect(hooks.sql).toBe(2);
  expect(send).not.toHaveBeenCalled();
  expect(existsSync(file)).toBe(false);
  expect(readdirSync(home).some(name => name.startsWith(".desert-redemption-"))).toBe(false);
});

it.each([undefined, "relative-home"])("requires an explicit absolute HOME (%s)", async home => {
  const { file, send } = setup();
  vi.stubEnv("HOME", home);
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.destination);
  expect(send).not.toHaveBeenCalled();
});
it.each(["-wal", "-shm", "-journal"])("pins a preexisting %s identity across SQLite reopen", async suffix => {
  const { file, send } = setup();
  const auxiliary = `${file}.desert-redemption-lock${suffix}`;
  writeFileSync(auxiliary, "", { mode: 0o600 });
  hooks.beforeDatabase = () => {
    renameSync(auxiliary, `${auxiliary}.checked`);
    writeFileSync(auxiliary, "", { mode: 0o600 });
  };
  await expect(redeemToFile("http://localhost", "ABCD-2345", { file })).rejects.toThrow(doorTexts.destination);
  expect(hooks.sql).toBe(0);
  expect(send).not.toHaveBeenCalled();
});
it("rechecks a pinned ancestor before returning the reserved candidate", () => {
  const { home } = setup();
  const ancestor = join(home, "ancestor"),
    directory = join(ancestor, "leaf");
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const destination = reserveDestination({ file: join(directory, "destination") });
  renameSync(ancestor, `${ancestor}.checked`);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    expect(() => destination.prepare()).toThrow(doorTexts.unsafeRecovery);
    expect(readdirSync(directory)).toEqual([]);
  } finally {
    expect(() => destination.close()).toThrow();
  }
});
