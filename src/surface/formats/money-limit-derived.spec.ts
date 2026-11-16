import { expect, it, vi } from "vitest";
vi.mock("../../fields/money-field.ts", async importOriginal => {
  const original = await importOriginal<typeof import("../../fields/money-field.ts")>();
  return { ...original, money: () => ({ maximum: 999 }) };
});
it("follows a changed field maximum for both input and message", async () => {
  const { money } = await import("./money-format.ts");
  const mask = money({ currency: "$", thousands: ".", decimal: ",", day: "dd/mm/aaaa" });
  expect(mask.put("99", "9")).toBe("999");
  expect(mask.put("999", "1")).toBe("999");
  expect(mask.rejected?.("999", "1")).toContain(mask.shown("999"));
});
