import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  linkSync,
  symlinkSync,
  closeSync,
  mkdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { houseOutput } from "./house-output.ts";
import { launchHouse } from "./launch-house.ts";
import { socketTexts } from "../texts/socket.texts.ts";
it.each(["hard", "symbolic"])("N13: output refuses a %s link without changing its target", kind => {
  const home = mkdtempSync("/tmp/casa-link-");
  try {
    const target = join(home, "other");
    writeFileSync(target, "untouched", { mode: 0o640 });
    (kind === "hard" ? linkSync : symlinkSync)(target, join(home, "casa.log"));
    expect(() => closeSync(houseOutput(home))).toThrow();
    expect(readFileSync(target, "utf8")).toBe("untouched");
    expect(statSync(target).mode & 0o777).toBe(0o640);
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
it("N9: the failed detached startup records its safe cause before replying", async () => {
  const home = mkdtempSync("/tmp/casa-cause-");
  try {
    const program = join(import.meta.dirname, "../../tests/support/shop-program.ts");
    writeFileSync(join(home, "package.json"), JSON.stringify({ desert: { program } }));
    mkdirSync(join(home, "casa.sock"));
    await expect(launchHouse(home, home)).rejects.toThrow(socketTexts.startFailed);
    const text = readFileSync(join(home, "casa.log"), "utf8");
    expect(text).toContain("EISDIR");
    expect(text).not.toContain(" at ");
    expect(text).not.toContain(home);
    expect(text).not.toContain("Casa cerrada");
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
it("N10: detached stdout and stderr stay bounded after launch and retain recent output", async () => {
  const home = mkdtempSync("/tmp/casa-cap-");
  let pid = 0;
  try {
    writeFileSync(join(home, "package.json"), JSON.stringify({ desert: { program: "entry.mjs" } }));
    writeFileSync(
      join(home, "entry.mjs"),
      `
      import { writeFileSync, writeSync, existsSync } from "node:fs";
      import { setTimeout as delay } from "node:timers/promises";
      writeFileSync("pid", String(process.pid));
      process.send({ ready: true }); process.disconnect();
      for (const fd of [1, 2]) {
        while (!existsSync("go" + fd)) await delay(5);
        writeSync(fd, "x".repeat(2 * 1024 * 1024) + "fin-" + fd);
      }
    `,
    );
    await launchHouse(home, home);
    pid = Number(readFileSync(join(home, "pid"), "utf8"));
    const path = join(home, "casa.log");
    for (const fd of [1, 2]) {
      writeFileSync(join(home, `go${fd}`), "go");
      await vi.waitFor(() => expect(readFileSync(path, "utf8")).toContain(`fin-${fd}`));
      expect(statSync(path).size).toBeLessThanOrEqual(1024 * 1024);
      expect(readFileSync(path, "utf8")).toContain("Se alcanzó el tope");
    }
  } finally {
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        /* It may already have exited. */
      }
    }
    rmSync(home, { recursive: true, force: true });
  }
});
