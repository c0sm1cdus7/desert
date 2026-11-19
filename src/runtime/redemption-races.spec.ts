// Deterministic barriers reproduce lost updates and destination failures before consuming invitations.
import { afterEach, expect, it, vi } from "vitest";
import {
  readdirSync,
  statSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  symlinkSync,
} from "node:fs";
import { join } from "node:path";
import { doorHouse, invitationCode } from "../../tests/support/door-house.ts";
import { isRecord } from "../fields/json-values.ts";
import { redeemToFile } from "./redeem-door.ts";
const opened: ReturnType<typeof doorHouse>[] = [];
afterEach(() => {
  vi.unstubAllGlobals();
  opened.splice(0).forEach(h => h.close());
});
function setup() {
  const h = doorHouse();
  opened.push(h);
  return h;
}
const address = "http://127.0.0.1";
it.each(["missing", "readonly", "existing", "symlink"])(
  "keeps the invitation usable for a %s destination",
  async mode => {
    const h = setup(),
      directory = join(h.home, "destination");
    if (mode !== "missing") mkdirSync(directory);
    const file = join(directory, "credential");
    if (mode === "readonly") chmodSync(directory, 0o500);
    if (mode === "existing") writeFileSync(file, "previous");
    if (mode === "symlink") symlinkSync(join(h.home, "absent"), file);
    const code = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
    const before = h.house().tools.state().house.doors.keys.size;
    const send = vi.fn(() => Promise.resolve(new Response(JSON.stringify(h.access().redeem(code)))));
    vi.stubGlobal("fetch", send);
    try {
      await expect(redeemToFile(address, code, { file })).rejects.toThrow();
      expect(send).not.toHaveBeenCalled();
      expect(h.house().tools.state().house.doors.keys.size).toBe(before);
      expect(h.access().redeem(code).status).toBe(200);
    } finally {
      if (mode === "readonly") chmodSync(directory, 0o700);
    }
  },
);
it.each([false, true])(
  "reserves a destination before two redemptions overlap (configuration=%s)",
  async configuration => {
    const h = setup(),
      file = join(h.home, "configuration");
    const first = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
    const second = invitationCode(await h.act("invite", { door: "agente" }, "identities/beto"));
    let release = () => {};
    const barrier = new Promise<void>(resolve => {
      release = resolve;
    });
    let calls = 0;
    vi.stubGlobal("fetch", async (_url: unknown, options: RequestInit) => {
      calls++;
      await barrier;
      if (typeof options.body !== "string") throw new Error("Missing request body");
      const value: unknown = JSON.parse(options.body);
      if (!isRecord(value) || typeof value.code !== "string") throw new Error("Missing request code");
      return new Response(JSON.stringify(h.access().redeem(value.code)));
    });
    const pending = redeemToFile(address, first, { file, ...(configuration ? { name: "first" } : {}) });
    const conflict = redeemToFile(address, second, { file, ...(configuration ? { name: "second" } : {}) });
    const observed = conflict.then(
      () => "saved",
      () => "conflict",
    );
    release();
    await pending;
    expect(await observed).toBe("conflict");
    expect(calls).toBe(1);
    expect(existsSync(file)).toBe(true);
    expect(h.access().redeem(second).status).toBe(200);
  },
);
it("merges an editor's changes while the response is pending", async () => {
  const h = setup(),
    file = join(h.home, "configuration");
  writeFileSync(file, JSON.stringify({ theme: "old", mcpServers: { previous: { custom: true } } }));
  vi.stubGlobal("fetch", () => {
    writeFileSync(
      file,
      JSON.stringify({ theme: "new", extra: 7, mcpServers: { previous: { custom: false }, editor: {} } }),
    );
    return Promise.resolve(new Response(JSON.stringify({ key: "x".repeat(43) })));
  });
  await redeemToFile(address, "ABCD-2345", { file, name: "house" });
  expect(JSON.parse(readFileSync(file, "utf8"))).toMatchObject({
    theme: "new",
    extra: 7,
    mcpServers: { previous: { custom: false }, editor: {}, house: { type: "http" } },
  });
});
it("never replaces a file created while a redemption is pending", async () => {
  const h = setup(),
    file = join(h.home, "credential");
  vi.stubGlobal("fetch", () => {
    writeFileSync(file, "editor");
    return Promise.resolve(new Response(JSON.stringify({ key: "x".repeat(43) })));
  });
  await expect(redeemToFile(address, "ABCD-2345", { file })).rejects.toThrow();
  expect(readFileSync(file, "utf8")).toBe("editor");
});
it("recovers a key privately when permissions change during the exchange", async () => {
  const h = setup(),
    directory = join(h.home, "changed");
  mkdirSync(directory);
  const file = join(directory, "credential"),
    key = "x".repeat(43);
  vi.stubGlobal("fetch", () => {
    chmodSync(directory, 0o500);
    return Promise.resolve(new Response(JSON.stringify({ key })));
  });
  try {
    await expect(redeemToFile(address, "ABCD-2345", { file })).rejects.toThrow(/archivo privado/);
    const recovery = readdirSync(directory).find(name => name.startsWith(".desert-redemption-"));
    expect(recovery !== undefined).toBe(true);
    if (!recovery) throw new Error("Missing recovery file");
    expect(readFileSync(join(directory, recovery), "utf8").trim() === key).toBe(true);
    expect(statSync(join(directory, recovery)).mode & 0o777).toBe(0o600);
    expect(existsSync(file)).toBe(false);
  } finally {
    chmodSync(directory, 0o700);
  }
});
it("preserves an editor's same-name entry and offers private recovery", async () => {
  const h = setup(),
    file = join(h.home, "configuration");
  vi.stubGlobal("fetch", () => {
    writeFileSync(file, JSON.stringify({ mcpServers: { house: { editor: true } } }));
    return Promise.resolve(new Response(JSON.stringify({ key: "x".repeat(43) })));
  });
  await expect(redeemToFile(address, "ABCD-2345", { file, name: "house" })).rejects.toThrow(/archivo privado/);
  expect(JSON.parse(readFileSync(file, "utf8"))).toEqual({ mcpServers: { house: { editor: true } } });
});
it("rejects an existing MCP name before consuming the code", async () => {
  const h = setup(),
    file = join(h.home, "configuration");
  writeFileSync(file, JSON.stringify({ mcpServers: { house: {} } }));
  const send = vi.fn();
  vi.stubGlobal("fetch", send);
  await expect(redeemToFile(address, "ABCD-2345", { file, name: "house" })).rejects.toThrow();
  expect(send).not.toHaveBeenCalled();
});
