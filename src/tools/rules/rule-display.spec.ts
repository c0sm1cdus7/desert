// Human labels remain Spanish while rule effects and simulation values stay machine-readable in English.
import { expect, it } from "vitest";
import { ruleDisplay } from "./rule-display.ts";
it("labels effects without rewriting free text, inputs or their stored objects", () => {
  const value = [{ definition: { effect: "block", text: "block" } }, { outcome: "require-supervisor" }];
  expect(JSON.parse(ruleDisplay(value))).toEqual([
    { definition: { effect: "Frena", text: "block" } },
    { outcome: "Requiere supervisor" },
  ]);
  expect(value[0]?.definition?.effect).toBe("block");
  expect(value[1]?.outcome).toBe("require-supervisor");
});
