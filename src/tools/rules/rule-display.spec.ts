// Human labels remain Spanish while rule effects and simulation values stay machine-readable in English.
import { expect, it } from "vitest";
import { ruleDisplay } from "./rule-display.ts";
it("labels effects and the always condition without rewriting free text, inputs or their stored objects", () => {
  const value = [
    { definition: { effect: "block", text: "block" } },
    { outcome: "require-supervisor" },
    { condition: { operator: "always" }, text: "always" },
  ];
  expect(JSON.parse(ruleDisplay(value))).toEqual([
    { definition: { effect: { en: "Stops", es: "Frena" }, text: "block" } },
    { outcome: { en: "Requires supervision", es: "Requiere supervisión" } },
    { condition: { operator: { en: "At all times", es: "Siempre" } }, text: "always" },
  ]);
  expect(value[0]?.definition?.effect).toBe("block");
  expect(value[1]?.outcome).toBe("require-supervisor");
  expect(value[2]?.condition?.operator).toBe("always");
});
