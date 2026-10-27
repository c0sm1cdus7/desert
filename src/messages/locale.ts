// One bundle per build (plan §14): the locale of a product's human exposures selects the bundle that resolves its messages.
// Raises MISSING_COMPOSITION_HUMAN_SURFACE (no human exposure) and MESSAGE_LOCALE_CONFLICT (two locales in one build).

/** The one locale the human exposures share. */
export function buildLocale(locales: readonly string[]): string {
  const distinct = [...new Set(locales)].sort();
  if (distinct.length === 0) throw new Error("MISSING_COMPOSITION_HUMAN_SURFACE");
  if (distinct.length > 1) throw new Error(`MESSAGE_LOCALE_CONFLICT: human exposures declare ${distinct.join(", ")}; one build resolves one bundle`);
  return distinct[0] ?? "";
}
