// A capital changes only the first character of a name.
import { expect, it } from "vitest";
import { capital } from "./capital.ts";

it("capital uppercases the initial while preserving the rest and empty names", () => {
  expect(capital("venta Mixta")).toBe("Venta Mixta");
  expect(capital("árbol")).toBe("Árbol");
  expect(capital("YA escrito")).toBe("YA escrito");
  expect(capital(" venta")).toBe(" venta");
  expect(capital("")).toBe("");
});
