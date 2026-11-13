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
  it("removes its directory after success and repeated reopening", () =>
    isolated(async () => {
      await staged(shopProgram, ({ reopen }) => {
        reopen();
        reopen();
        return Promise.resolve();
      });
    }));
  it("removes its directory when reopening throws after the old house was closed", () =>
    isolated(async () => {
      let openings = 0;
      const broken = {
        ...shopProgram,
        get slices(): typeof shopProgram.slices {
          if (openings++ > 0) throw new Error("broken reopening");
          return shopProgram.slices;
        },
      };
      await expect(
        staged(broken, ({ reopen }) => {
          reopen();
          return Promise.resolve();
        }),
      ).rejects.toThrow("broken reopening");
    }));
  it("removes its directory even when closing throws: the cleanup is outside the close", () =>
    isolated(async () => {
      await expect(
        staged(shopProgram, ({ house }) => {
          const close = house().close;
          vi.spyOn(house(), "close").mockImplementation(() => {
            close();
            throw new Error("broken close");
          });
          return Promise.resolve();
        }),
      ).rejects.toThrow("broken close");
    }));
});
