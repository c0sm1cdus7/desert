// Runtime assembly and the derived gate must agree for programs with and without identities.
import { expect, it } from "vitest";
import { shopProgram, shopShown } from "../../tests/support/shop.ts";
import { programChecks } from "./program-checks.ts";
import { staged } from "./promises/promised-stage.ts";
it.each([false, true])("covers every runtime catalog action, identities=%s", async identities => {
  const program = { ...shopProgram, identities };
  const checks = programChecks(program, shopShown);
  await staged(program, ({ house }) => {
    const registry = house().registry;
    expect(registry.map(tool => tool.id)).toContain("rules");
    expect(registry.map(tool => tool.id)).toContain("personal");
    expect(registry.some(tool => tool.id === "identities")).toBe(identities);
    for (const tool of registry)
      for (const name of Object.keys(tool.acts)) {
        const prefix = `${tool.id} · ${name} ·`;
        expect(
          checks.some(check => check.name.startsWith(prefix) && check.name.endsWith(", by keys")),
          prefix,
        ).toBe(true);
      }
    return Promise.resolve();
  });
});

import { anyToolScreen } from "../surface/bridge/views/any-tool.ts";
import type { Shown } from "../surface/bridge/ports/house-ports.ts";
import type { Shop } from "../../tests/support/shop.ts";
it("turns red when a core action disappears from the actual Menu route", async () => {
  const hidden: Shown<Shop> = {
    ...shopShown,
    screens: {
      rules: (ports, tool, words, acts, start) => {
        const screen = anyToolScreen(ports, tool, words, acts, start);
        return {
          ...screen,
          acts: Object.fromEntries(Object.entries(screen.acts).filter(([name]) => name !== "consult")),
        };
      },
    },
  };
  const check = programChecks(shopProgram, hidden).find(
    check => check.name.startsWith("rules · consult ·") && check.name.endsWith(", by keys"),
  );
  expect(check).toBeDefined();
  await expect(check?.run()).rejects.toThrow();
});
