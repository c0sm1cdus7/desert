// Advice that keeps a change of currency or a discarded space visible.
export const entryAdvice = {
  invalidCurrency: (question: string, symbol: string) => ({
    en: `${question} · invalid currency symbol: ${symbol}`,
    es: `${question} · símbolo de moneda inválido: ${symbol}`,
  }),
  redundantZero: { en: "leading zero discarded", es: "cero inicial descartado" },
  currencyChanged: { en: "the currency changed", es: "cambió la moneda" },
  redundantSpace: { en: "no leading or double spaces", es: "sin espacios al principio ni dobles" },
} as const;
