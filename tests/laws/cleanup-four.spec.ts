import { Value } from "@sinclair/typebox/value";
import { expect, it } from "vitest";
import { handle, text } from "../../src/catalogs/fields.ts";
import { rules } from "./rules.ts";

it("states law 126 for free text and for short identifiers separately", () => {
  expect(Value.Check(text("Nombre", "Nombre visible"), "   ")).toBe(false);
  expect(Value.Check(handle("Teléfono", "Teléfono", "0-9 +()-", 20), "   ")).toBe(true);
  const law = rules.find(rule => rule.id === 126)?.rule;
  expect(law).toContain("un texto libre");
  expect(law).toContain(
    "un identificador corto admite los caracteres que declara, incluso espacios si están permitidos",
  );
});
