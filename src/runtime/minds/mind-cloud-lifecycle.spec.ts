import "../../../tests/support/fixture-vault.ts";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it, vi } from "vitest";
import { shopProgram } from "../../../tests/support/shop.ts";
import { startCloudHouse } from "../cloud-house.ts";
it("an invalid mind start rejects the preparation and frees the cloud host", async () => {
  const home = mkdtempSync(join(tmpdir(), "mind-cloud-"));
  const listeners = process.listeners("SIGTERM");
  const transport = vi.fn<typeof fetch>(() => Promise.reject(new Error("No debe enviar")));
  try {
    const cloud = startCloudHouse(
      {
        ...shopProgram,
        by: "shop",
        identities: true,
        creation: { admin: "ana", assignments: [] },
        minds: { assistants: true, programs: [] },
        modelMinds: {
          language: "es",
          definitions: [],
          catalog: [],
          providers: [],
          fingerprint: () => ({ cases: "c", skill: "s", frameTexts: "f" }),
          key: () => Promise.resolve(undefined),
          transport,
          account: "test",
          capNanoUsd: -1,
          maxInputTokens: 10000,
          message: () => undefined,
          textRules: [],
          rulesVersion: () => "v1",
        },
      },
      home,
      { ROOT: Buffer.alloc(32, 71).toString("hex") },
      "ROOT",
    );
    await expect(cloud.minds).rejects.toThrow("capNanoUsd");
    expect(process.listeners("SIGTERM")).toEqual(listeners);
    expect(transport).not.toHaveBeenCalled();
  } finally {
    rmSync(home, { recursive: true, force: true });
  }
});
