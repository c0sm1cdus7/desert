// Two independent CLI processes must not overwrite each other's successful redemption.
import { spawn } from "node:child_process";
import { once } from "node:events";
import { join } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { doorHouse, invitationCode } from "../../tests/support/redemption-home.ts";
import { isRecord } from "../fields/json-values.ts";
it.each(["different", "same", "file"])(
  "rejects a recoverable reservation conflict across processes (%s)",
  async mode => {
    const h = doorHouse(),
      file = join(h.home, "configuration");
    const first = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    const second = invitationCode(await h.act("invite", { door: "agent" }, "identities/beto"));
    if (mode !== "file")
      writeFileSync(file, JSON.stringify({ theme: "dark", mcpServers: { previous: { preserved: true } } }), {
        mode: 0o600,
      });
    const start = (code: string, name: string) => {
      const child = spawn(
        process.execPath,
        [
          "--import",
          "./tests/support/redemption-process.ts",
          "src/runtime/redeem-door-cli.ts",
          "http://127.0.0.1",
          ...(mode === "file" ? ["--file", file] : ["--claude", file, "--name", name]),
        ],
        { env: { HOME: h.home }, stdio: ["pipe", "pipe", "pipe", "ipc"] },
      );
      let output = "";
      child.stdout?.on("data", chunk => {
        output += String(chunk);
      });
      child.stderr?.on("data", chunk => {
        output += String(chunk);
      });
      child.stdin?.end(code);
      return { child, output: () => output, done: new Promise<number | null>(resolve => child.once("exit", resolve)) };
    };
    const a = start(first, "first");
    let b: ReturnType<typeof start> | undefined;
    try {
      await once(a.child, "message");
      b = start(second, mode === "same" ? "first" : "second");
      b.child.on("message", value => {
        if (isRecord(value) && "body" in value) b?.child.send(h.access().redeem(second));
      });
      const secondStatus = await b.done;
      const issued = h.access().redeem(first);
      a.child.send(issued);
      const firstStatus = await a.done;
      expect(firstStatus).toBe(0);
      expect(secondStatus).toBe(1);
      expect(h.access().redeem(second).status).toBe(200);
      const saved = readFileSync(file, "utf8");
      expect(issued.key !== undefined && saved.includes(issued.key)).toBe(true);
      expect(
        [first, second, issued.key ?? "missing"].some(value => (a.output() + (b?.output() ?? "")).includes(value)),
      ).toBe(false);
      if (mode !== "file")
        expect(JSON.parse(saved)).toMatchObject({
          theme: "dark",
          mcpServers: { previous: { preserved: true }, first: { type: "http" } },
        });
    } finally {
      a.child.kill();
      b?.child.kill();
      h.close();
    }
  },
  15_000,
);
