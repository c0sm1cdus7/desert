import { expect, it } from "vitest";
import { has } from "../../../tests/support/secret-rig.ts";
for (const value of ["ASCII", "Ω", "ñ🔒", "uno\ndos", "\0‮"]) {
  it(`el buscador encuentra el texto original y sus colecciones: ${JSON.stringify(value)}`, () => {
    const cyclic: Record<string, unknown> = { [value]: new Map([[value, new Set([value])]]) };
    cyclic.self = cyclic;
    for (const data of [{ x: value }, new Error(value, { cause: { x: value } }), cyclic]) {
      expect(has(data, value)).toBe(true);
      expect(has(data, "ausente-inventado")).toBe(false);
    }
  });
}
