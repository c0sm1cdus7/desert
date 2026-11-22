import { mkdtempSync, readFileSync, writeFileSync, rmSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { expect, it } from "vitest";
import { launchHouse } from "./launch-house.ts";
import { socketTexts } from "../../texts/socket.texts.ts";
it("g05 d2: the launched house leaves shutdown and unfinished acts in owner-only output", async () => {
  const root = mkdtempSync("/tmp/house-output-");
  const entry = join(import.meta.dirname, "../../../tests/support/logged-house.ts");
  writeFileSync(join(root, "package.json"), JSON.stringify({ desert: { program: entry } }));
  let pid = 0;
  try {
    await launchHouse(root, root);
    pid = Number(readFileSync(join(root, "fixture.pid"), "utf8"));
    process.kill(pid, "SIGTERM");
    const path = join(root, "house.log");
    const until = Date.now() + 12000;
    while ((!existsSync(path) || !readFileSync(path, "utf8").includes(socketTexts.pending(1))) && Date.now() < until)
      await delay(20);
    expect(readFileSync(path, "utf8")).toContain(socketTexts.pending(1));
    expect(readFileSync(join(root, "storage-notices.jsonl"), "utf8")).toContain("fixture rebuild notice");
    expect(statSync(join(root, "storage-notices.jsonl")).mode & 0o777).toBe(0o600);
    expect(readFileSync(path, "utf8")).toContain("fixture scrubbed diagnostic");
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(statSync(root).mode & 0o777).toBe(0o700);
  } finally {
    if (pid) {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
    rmSync(root, { recursive: true, force: true });
  }
}, 15000);
