import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { money } from "./money-field.ts";
import { formats } from "../surface/formats/masks.ts";
it("derives the mask's limit and its message from the field maximum", () => {
  const maximum = String(money("").maximum);
  const mask = formats({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" }).money;
  expect(mask.put(maximum.slice(0, -1), maximum.at(-1) ?? "")).toBe(maximum);
  expect(mask.put(maximum, "1")).toBe(maximum);
  expect(mask.rejected?.(maximum, "1")).toContain(mask.shown(maximum));
  const source = readFileSync(new URL("../surface/formats/money-format.ts", import.meta.url), "utf8");
  expect(source).not.toMatch(/\b13\b|9999999999999/u);
  expect(source).toContain('moneyField("").maximum');
});
