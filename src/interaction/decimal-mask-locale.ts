type DecimalLocale = Readonly<{
  decimal: string; group: string; minus: string; groupDigits: (digits: string) => string;
}>;
const locales = new Map<string, DecimalLocale>();
const unsupported = (): never => { throw new Error("UNSUPPORTED_INPUT_MASK_LOCALE"); };

/** Learn punctuation and grouping from Intl; amount digits never enter Number arithmetic. */
export function decimalMaskLocale(locale: string): DecimalLocale {
  const cached = locales.get(locale);
  if (cached) return cached;
  let formatter: Intl.NumberFormat;
  try {
    if (Intl.NumberFormat.supportedLocalesOf([locale], { localeMatcher: "lookup" }).length !== 1) unsupported();
    formatter = new Intl.NumberFormat(locale, { numberingSystem: "latn", useGrouping: "auto" });
  } catch { return unsupported(); }
  if (formatter.resolvedOptions().numberingSystem !== "latn") unsupported();
  const signed = formatter.formatToParts(-1.1);
  // Affixes/bidi literals require an explicit adapter; silently dropping them would guess.
  if (signed.some(part => !["minusSign", "integer", "decimal", "fraction"].includes(part.type))) unsupported();
  const decimal = signed.find(part => part.type === "decimal")?.value;
  const minus = signed.find(part => part.type === "minusSign")?.value;
  const probe = "123456789012345678901234";
  const parts = formatter.formatToParts(BigInt(probe));
  const groups = parts.filter(part => part.type === "group").map(part => part.value);
  const integers = parts.filter(part => part.type === "integer").map(part => part.value);
  const group = groups[0];
  if (!decimal || !minus || !group || decimal === group || group === minus || decimal === minus ||
    /[0-9]/.test(decimal + group + minus) || groups.some(value => value !== group) ||
    parts.some(part => part.type !== "integer" && part.type !== "group") || integers.join("") !== probe) return unsupported();
  const primary = integers.at(-1)!.length;
  const secondary = integers.at(-2)!.length;
  if (!primary || !secondary || integers.slice(1, -1).some(value => value.length !== secondary)) unsupported();
  let minimum = 1;
  while (minimum <= probe.length && !formatter.formatToParts(BigInt(`1${"0".repeat(minimum - 1)}`))
    .some(part => part.type === "group")) minimum += 1;
  if (minimum > probe.length) unsupported();
  function groupDigits(digits: string): string {
    if (digits.length < minimum) return digits;
    const chunks = [digits.slice(-primary)];
    let end = digits.length - primary;
    while (end > 0) { chunks.push(digits.slice(Math.max(0, end - secondary), end)); end -= secondary; }
    return chunks.reverse().join(group);
  }
  const result = Object.freeze({ decimal, group, minus, groupDigits });
  locales.set(locale, result);
  return result;
}
