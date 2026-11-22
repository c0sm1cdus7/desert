import { afterEach, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { startupMind } from "../tools/boundaries/startup-mind.ts";
import { toolTexts } from "./tools.texts.ts";
import { shopRig } from "../../tests/support/shop-rig.ts";
import { shopRegistry } from "../../tests/support/shop.ts";
afterEach(() => vi.restoreAllMocks());
it("rev-crash: ignored promises leave the actual Node process alive", () => {
  const result = spawnSync(process.execPath, ["--unhandled-rejections=strict", "tests/support/mind-alive.ts"], {
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain("SIGUE VIVA");
});
it("an internal failure resolves with the base text and leaves its diagnostic", async () => {
  const rig = shopRig();
  try {
    const ports = {
      bus: rig.bus,
      registry: shopRegistry,
      state: () => {
        throw new Error("broken-state");
      },
      now: Date.now,
      live: () => true,
      process: () => false,
      own: () => [],
      secrets: { capture: () => {}, scrub: <T>(value: T) => value },
    };
    const mind = startupMind("sales", ports);
    await expect(mind.act({ act: "register", input: {} })).resolves.toStrictEqual({
      status: "rejected",
      reason: toolTexts.baseFailure,
    });
    expect(rig.facts().filter(e => e.kind === "tool-entry")).toHaveLength(1);
    expect(JSON.stringify(rig.facts())).toContain("broken-state");
    mind.close();
  } finally {
    rig.close();
  }
});
