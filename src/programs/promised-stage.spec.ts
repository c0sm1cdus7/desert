// A failing check or a house that cannot open must not leave its temporary directory behind.
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { shopProgram } from "../../tests/support/shop.ts";
import { staged } from "./promised-stage.ts";

async function isolated(use: () => Promise<void>) {
  const directory = mkdtempSync(join(tmpdir(), "desert-stage-check-"));
  vi.stubEnv("TMPDIR", directory);
  try {
    await use();
    expect(readdirSync(directory)).toEqual([]);
  } finally {
    vi.unstubAllEnvs();
    rmSync(directory, { recursive: true, force: true });
  }
}
describe("the lifetime of a derived check's house", () => {
  it("removes its directory when opening the program throws", () =>
    isolated(async () => {
      const broken = {
        ...shopProgram,
        get slices(): typeof shopProgram.slices {
          throw new Error("broken program");
        },
      };
      await expect(staged(broken, () => Promise.resolve())).rejects.toThrow("broken program");
    }));
  it("removes its directory when a check throws", () =>
    isolated(async () => {
      await expect(staged(shopProgram, () => Promise.reject(new Error("broken check")))).rejects.toThrow(
        "broken check",
      );
    }));
});
