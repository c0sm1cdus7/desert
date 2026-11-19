// Literal Ctrl-C and process signals interrupt the real CLI; a second CLI safely resumes its reserved candidate.
import { expect, it } from "vitest";
import { existsSync, mkdtempSync, readFileSync, rmSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { realTerminal } from "../checks/real-terminal.ts";
for (const mode of ["--file", "--claude"])
  it.each(["SIGINT", "SIGTERM", "SIGKILL"] as const)(
    `pty: resumes ${mode} after %s`,
    async signal => {
      const home = mkdtempSync("/tmp/desert-redemption-pty-"),
        file = join(home, "credential"),
        marker = join(home, "marker");
      const args = [
        "--import",
        resolve("tests/support/redemption-fetch.mjs"),
        resolve("src/runtime/redeem-door-cli.ts"),
        "http://localhost",
        mode,
        file,
        ...(mode === "--claude" ? ["--name", "test"] : []),
      ];
      const terminal = realTerminal(
        [process.execPath, ...args],
        { cols: 120, rows: 40 },
        { REDEMPTION_TEST_MARKER: marker },
      );
      try {
        terminal.press("ABCD-2345\r");
        await terminal.rest(100);
        terminal.press("\x04");
        for (let i = 0; i < 100 && !existsSync(marker); i++) await terminal.rest(50);
        expect(existsSync(marker)).toBe(true);
        const recovery = readdirSync(home).find(name => name.startsWith(".desert-redemption-"));
        if (!recovery) throw new Error("Missing recovery file");
        const candidate = readFileSync(join(home, recovery), "utf8").trim();
        if (signal === "SIGINT") terminal.press("\x03");
        else process.kill(Number(readFileSync(marker, "utf8")), signal);
        await terminal.close();
        const retry = spawnSync(process.execPath, args, {
          input: "ABCD-2345\n",
          encoding: "utf8",
          env: { ...process.env, REDEMPTION_TEST_RELEASE: "1" },
          timeout: 20000,
        });
        expect(retry.status).toBe(0);
        expect(readFileSync(file, "utf8").includes(candidate)).toBe(true);
        expect(`${terminal.written()}${retry.stdout}${retry.stderr}`).not.toContain(candidate);
      } finally {
        await terminal.close();
        rmSync(home, { recursive: true, force: true });
      }
    },
    30000,
  );
