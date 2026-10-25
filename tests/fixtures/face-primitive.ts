// Law 9e (slice 3) changed exactly one thing about every face, avatar and artwork placeholder: they share the theme's
// face primitive (tm-face), a card-white ground and a hairline drawn by the primitive's own ::after on a positioned face,
// instead of a tinted or muted ground. Pixel-parity tests against frozen bases set those two properties aside on the
// probes that measure a face (face-material.test.ts measures them against the law); every other pixel still compares.
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
