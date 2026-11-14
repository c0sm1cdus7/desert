// Real terminal, real Unix server, two external identities: no renderer or keyboard substitute.
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { once } from "node:events";
import { expect, it } from "vitest";
import { realTerminal } from "./real-terminal.ts";
function server(home: string) {
  const child = spawn(process.execPath, ["tests/support/shop-serve.ts", home], { stdio: ["ignore", "pipe", "pipe"] });
  let failure = "";
  child.stderr.on("data", (bytes: Buffer) => {
    failure += bytes.toString();
  });
  const exited = once(child, "exit");
  return {
    child,
    exited,
    ready: Promise.race([
      once(child.stdout, "data"),
      exited.then(() => {
        throw new Error(failure.includes("EPERM") ? "Unix listen blocked by sandbox (EPERM)" : "Shop server failed");
      }),
    ]),
  };
}
it("unix: two real terminals keep their screens through server death, reconnect and terminal exit", async () => {
  const home = mkdtempSync("/tmp/casa-pty-");
  const first = server(home);
  let second: ReturnType<typeof server> | undefined;
  const terminals: ReturnType<typeof realTerminal>[] = [];
  try {
    await first.ready;
    const a = realTerminal([process.execPath, "tests/support/shop-terminal.ts", home, "ana"]);
    const b = realTerminal([process.execPath, "tests/support/shop-terminal.ts", home, "beto"]);
    terminals.push(a, b);
    await a.until("Menú");
    await b.until("Menú");
    a.press("v");
    b.press("p");
    await a.until("Registradas");
    await b.until("Pagos");
    const before = a.screen().slice(1);
    const offset = a.written().length;
    first.child.kill("SIGKILL");
    await first.exited;
    await a.until("×");
    await a.rest(650);
    const cut = a.written().slice(offset);
    expect(cut).toContain("38;5;203");
    expect(cut).toContain("38;5;214");
    second = server(home);
    await second.ready;
    await a.until("●");
    await b.until("●");
    expect(a.screen().slice(1)).toEqual(before);
    expect(b.screen()[0]).toContain("Pagos");
    await a.close();
    b.press("\x0f");
    await b.until("Menú");
    expect(second.child.exitCode).toBeNull();
  } finally {
    for (const terminal of terminals) await terminal.close();
    first.child.kill("SIGKILL");
    await first.exited;
    if (second) {
      second.child.kill("SIGTERM");
      await second.exited;
    }
    rmSync(home, { recursive: true, force: true });
  }
}, 15000);
