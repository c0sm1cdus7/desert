// House names retain their nonempty-string schema without imposing new spelling rules.
import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { name } from "./own-acts.ts";

it("name accepts nonempty strings without a maximum and rejects empty or nonstring names", () => {
  for (const value of ["a", " ", "árbol", "a".repeat(10000)]) expect(Value.Check(name, value)).toBe(true);
  for (const value of ["", 1, null, undefined, {}, []]) expect(Value.Check(name, value)).toBe(false);
});
