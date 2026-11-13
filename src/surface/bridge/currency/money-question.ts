// Resolve one question's symbol without changing the country's formats or any other question.
import { currencyIn } from "../../../catalogs/fields/money-currency.ts";
import type { Format, FormatName } from "../../masks.ts";
export type MoneyContext = Readonly<{
  resolvingCurrency?: true;
  answered?: Readonly<Record<string, unknown>>;
  state?: () => unknown;
  target?: string;
  now: () => number;
  formats: Readonly<Record<FormatName, Format>>;
}>;
export function moneyQuestion<T extends MoneyContext>(schema: Readonly<Record<string, unknown>>, ctx: T): T {
  if (schema.mask !== "money" || (typeof schema.currency === "function" && !ctx.resolvingCurrency)) return ctx;
  const currency = currencyIn(schema.currency, ctx.answered ?? {}, ctx.state?.(), ctx.target ?? "", ctx.now());
  const format = currency === undefined ? undefined : ctx.formats.money.inCurrency?.(currency);
  return format ? { ...ctx, formats: { ...ctx.formats, money: format } } : ctx;
}
