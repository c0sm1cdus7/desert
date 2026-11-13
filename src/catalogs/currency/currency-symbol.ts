// A currency symbol fits beside an amount: short, one line, no edge spaces or terminal controls.
export function currencySymbol(symbol: unknown): string {
  const shape = /^[^\p{Cc}\p{Cf}\p{Zl}\p{Zp}]{1,8}$/u;
  if (typeof symbol !== "string" || symbol.trim() !== symbol || !shape.test(symbol))
    throw new Error("A money field needs a currency symbol");
  return symbol;
}
