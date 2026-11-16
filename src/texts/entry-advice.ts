export const entryAdvice = {
  invalidCurrency: (question: string, symbol: string) => `${question} · símbolo de moneda inválido: ${symbol}`,
  redundantZero: "cero inicial descartado",
  currencyChanged: "cambió la moneda",
  redundantSpace: "sin espacios al principio ni dobles",
} as const;
