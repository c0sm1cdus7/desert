// Reference spelling and nested secret declarations are shared with storage protection.
import { hasSecretInput, referencePattern } from "./secret-input.ts";
import { expect, it } from "vitest";

it("referencePattern matches only a complete lowercase hexadecimal secret reference", () => {
  const valid = "secret:01234567-89ab-cdef-0123-456789abcdef";
  const pattern = new RegExp(referencePattern, "u");
  expect(pattern.test(valid)).toBe(true);
  for (const value of [
    "",
    valid.slice(1),
    `x${valid}`,
    `${valid}x`,
    `${valid}\n`,
    valid.toUpperCase(),
    valid.replace("89ab", "89ag"),
    valid.replace("89ab", "89a"),
    valid.replace("89ab", "89abc"),
    valid.replace("secret:", "other:"),
    valid.replace("-", ""),
  ])
    expect(pattern.test(value)).toBe(false);
});

it("hasSecretInput finds exact true marks through objects and array children, but not bare arrays", () => {
  for (const schema of [
    { secret: true },
    { properties: { nested: { items: { secret: true } } } },
    { anyOf: [{ type: "string" }, { properties: { value: { secret: true } } }] },
  ])
    expect(hasSecretInput(schema)).toBe(true);
  for (const schema of [
    null,
    undefined,
    "secret",
    false,
    {},
    { secret: false },
    { secret: "true" },
    { properties: { value: { type: "string" } } },
    { anyOf: [null, {}, false] },
    [{ secret: true }],
  ])
    expect(hasSecretInput(schema)).toBe(false);
});
