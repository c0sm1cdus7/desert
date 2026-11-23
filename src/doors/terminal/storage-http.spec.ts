import "../../../tests/support/upgrade-vault.ts";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { mcpDoor } from "../mcp/mcp-handler.ts";
import { home, seed, open, program } from "../../../tests/support/upgrade-support.ts";
it("keeps rebuild diagnostics in the HTTP house record without painting or emitting Node warnings", async () => {
  const path = home();
  await seed(path);
  const warning = vi.spyOn(process, "emitWarning");
  const stdout = vi.spyOn(process.stdout, "write");
  const stderr = vi.spyOn(process.stderr, "write");
  const house = open(path, program("shop/2"));
  const door = mcpDoor(house, new Map(), { name: "Prueba", version: "1", limits: { recentLines: 40 } });
  try {
    expect(await door.handle({ method: "GET", path: "/health", headers: {}, body: () => [] })).toMatchObject({
      status: 200,
      body: "ok",
    });
    expect(
      readFileSync(join(path, "storage-notices.jsonl"), "utf8")
        .trim()
        .split("\n")
        .map((line): unknown => JSON.parse(line)),
    ).toEqual(house.storageNotices().map(notice => ({ code: "SAVED_FOLD_REBUILT", ...notice })));
    expect(house.storageNotices()).toHaveLength(2);
    expect(warning).not.toHaveBeenCalled();
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  } finally {
    await door.close();
    house.close();
    warning.mockRestore();
    stdout.mockRestore();
    stderr.mockRestore();
  }
});
