// Law 9e (slice 3) changed exactly one thing about every face, avatar and artwork placeholder: they share the theme's
// face primitive (tm-face), a card-white ground and a hairline drawn by the primitive's own ::after on a positioned face,
// instead of a tinted or muted ground. Pixel-parity tests against frozen bases set those two properties aside on the
// probes that measure a face (face-material.test.ts measures them against the law); every other pixel still compares.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type Measured = Readonly<{ style: Readonly<Record<string, string>> }>;

export const facePrimitiveProperties = ["background-color", "position"] as const;

/** The measurements of `value` with the face primitive's properties removed from the entries of each named probe. */
export function withoutFacePrimitive<Value>(value: Value, probes: readonly string[]): Value {
  if (typeof value !== "object" || value === null) return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.entries(record).map(([key, entries]) => [key, !probes.includes(key) || !Array.isArray(entries) ? entries
    : entries.map((entry: Measured) => ({ ...entry, style: Object.fromEntries(Object.entries(entry.style)
      .filter(([property]) => !(facePrimitiveProperties as readonly string[]).includes(property))) }))])) as Value;
}

/** The `@utility tm-face { … }` block of a theme stylesheet (asserted to be there once). */
function facePrimitiveBlock(theme: string): string {
  const start = theme.indexOf("@utility tm-face {");
  if (start < 0 || theme.indexOf("@utility tm-face {", start + 1) >= 0) throw new Error("FACE_PRIMITIVE: a theme holds tm-face once");
  let depth = 0;
  for (let index = theme.indexOf("{", start); index < theme.length; index++) {
    if (theme[index] === "{") depth++;
    else if (theme[index] === "}" && --depth === 0) return theme.slice(start, index + 1);
  }
  throw new Error("FACE_PRIMITIVE: the tm-face block is unbalanced");
}

/** For a pixel comparison against a frozen theme: the frozen theme with today's face primitive (src/svelte/theme.css) in
 * place of its own, so the comparison sees every pixel but a face's ground and hairline. */
export function withTodaysFacePrimitive(frozenTheme: string): string {
  const today = facePrimitiveBlock(readFileSync(resolve(import.meta.dirname, "../../src/svelte/theme.css"), "utf8"));
  return frozenTheme.replace(facePrimitiveBlock(frozenTheme), today);
}
