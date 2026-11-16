// A currency symbol fits in eight painted columns without combining marks or invisible characters.
import { fieldTexts } from "../texts/field-texts.ts";
import { width } from "./column-width.ts";
export class InvalidCurrency extends Error {
  readonly source: string;
  readonly symbol: unknown;
  constructor(source: string, symbol: unknown) {
    super(fieldTexts.invalidCurrency(source, JSON.stringify(symbol)));
    this.source = source;
    this.symbol = symbol;
  }
}
export function currencySymbol(symbol: unknown, source: string): string {
  const shape = /^[^\p{Cc}\p{Cf}\p{M}\p{Zl}\p{Zp}]+$/u;
  if (typeof symbol !== "string" || symbol.trim() !== symbol || !shape.test(symbol) || width(symbol) > 8)
    throw new InvalidCurrency(source, symbol);
  return symbol;
}
