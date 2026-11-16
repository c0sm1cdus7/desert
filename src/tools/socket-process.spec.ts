import { expect, it } from "vitest";
import { spawn } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { once } from "node:events";
import { socketHouse } from "../../tests/support/socket-house.ts";
const runner = resolve("tests/support/socket-server-process.ts");
const peer = resolve("tests/support/socket-client-process.ts");
function child(file: string, args: string[], cwd: string) {
  const process = spawn(globalThis.process.execPath, [file, ...args], { cwd, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  let error = "";
  process.stdout.on("data", (data: Buffer) => {
    output += data.toString();
  });
  process.stderr.on("data", (data: Buffer) => {
    error += data.toString();
  });
  return {
    process,
    output: () => output,
    error: () => error,
    exit: once(process, "exit").then((values: unknown[]) => values[0]),
  };
}
it("unix: two independent client processes act without creating storage", async () => {
  const f = await socketHouse("unix");
  const work = mkdtempSync("/tmp/casa-client-");
  try {
    const files = readdirSync(f.home).sort();
    const a = child(peer, [f.server().path, "a"], work);
    const b = child(peer, [f.server().path, "b"], work);
    expect(await a.exit).toBe(0);
    expect(await b.exit).toBe(0);
    expect(a.output()).toContain('"accepted"');
    expect(b.output()).toContain('"accepted"');
    expect(readdirSync(work)).toEqual([]);
    expect(readdirSync(f.home).sort()).toEqual(files);
  } finally {
    await f.close();
    rmSync(work, { recursive: true, force: true });
  }
});
it.each(["SIGINT", "SIGTERM"] as const)("unix: %s closes the server and removes socket and pid", async signal => {
  const home = mkdtempSync("/tmp/casa-proc-");
  const server = child(runner, [home], home);
  try {
    await ready(server);
    expect(server.output()).toBe("ready\n");
    expect(statSync(`${home}/casa.sock`).mode & 0o777).toBe(0o600);
    expect(statSync(`${home}/casa.pid`).mode & 0o777).toBe(0o600);
    server.process.kill(signal);
    expect(await server.exit).toBe(0);
    expect(existsSync(`${home}/casa.sock`)).toBe(false);
    expect(existsSync(`${home}/casa.pid`)).toBe(false);
  } finally {
    server.process.kill("SIGKILL");
    await server.exit;
    rmSync(home, { recursive: true, force: true });
  }
});
it("a competing server exits once with WriterAlreadyOpen before touching the socket", async () => {
  const f = await socketHouse("stream");
  try {
    const server = child(runner, [f.home], f.home);
    expect(await server.exit).toBe(1);
    expect(server.error()).toContain("This house is already open in a running process");
    expect(server.output()).toBe("");
  } finally {
    await f.close();
  }
});

async function ready(server: ReturnType<typeof child>) {
  await Promise.race([
    once(server.process.stdout, "data"),
    server.exit.then(() => {
      throw new Error(
        server.error().includes("EPERM") ? "Unix listen blocked by sandbox (EPERM)" : "Server exited before ready",
      );
    }),
  ]);
}
it("unix: writer ownership permits replacing a socket left by a killed server", async () => {
  const home = mkdtempSync("/tmp/casa-stale-");
  const first = child(runner, [home], home);
  let second: ReturnType<typeof child> | undefined;
  try {
    await ready(first);
    first.process.kill("SIGKILL");
    await first.exit;
    expect(existsSync(`${home}/casa.sock`)).toBe(true);
    second = child(runner, [home], home);
    await ready(second);
    const client = child(peer, [`${home}/casa.sock`, "after-kill"], home);
    expect(await client.exit).toBe(0);
    second.process.kill("SIGTERM");
    expect(await second.exit).toBe(0);
    expect(existsSync(`${home}/casa.sock`)).toBe(false);
  } finally {
    first.process.kill("SIGKILL");
    await first.exit;
    if (second) {
      second.process.kill("SIGKILL");
      await second.exit;
    }
    rmSync(home, { recursive: true, force: true });
  }
});
