import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { afterEach, expect, it } from "vitest";
import { connectTerminal } from "./terminal-client.ts";
import { socketHouse } from "../../tests/support/socket-house.ts";
import type { Shop } from "../../tests/support/shop.ts";
const homes: string[] = [];
afterEach(async () => {
  for (const home of homes.splice(0)) {
    const pidPath = `${home}/casa.pid`;
    if (existsSync(pidPath)) {
      try {
        process.kill(Number(readFileSync(pidPath, "utf8")), "SIGTERM");
      } catch {}
    }
    await delay(60);
    rmSync(home, { recursive: true, force: true });
  }
});
const home = () => {
  const path = mkdtempSync("/tmp/casa-terminal-");
  homes.push(path);
  return path;
};
it("unix: opening without a server starts a detached program and closing the terminal leaves it alive", async () => {
  const path = home();
  const client = await connectTerminal<Shop>(process.cwd(), path, "ana-terminal");
  try {
    expect(client.status()).toBe("connected");
    expect(client.identity()).toBe("ana");
    const pid = Number(readFileSync(`${path}/casa.pid`, "utf8"));
    expect(pid).not.toBe(process.pid);
    client.close();
    const again = await connectTerminal<Shop>(process.cwd(), path, "beto-terminal");
    expect(again.identity()).toBe("beto");
    expect(Number(readFileSync(`${path}/casa.pid`, "utf8"))).toBe(pid);
    again.close();
  } finally {
    client.close();
  }
});
it("unix: a stale socket without a writer is replaced", async () => {
  const path = home();
  writeFileSync(`${path}/casa.sock`, "stale");
  const client = await connectTerminal(process.cwd(), path, "ana-terminal");
  expect(client.status()).toBe("connected");
  client.close();
});
it("a writer without a socket says the existing lock text and never opens another writer", async () => {
  const f = await socketHouse("stream");
  try {
    await expect(connectTerminal(process.cwd(), f.home, "ana-terminal")).rejects.toThrow(
      "This house is already open in a running process",
    );
    expect(existsSync(`${f.home}/casa.sock`)).toBe(false);
  } finally {
    await f.close();
  }
});
it("a long socket path fails with that path, before starting a house", async () => {
  const path = resolve(home(), "x".repeat(110));
  mkdirSync(path);
  await expect(connectTerminal(process.cwd(), path, "ana-terminal")).rejects.toThrow(`${path}/casa.sock`);
  expect(existsSync(`${path}/journal.sqlite`)).toBe(false);
});
